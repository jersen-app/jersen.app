import { z } from "zod";

/**
 * AI Tools for code generation and project management
 * These tools allow the AI to perform structured operations
 */

// Tool definitions for streamText
export const aiTools = {
    // Tool: Get provider documentation
    getProviderDocs: {
        description: "Get detailed implementation documentation for Jersen providers (auth, storage, database). Use this BEFORE implementing any feature that requires authentication, file uploads, or database operations. This returns code templates and examples specific to this project.",
        parameters: z.object({
            provider: z.enum(["auth", "storage", "database", "all"]).describe("Which provider docs to retrieve. Use 'auth' for login/signup, 'storage' for file uploads, 'database' for data persistence, or 'all' for everything."),
            context: z.string().optional().describe("What feature you're implementing - helps provide relevant examples"),
        }),
    },

    // Tool: Search files in the project
    searchFiles: {
        description: "Search for files in the project by name pattern or content. Use this FIRST when you need to understand the project structure or find specific files before making changes.",
        parameters: z.object({
            query: z.string().describe("Search query - can be a filename pattern (e.g., '*.tsx', 'Button') or content to search for"),
            searchType: z.enum(["filename", "content"]).describe("Whether to search by filename or file content"),
        }),
    },

    // Tool: Read file contents
    readFile: {
        description: "Read the contents of a specific file. Use this to understand existing code before making modifications. Always read files before editing them.",
        parameters: z.object({
            path: z.string().describe("The file path relative to project root (e.g., 'app/page.tsx')"),
        }),
    },

    // Tool: List directory contents
    listDirectory: {
        description: "List all files and folders in a directory. Use this to explore project structure.",
        parameters: z.object({
            path: z.string().describe("The directory path relative to project root (e.g., 'components' or 'app/api')"),
        }),
    },

    // Tool: Find related files
    findRelated: {
        description: "Find files that are related to a given file (imports, exports, similar patterns). Use this to understand dependencies.",
        parameters: z.object({
            path: z.string().describe("The file path to find related files for"),
            relationType: z.enum(["imports", "exports", "similar"]).describe("Type of relationship to find"),
        }),
    },

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

    // Tool: Remember context for future conversations
    remember: {
        description: "Store important context, decisions, or patterns to remember for future conversations. Use this when users make important decisions about architecture, design, or preferences.",
        parameters: z.object({
            type: z.enum(["decision", "context", "tech"]).describe("Type of thing to remember"),
            key: z.string().describe("Short key/title for this memory"),
            value: z.string().describe("The information to remember"),
            reason: z.string().optional().describe("Why this is important to remember"),
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

