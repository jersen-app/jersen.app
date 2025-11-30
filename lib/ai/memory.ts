import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import connectToDatabase from "@/lib/db";
import ProjectMemory, { IProjectMemory } from "@/models/ProjectMemory";
import ChatMessage from "@/models/ChatMessage";
import {
    getAuthDocs,
    getStorageDocs,
    getDatabaseDocs,
    getAllProviderDocs,
    type ProjectConfig,
} from "./provider-docs";

const SUMMARY_THRESHOLD = 10; // Re-summarize every 10 messages

/**
 * Get or create project memory
 */
export async function getProjectMemory(projectId: string, orgId: string): Promise<IProjectMemory | null> {
    await connectToDatabase();
    
    let memory = await ProjectMemory.findOne({ projectId });
    
    if (!memory) {
        memory = await ProjectMemory.create({
            projectId,
            orgId,
            summary: "",
            decisions: [],
            techStack: [],
            context: [],
            messageCountAtSummary: 0,
        });
    }
    
    return memory;
}

/**
 * Check if we need to generate a new summary
 */
export async function shouldSummarize(projectId: string): Promise<boolean> {
    await connectToDatabase();
    
    const memory = await ProjectMemory.findOne({ projectId });
    const messageCount = await ChatMessage.countDocuments({ projectId });
    
    if (!memory) return messageCount >= SUMMARY_THRESHOLD;
    
    const messagesSinceSummary = messageCount - memory.messageCountAtSummary;
    return messagesSinceSummary >= SUMMARY_THRESHOLD;
}

/**
 * Generate a summary of the conversation
 */
export async function generateSummary(projectId: string, orgId: string): Promise<string> {
    await connectToDatabase();
    
    // Get recent messages
    const messages = await ChatMessage.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(20) // Last 20 messages
        .lean();
    
    if (messages.length === 0) return "";
    
    // Get existing memory
    const existingMemory = await ProjectMemory.findOne({ projectId });
    
    // Build prompt for summarization
    const conversationText = messages
        .reverse()
        .map(m => `${m.role}: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`)
        .join('\n\n');
    
    const prompt = `You are summarizing a coding conversation for future context. The user is building a project with an AI assistant.

${existingMemory?.summary ? `Previous summary: ${existingMemory.summary}\n\n` : ''}

Recent conversation:
${conversationText}

Create a concise summary (max 300 words) that captures:
1. What the user is building (project type, purpose)
2. Key technologies and patterns being used
3. Important decisions made
4. Current state/progress
5. Any user preferences or requirements mentioned

Focus on information that would help the AI understand context in a new conversation. Be specific about file names, component names, and technical details.

Summary:`;

    try {
        const result = await generateText({
            model: google("gemini-2.0-flash"),
            prompt,
        });
        
        const summary = result.text.trim();
        
        // Update memory with new summary
        const messageCount = await ChatMessage.countDocuments({ projectId });
        
        await ProjectMemory.findOneAndUpdate(
            { projectId },
            {
                $set: {
                    summary,
                    lastSummarizedAt: new Date(),
                    messageCountAtSummary: messageCount,
                    orgId,
                },
            },
            { upsert: true }
        );
        
        return summary;
    } catch (error) {
        console.error("Failed to generate summary:", error);
        return existingMemory?.summary || "";
    }
}

/**
 * Add a decision or context to memory
 */
export async function addToMemory(
    projectId: string,
    orgId: string,
    type: "decision" | "context" | "tech",
    key: string,
    value: string,
    reason?: string
): Promise<void> {
    await connectToDatabase();
    
    const update: Record<string, unknown> = { orgId };
    
    if (type === "decision") {
        update.$push = {
            decisions: {
                decision: key,
                reason: value,
                timestamp: new Date(),
            },
        };
    } else if (type === "tech") {
        update.$addToSet = { techStack: value };
    } else {
        update.$push = {
            context: { key, value },
        };
    }
    
    await ProjectMemory.findOneAndUpdate(
        { projectId },
        update,
        { upsert: true }
    );
}

/**
 * Build memory context for AI prompt
 */
export async function buildMemoryContext(projectId: string): Promise<string> {
    await connectToDatabase();
    
    const memory = await ProjectMemory.findOne({ projectId }).lean();
    
    if (!memory) return "";
    
    const parts: string[] = [];
    
    if (memory.summary) {
        parts.push(`## Project Memory\n${memory.summary}`);
    }
    
    if (memory.techStack && memory.techStack.length > 0) {
        parts.push(`\n### Tech Stack: ${memory.techStack.join(", ")}`);
    }
    
    if (memory.decisions && memory.decisions.length > 0) {
        const recentDecisions = memory.decisions.slice(-5); // Last 5 decisions
        parts.push(`\n### Key Decisions:`);
        for (const d of recentDecisions) {
            parts.push(`- ${d.decision}: ${d.reason}`);
        }
    }
    
    if (memory.context && memory.context.length > 0) {
        const recentContext = memory.context.slice(-5);
        parts.push(`\n### Important Context:`);
        for (const c of recentContext) {
            parts.push(`- ${c.key}: ${c.value}`);
        }
    }
    
    return parts.join('\n');
}

/**
 * Tool execution helpers for file operations
 */
export function executeSearchFiles(
    files: Array<{ path: string; content: string }>,
    query: string,
    searchType: "filename" | "content"
): Array<{ path: string; matches?: string[] }> {
    const results: Array<{ path: string; matches?: string[] }> = [];
    const lowerQuery = query.toLowerCase();
    
    for (const file of files) {
        if (searchType === "filename") {
            if (file.path.toLowerCase().includes(lowerQuery)) {
                results.push({ path: file.path });
            }
        } else {
            const lines = file.content.split('\n');
            const matchingLines: string[] = [];
            
            lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(lowerQuery)) {
                    matchingLines.push(`L${idx + 1}: ${line.trim().slice(0, 100)}`);
                }
            });
            
            if (matchingLines.length > 0) {
                results.push({ 
                    path: file.path, 
                    matches: matchingLines.slice(0, 5) // Limit to 5 matches per file
                });
            }
        }
    }
    
    return results.slice(0, 10); // Limit to 10 files
}

export function executeReadFile(
    files: Array<{ path: string; content: string }>,
    path: string
): { found: boolean; content?: string; error?: string } {
    const file = files.find(f => f.path === path);
    
    if (!file) {
        return { found: false, error: `File not found: ${path}` };
    }
    
    return { found: true, content: file.content };
}

export function executeListDirectory(
    files: Array<{ path: string; content: string }>,
    dirPath: string
): string[] {
    const normalizedDir = dirPath.replace(/^\/|\/$/g, '');
    const items = new Set<string>();
    
    for (const file of files) {
        if (file.path.startsWith(normalizedDir ? normalizedDir + '/' : '')) {
            const relativePath = normalizedDir 
                ? file.path.slice(normalizedDir.length + 1)
                : file.path;
            const firstPart = relativePath.split('/')[0];
            if (firstPart) {
                items.add(firstPart);
            }
        }
    }
    
    return Array.from(items).sort();
}

export function executeFindRelated(
    files: Array<{ path: string; content: string }>,
    targetPath: string,
    relationType: "imports" | "exports" | "similar"
): Array<{ path: string; reason: string }> {
    const results: Array<{ path: string; reason: string }> = [];
    const targetFile = files.find(f => f.path === targetPath);
    
    if (!targetFile) return results;
    
    const targetName = targetPath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    
    for (const file of files) {
        if (file.path === targetPath) continue;
        
        if (relationType === "imports") {
            // Find files that import from the target
            if (file.content.includes(`from './${targetName}'`) ||
                file.content.includes(`from "./${targetName}"`) ||
                file.content.includes(`from '@/${targetPath.replace(/\.[^.]+$/, '')}'`)) {
                results.push({ path: file.path, reason: `imports ${targetName}` });
            }
        } else if (relationType === "exports") {
            // Find files that the target imports
            const importMatches = targetFile.content.match(/from\s+['"]([^'"]+)['"]/g);
            if (importMatches) {
                for (const match of importMatches) {
                    const importPath = match.replace(/from\s+['"]|['"]/g, '');
                    if (file.path.includes(importPath.replace(/^[@./]+/, ''))) {
                        results.push({ path: file.path, reason: `imported by ${targetName}` });
                    }
                }
            }
        } else {
            // Similar files (same directory or similar name pattern)
            const targetDir = targetPath.split('/').slice(0, -1).join('/');
            const fileDir = file.path.split('/').slice(0, -1).join('/');
            
            if (targetDir === fileDir) {
                results.push({ path: file.path, reason: 'same directory' });
            }
        }
    }
    
    return results.slice(0, 10);
}

/**
 * Execute getProviderDocs tool - returns implementation docs for a provider
 */
export function executeGetProviderDocs(
    projectConfig: ProjectConfig,
    provider: 'auth' | 'storage' | 'database' | 'all',
    context?: string
): { docs: string; provider: string } {
    let docs: string;
    
    switch (provider) {
        case 'auth':
            docs = getAuthDocs(projectConfig);
            break;
        case 'storage':
            docs = getStorageDocs(projectConfig);
            break;
        case 'database':
            docs = getDatabaseDocs(projectConfig);
            break;
        case 'all':
            docs = getAllProviderDocs(projectConfig);
            break;
        default:
            docs = `Unknown provider: ${provider}`;
    }
    
    return { docs, provider };
}
