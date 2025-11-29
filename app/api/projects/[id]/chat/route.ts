import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import { SYSTEM_PROMPT, buildContextPrompt } from "@/lib/ai/prompts";
import { parseGeneratedFiles, saveFilesToR2 } from "@/lib/ai/files";
import { type FileChange } from "@/lib/ai/tools";

export const maxDuration = 60;

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

    if (!userContent.trim()) {
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

    // Build the full message array with proper types
    const allMessages: CoreMessage[] = [
        { role: "system", content: fullSystemPrompt },
        ...historyMessages,
        { role: "user", content: userContent },
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

                // Save user message
                await ChatMessage.create({
                    projectId,
                    role: "user",
                    content: userContent,
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

                // Save files to R2 if any
                if (Object.keys(generatedFiles).length > 0) {
                    try {
                        const filesToSave = Object.entries(generatedFiles).map(([path, content]) => ({
                            path,
                            content,
                        }));
                        await saveFilesToR2(projectId, filesToSave);
                    } catch (error) {
                        console.error("Failed to save files to R2:", error);
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
