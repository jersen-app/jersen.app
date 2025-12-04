import { z } from "zod";
import { tool } from "ai";
import {
    executeSearchFiles,
    executeReadFile,
    executeListDirectory,
    executeFindRelated,
    executeGetProviderDocs,
    addToMemory,
} from "./memory";
import type { ProjectConfig } from "./provider-docs";

// Import new tools
import { createPlanningTool } from "./tools/planning";
import { createValidationTool } from "./tools/validation";
import { createDiscoveryTool } from "./tools/discovery";
import { createTemplateTool } from "./templates";

// Export new tool modules
export { createPlanningTool } from "./tools/planning";
export { createValidationTool } from "./tools/validation";
export { createDiscoveryTool } from "./tools/discovery";
export { createTemplateTool } from "./templates";

/**
 * AI Tools for Jersen code generation
 * 
 * These tools allow the AI to:
 * 1. Search and read project files before making changes
 * 2. Get provider documentation for auth/storage/database
 * 3. Remember important decisions and context
 * 4. Plan multi-file changes before implementing
 * 5. Validate TypeScript code before outputting
 * 6. Discover existing reusable components
 * 7. Use pre-built templates for common patterns
 * 
 * Tools are executed server-side and results are returned to the AI.
 */

// Context that will be passed to tools at runtime
export interface ToolContext {
    projectId: string;
    orgId: string;
    files: Array<{ path: string; content: string }>;
    projectConfig: ProjectConfig;
}

// Create tools with execute functions for Vercel AI SDK v5
export function createAiTools(context: ToolContext) {
    // Prepare existing file paths for planning tool
    const existingFilePaths = context.files.map(f => f.path);
    
    // Get the new tools with proper context
    const planningTools = createPlanningTool({
        projectId: context.projectId,
        existingFiles: existingFilePaths,
    });
    const validationTools = createValidationTool();
    const discoveryTools = createDiscoveryTool({ files: context.files });
    const templateTools = createTemplateTool();
    
    return {
        // Tool: Get provider documentation (uses condensed docs to save context)
        getProviderDocs: tool({
            description: "Get implementation documentation for Jersen providers (auth, storage, database). Use this when implementing features that require authentication, file uploads, or database operations.",
            inputSchema: z.object({
                provider: z.enum(["auth", "storage", "database", "all"]).describe("Which provider docs to retrieve."),
            }),
            execute: async ({ provider }) => {
                // Use executeGetProviderDocs from memory.ts which returns condensed docs
                const result = executeGetProviderDocs(context.projectConfig, provider);
                return {
                    provider: result.provider,
                    documentation: result.docs,
                };
            },
        }),

        // Tool: Search files in the project
        searchFiles: tool({
            description: "Search for files in the project by name or content. Use this to find specific files or code patterns before making changes.",
            inputSchema: z.object({
                query: z.string().describe("Search query - filename pattern or content to search for"),
                searchType: z.enum(["filename", "content"]).describe("Search by filename or file content"),
            }),
            execute: async ({ query, searchType }) => {
                const results = executeSearchFiles(context.files, query, searchType);
                return {
                    query,
                    searchType,
                    matches: results,
                    count: results.length,
                };
            },
        }),

        // Tool: Read file contents
        readFile: tool({
            description: "Read the contents of a specific file. Use this to understand existing code before making modifications.",
            inputSchema: z.object({
                path: z.string().describe("The file path relative to project root (e.g., 'app/page.tsx')"),
            }),
            execute: async ({ path }) => {
                const result = executeReadFile(context.files, path);
                return result;
            },
        }),

        // Tool: List directory contents
        listDirectory: tool({
            description: "List all files and folders in a directory. Use this to explore project structure.",
            inputSchema: z.object({
                path: z.string().describe("The directory path (e.g., 'components' or 'app/api')"),
            }),
            execute: async ({ path }) => {
                const items = executeListDirectory(context.files, path);
                return {
                    path,
                    items,
                    count: items.length,
                };
            },
        }),

        // Tool: Find related files (base tool)
        findRelatedFiles: tool({
            description: "Find files that import from or are imported by a given file.",
            inputSchema: z.object({
                path: z.string().describe("The file path to find related files for"),
                relationType: z.enum(["imports", "exports", "similar"]).describe("Type of relationship"),
            }),
            execute: async ({ path, relationType }) => {
                const results = executeFindRelated(context.files, path, relationType);
                return {
                    path,
                    relationType,
                    relatedFiles: results,
                };
            },
        }),

        // Tool: Remember context for future conversations
        remember: tool({
            description: "Store important context, decisions, or patterns to remember for future conversations. Use when users make important decisions about architecture or preferences.",
            inputSchema: z.object({
                type: z.enum(["decision", "context", "tech"]).describe("Type of thing to remember"),
                key: z.string().describe("Short key/title for this memory"),
                value: z.string().describe("The information to remember"),
            }),
            execute: async ({ type, key, value }) => {
                await addToMemory(context.projectId, context.orgId, type, key, value);
                return {
                    stored: true,
                    type,
                    key,
                    value,
                };
            },
        }),
        
        // === NEW TOOLS ===
        // Note: Some complex tools disabled temporarily for Gemini compatibility
        
        // Planning tools for multi-file changes
        // Disabled: Complex nested schema causes Gemini errors
        // ...planningTools,
        
        // Validation tool for TypeScript code
        ...validationTools,
        
        // Discovery tool for finding existing components
        ...discoveryTools,
        
        // Template tools for code generation
        ...templateTools,
    };
}

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


