import { z } from "zod";

/**
 * AI Tools for code generation and project management
 * These tools allow the AI to perform structured operations
 */

// Tool definitions for streamText
export const aiTools = {
    // Tool: Create or update a file
    createFile: {
        description: "Create a new file or update an existing file in the project. Use this when you need to write code to a file.",
        parameters: z.object({
            path: z.string().describe("The file path relative to the project root (e.g., 'app/page.tsx', 'components/Button.tsx')"),
            content: z.string().describe("The complete file content to write"),
            description: z.string().describe("Brief description of what this file does or what changes were made"),
        }),
    },

    // Tool: Delete a file
    deleteFile: {
        description: "Delete a file from the project. Use sparingly and only when the user explicitly asks to remove a file.",
        parameters: z.object({
            path: z.string().describe("The file path to delete"),
            reason: z.string().describe("Why this file is being deleted"),
        }),
    },

    // Tool: Create a todo/task list for planning
    createTodo: {
        description: "Create a todo list to plan and track progress on a complex task. Use this when the user's request requires multiple steps.",
        parameters: z.object({
            todos: z.array(z.object({
                id: z.number().describe("Unique ID for the todo"),
                title: z.string().describe("Short title for the todo (3-7 words)"),
                status: z.enum(["not-started", "in-progress", "completed"]).describe("Current status"),
                description: z.string().optional().describe("Optional detailed description"),
            })).describe("List of todos to track progress"),
        }),
    },

    // Tool: Update todo status
    updateTodo: {
        description: "Update the status of a todo item. Use this to mark progress as you complete steps.",
        parameters: z.object({
            id: z.number().describe("The todo ID to update"),
            status: z.enum(["not-started", "in-progress", "completed"]).describe("New status"),
        }),
    },

    // Tool: Think/reason about the problem
    think: {
        description: "Use this to reason through a problem, analyze requirements, or explain your approach before taking action. Always use this first to plan your approach.",
        parameters: z.object({
            reasoning: z.string().describe("Your step-by-step reasoning or analysis of the problem"),
            approach: z.string().describe("What approach you will take based on this reasoning"),
        }),
    },

    // Tool: Summarize changes made
    summarize: {
        description: "Provide a summary of all the changes made. Use this at the end of your response to give the user a clear overview.",
        parameters: z.object({
            summary: z.string().describe("A concise summary of what was accomplished"),
            filesChanged: z.array(z.object({
                path: z.string().describe("File path"),
                changeType: z.enum(["created", "modified", "deleted"]).describe("Type of change"),
                description: z.string().describe("What was changed in this file"),
            })).describe("List of files that were changed"),
            nextSteps: z.array(z.string()).optional().describe("Optional suggested next steps for the user"),
        }),
    },
};

// Schema for file changes (used to track all modifications)
export const FileChangeSchema = z.object({
    path: z.string(),
    content: z.string(),
    changeType: z.enum(["created", "modified", "deleted"]),
    description: z.string(),
});

export type FileChange = z.infer<typeof FileChangeSchema>;

// Schema for todo items
export const TodoSchema = z.object({
    id: z.number(),
    title: z.string(),
    status: z.enum(["not-started", "in-progress", "completed"]),
    description: z.string().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;

// Tool call result types for the UI
export type ToolCallResult = {
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
};

