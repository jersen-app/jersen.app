import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Project from "@/models/Project";
import { SYSTEM_PROMPT, buildContextPrompt } from "@/lib/ai/prompts";
import { parseGeneratedFiles } from "@/lib/ai/files";
import { type FileChange } from "@/lib/ai/tools";

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
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
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

    // Build conversation history from DB
    const historyMessages: CoreMessage[] = chatHistory.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: String(msg.content || ""),
    }));

    // Combine system prompt with context
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${contextPrompt}`;

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

    // Stream response from Gemini
    const result = streamText({
        model: google("gemini-2.5-flash"),
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
                
                for (const file of parsedFiles) {
                    generatedFiles[file.path] = file.content;
                    fileChanges.push({
                        path: file.path,
                        content: file.content,
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
                            project.files = Array.from(fileMap.values());
                            await project.save();
                            console.log(`Saved ${Object.keys(generatedFiles).length} files to project ${projectId}`);
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
