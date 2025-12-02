import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Project from "@/models/Project";
import { getPlatformSettings } from "@/models/PlatformSettings";
import { SYSTEM_PROMPT, buildContextPrompt } from "@/lib/ai/prompts";
import { parseGeneratedFiles, extractDependencies } from "@/lib/ai/files";
import { type FileChange } from "@/lib/ai/tools";
import { checkCredits, consumeCredit } from "@/lib/subscription";
import { 
    aiChatRatelimit, 
    aiChatDailyRatelimit, 
    checkRateLimit, 
    getRateLimitIdentifier 
} from "@/lib/ratelimit";
import { 
    buildMemoryContext, 
    shouldSummarize, 
    generateSummary,
    executeSearchFiles,
    executeReadFile,
    executeListDirectory,
    executeFindRelated,
    executeGetProviderDocs,
} from "@/lib/ai/memory";
import {
    getProviderOverview,
    getAuthDocs,
    getStorageDocs,
    getDatabaseDocs,
    detectNeededProviders,
    type ProjectConfig,
} from "@/lib/ai/provider-docs";

export const maxDuration = 60;

interface AttachmentData {
    type: "image" | "pdf";
    name: string;
    mimeType: string;
    data: string; // base64
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Rate limiting - check per-minute limit
    const rateLimitId = getRateLimitIdentifier(userId, request);
    const minuteRateLimited = await checkRateLimit(aiChatRatelimit, rateLimitId);
    if (minuteRateLimited) return minuteRateLimited;

    // Rate limiting - check daily limit
    const dailyRateLimited = await checkRateLimit(aiChatDailyRatelimit, rateLimitId);
    if (dailyRateLimited) return dailyRateLimited;

    if (!orgId) {
        return new Response(JSON.stringify({ 
            error: "Organization required",
            message: "Please select an organization to use AI features."
        }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Check credits before processing
    const creditCheck = await checkCredits(orgId);
    
    if (!creditCheck.allowed) {
        return new Response(JSON.stringify({
            error: "Credit limit reached",
            message: creditCheck.reason,
            subscription: creditCheck.subscription,
            remainingCredits: creditCheck.remainingCredits,
            hourlyRemaining: creditCheck.hourlyRemaining,
        }), {
            status: 429, // Too Many Requests
            headers: { "Content-Type": "application/json" }
        });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const { id: projectId } = await params;

    // Support both { message: string } and { messages: array } formats
    let userContent: string;
    
    if (body.message && typeof body.message === "string") {
        // Simple format: { message: "..." }
        userContent = body.message;
    } else if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
        // Array format: { messages: [...] }
        const lastMessage = body.messages[body.messages.length - 1];
        userContent = String(lastMessage?.content || "");
    } else {
        return new Response("No message provided", { status: 400 });
    }

    // Get existing files from frontend (current editor state)
    const frontendFiles: Array<{ path: string; content: string }> = body.files || [];
    
    // Get attachments (images, PDFs)
    const attachments: AttachmentData[] = body.attachments || [];

    if (!userContent.trim() && attachments.length === 0) {
        return new Response("Empty message", { status: 400 });
    }

    // Get chat history from DB
    await connectToDatabase();
    const chatHistory = await ChatMessage.find({ projectId }).sort({ createdAt: 1 }).lean();
    
    // Get project data for provider configuration
    const project = await Project.findById(projectId).lean();
    if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
    }

    // Get existing files - prefer frontend files (current state), fallback to chat history
    let existingFiles: Array<{ path: string; content: string }> = [];
    
    if (frontendFiles.length > 0) {
        // Use files from frontend - this is the current editor state
        existingFiles = frontendFiles;
    } else {
        // Fallback: reconstruct from chat history
        const assistantsWithFiles = chatHistory.filter(
            (msg: any) => msg.role === "assistant" && msg.files && Object.keys(msg.files).length > 0
        );
        const lastAssistantWithFiles = assistantsWithFiles[assistantsWithFiles.length - 1];
        
        if (lastAssistantWithFiles?.files) {
            Object.entries(lastAssistantWithFiles.files).forEach(([path, content]) => {
                existingFiles.push({ path, content: content as string });
            });
        }
    }

    // Build context with file structure
    const contextPrompt = buildContextPrompt(existingFiles);

    // Build memory context (summary of past conversations)
    const memoryContext = await buildMemoryContext(projectId);

    // Build provider configuration for this project
    const projectConfig: ProjectConfig = {
        projectId,
        apiKey: (project as any).apiKey || '',
        providers: {
            auth: { enabled: !!(project as any).providers?.auth?.enabled },
            storage: { 
                enabled: !!(project as any).providers?.storage?.enabled,
                quota: (project as any).providers?.storage?.quota,
            },
            database: {
                enabled: !!(project as any).providers?.database?.enabled,
                dbName: (project as any).providers?.database?.dbName,
            },
        },
    };

    // Get provider overview (lightweight, always included)
    const providerOverview = getProviderOverview(projectConfig);

    // Detect if user message likely needs provider docs (auto-inject)
    const neededProviders = detectNeededProviders(userContent);
    let autoInjectedDocs = '';
    
    if (neededProviders.length > 0) {
        const docParts: string[] = [];
        for (const provider of neededProviders) {
            if (provider === 'auth' && projectConfig.providers.auth.enabled) {
                docParts.push(getAuthDocs(projectConfig));
            } else if (provider === 'storage' && projectConfig.providers.storage.enabled) {
                docParts.push(getStorageDocs(projectConfig));
            } else if (provider === 'database' && projectConfig.providers.database.enabled) {
                docParts.push(getDatabaseDocs(projectConfig));
            }
        }
        if (docParts.length > 0) {
            autoInjectedDocs = `\n\n---\n## Provider Implementation Docs (Auto-detected)\n${docParts.join('\n\n---\n\n')}`;
        }
    }

    // Build conversation history from DB (limit to recent messages to save context)
    const recentHistory = chatHistory.slice(-20); // Last 20 messages
    const historyMessages: CoreMessage[] = recentHistory.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: String(msg.content || ""),
    }));

    // Combine system prompt with context and memory
    const fullSystemPrompt = `${SYSTEM_PROMPT}

${memoryContext ? `\n${memoryContext}\n` : ''}

${providerOverview}

${contextPrompt}
${autoInjectedDocs}`;

    // Build user message content - can be multimodal with images
    type MessageContent = string | Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType?: string }>;
    
    let userMessageContent: MessageContent;
    
    if (attachments.length > 0) {
        // Multimodal message with images/files
        const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType?: string }> = [];
        
        // Add images first
        for (const attachment of attachments) {
            if (attachment.type === "image") {
                contentParts.push({
                    type: "image",
                    image: attachment.data, // base64 data
                    mimeType: attachment.mimeType,
                });
            }
            // For PDFs, we could add text extraction here in the future
        }
        
        // Add text content
        if (userContent.trim()) {
            contentParts.push({
                type: "text",
                text: userContent,
            });
        } else {
            // If no text but has images, add a default prompt
            contentParts.push({
                type: "text",
                text: "Please analyze this image and help me recreate or work with what you see.",
            });
        }
        
        userMessageContent = contentParts;
    } else {
        userMessageContent = userContent;
    }

    // Build the full message array with proper types
    const allMessages: CoreMessage[] = [
        { role: "system", content: fullSystemPrompt },
        ...historyMessages,
        { role: "user", content: userMessageContent },
    ];

    // Track file changes
    const fileChanges: FileChange[] = [];

    // Get configured AI model
    const platformSettings = await getPlatformSettings();
    const modelId = platformSettings.aiModel || "gemini-2.5-flash";

    // Stream response from Gemini
    const result = streamText({
        model: google(modelId),
        messages: allMessages,
        temperature: 0.7,
        async onFinish({ text }) {
            // Save messages to DB
            try {
                await connectToDatabase();

                // Save user message (store text content only for history)
                await ChatMessage.create({
                    projectId,
                    role: "user",
                    content: userContent || "[Image attached]",
                    metadata: attachments.length > 0 ? { 
                        hasAttachments: true, 
                        attachmentCount: attachments.length,
                        attachmentTypes: attachments.map(a => a.type),
                    } : undefined,
                });

                // Parse generated files from response
                const parsedFiles = parseGeneratedFiles(text);
                const generatedFiles: Record<string, string> = {};
                
                // Build existing files map for diff application
                const existingFilesMap: Record<string, string> = {};
                for (const f of existingFiles) {
                    existingFilesMap[f.path] = f.content;
                }
                
                for (const file of parsedFiles) {
                    let finalContent = file.content;
                    
                    // If this is a diff/edit, apply it to the existing file
                    if (file.isEdit && file.diffBlocks && file.diffBlocks.length > 0) {
                        const existingContent = existingFilesMap[file.path] || '';
                        const { applyDiffBlocks } = await import("@/lib/ai/diff");
                        const diffResult = applyDiffBlocks(existingContent, file.diffBlocks);
                        
                        if (diffResult.success || diffResult.appliedBlocks > 0) {
                            finalContent = diffResult.content;
                            console.log(`Applied ${diffResult.appliedBlocks} diff blocks to ${file.path}`);
                        } else {
                            // Diff failed - use the REPLACE content as the new file
                            console.warn(`Diff failed for ${file.path}, using REPLACE content as full file`);
                            finalContent = file.diffBlocks[file.diffBlocks.length - 1].replace;
                        }
                    }
                    
                    generatedFiles[file.path] = finalContent;
                    fileChanges.push({
                        path: file.path,
                        content: finalContent,
                        changeType: existingFiles.some(f => f.path === file.path) ? "modified" : "created",
                        description: `Generated ${file.path}`,
                    });
                }

                // Save files to Project model for persistence
                if (Object.keys(generatedFiles).length > 0) {
                    try {
                        const project = await Project.findById(projectId);
                        if (project) {
                            // Merge with existing files
                            const fileMap = new Map<string, { path: string; content: string; updatedAt: Date }>();
                            for (const file of project.files || []) {
                                fileMap.set(file.path, file);
                            }
                            const now = new Date();
                            for (const [path, content] of Object.entries(generatedFiles)) {
                                fileMap.set(path, { path, content, updatedAt: now });
                            }
                            
                            // Extract dependencies from the FINAL file contents (not raw parsed files)
                            // This ensures we get imports from both new files and applied diffs
                            const newDeps = extractDependencies(generatedFiles);
                            const existingDeps: string[] = (project as any).dependencies || [];
                            const allDeps = [...new Set([...existingDeps, ...newDeps])];
                            
                            if (newDeps.length > 0) {
                                console.log(`Adding dependencies to project ${projectId}: ${newDeps.join(', ')}`);
                            }
                            
                            // Use updateOne with $set for both files and dependencies
                            const result = await Project.updateOne(
                                { _id: projectId },
                                { 
                                    $set: { 
                                        files: Array.from(fileMap.values()),
                                        dependencies: allDeps
                                    } 
                                }
                            );
                            
                            console.log(`Saved ${Object.keys(generatedFiles).length} files to project ${projectId}. Modified: ${result.modifiedCount}`);
                            
                            // Verify the save
                            if (newDeps.length > 0) {
                                const updatedProject = await Project.findById(projectId).select('dependencies').lean();
                                console.log(`Project dependencies after save: [${(updatedProject as any)?.dependencies?.join(', ') || 'empty'}]`);
                            }
                        }
                    } catch (error) {
                        console.error("Failed to save files to project:", error);
                    }
                }

                // Save assistant message with files
                await ChatMessage.create({
                    projectId,
                    role: "assistant",
                    content: text,
                    files: generatedFiles,
                    metadata: { fileChanges },
                });

                // Consume credit after successful response
                await consumeCredit(
                    orgId,
                    userId,
                    projectId,
                    "chat",
                    1,
                    {
                        messageLength: userContent.length,
                        hasAttachments: attachments.length > 0,
                        model: modelId,
                    }
                );

                // Check if we should generate a new summary (async, don't block)
                shouldSummarize(projectId).then(async (needsSummary) => {
                    if (needsSummary) {
                        console.log(`Generating summary for project ${projectId}`);
                        await generateSummary(projectId, orgId);
                    }
                }).catch(console.error);
            } catch (error) {
                console.error("Error in onFinish:", error);
            }
        },
    });

    return result.toTextStreamResponse();
}

// GET chat history
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();
    const messages = await ChatMessage.find({ projectId: id }).sort({
        createdAt: 1,
    });

    // Format messages for the chat UI (keep _id for compatibility)
    const formattedMessages = messages.map((msg) => ({
        _id: msg._id.toString(),
        role: msg.role as "user" | "assistant",
        content: msg.content,
        createdAt: msg.createdAt,
    }));

    return Response.json({ messages: formattedMessages });
}

// DELETE chat history (clear all messages for a project)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: projectId } = await params;

    try {
        await connectToDatabase();
        
        // Delete all messages for this project
        const result = await ChatMessage.deleteMany({ projectId });
        
        console.log(`Cleared ${result.deletedCount} messages for project ${projectId}`);
        
        return Response.json({ 
            success: true, 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error("Failed to clear chat history:", error);
        return new Response("Failed to clear chat history", { status: 500 });
    }
}
