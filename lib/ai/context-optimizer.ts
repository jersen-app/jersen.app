/**
 * Context Window Optimization
 * 
 * Manages token budget to prevent context overflow.
 * Prioritizes content by importance and compresses when needed.
 */

import { CONDENSED_SYSTEM_PROMPT } from "./prompts-condensed";

// Rough token estimation (1 token ≈ 4 characters for English text)
const CHARS_PER_TOKEN = 4;

// Token budget allocation (for ~128K context window, using 80K safely to leave room for output)
// NOTE: Gemini 2.5 has 1M context but output can be affected by long context
const TOKEN_BUDGETS = {
    systemPrompt: 6000,      // Core instructions (fixed) - reduced
    providerDocs: 8000,      // Provider documentation (can compress) - reduced
    memory: 1500,            // Project memory/summary - reduced
    fileContext: 20000,      // Existing files - reduced
    conversationHistory: 10000, // Chat history - reduced
    userMessage: 5000,       // Current user message + attachments
    buffer: 5000,            // Safety buffer - increased
} as const;

const TOTAL_BUDGET = Object.values(TOKEN_BUDGETS).reduce((a, b) => a + b, 0);

export interface ContextPart {
    type: keyof typeof TOKEN_BUDGETS;
    content: string;
    priority: number; // Higher = more important
    compressible: boolean;
}

export interface OptimizedContext {
    systemPrompt: string;
    providerDocs: string;
    memory: string;
    fileContext: string;
    conversationHistory: string;
    totalTokens: number;
    wasCompressed: boolean;
    compressionDetails?: {
        originalTokens: number;
        removedParts: string[];
    };
}

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    if (text.length <= maxChars) return text;
    
    // Try to truncate at a natural break point
    const truncated = text.slice(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    
    if (lastNewline > maxChars * 0.8) {
        return truncated.slice(0, lastNewline) + '\n\n... (truncated)';
    }
    
    return truncated + '\n\n... (truncated)';
}

/**
 * Compress provider documentation by removing verbose examples
 */
export function compressProviderDocs(docs: string, targetTokens: number): string {
    const currentTokens = estimateTokens(docs);
    
    if (currentTokens <= targetTokens) {
        return docs;
    }
    
    let compressed = docs;
    
    // Strategy 1: Remove code block contents but keep signatures
    const codeBlockRegex = /```(?:typescript|tsx|ts|javascript|jsx)?\n([\s\S]*?)```/g;
    const compressionRatio = targetTokens / currentTokens;
    
    // PROTECT JERSEN PROVIDER DOCS:
    // If the docs contain "Jersen Auth", "Jersen Storage", or "Jersen Database", 
    // we should be very careful about stripping code blocks as they contain critical integration patterns.
    const isJersenDocs = docs.includes("Jersen Auth") || docs.includes("Jersen Storage") || docs.includes("Jersen Database");

    if (compressionRatio < 0.7 && !isJersenDocs) {
        // Heavy compression: Replace large code blocks with summaries
        compressed = compressed.replace(codeBlockRegex, (match, code) => {
            const lines = code.split('\n');
            if (lines.length > 10) {
                // Keep first 5 and last 3 lines
                const kept = [
                    ...lines.slice(0, 5),
                    `// ... ${lines.length - 8} more lines ...`,
                    ...lines.slice(-3),
                ].join('\n');
                return '```typescript\n' + kept + '\n```';
            }
            return match;
        });
    }
    
    if (compressionRatio < 0.5) {
        // Extreme compression: Remove all but essential examples
        // Keep only the first code example per section
        const sections = compressed.split(/(?=###)/);
        compressed = sections.map(section => {
            const codeBlocks = section.match(codeBlockRegex) || [];
            if (codeBlocks.length > 1) {
                // Keep only first code block
                let count = 0;
                return section.replace(codeBlockRegex, (match) => {
                    count++;
                    if (count === 1) return match;
                    return '*(see full docs for more examples)*';
                });
            }
            return section;
        }).join('');
    }
    
    // Final truncation if still over budget
    return truncateToTokens(compressed, targetTokens);
}

/**
 * Compress file context by summarizing large files
 */
export function compressFileContext(
    files: Array<{ path: string; content: string }>,
    targetTokens: number
): string {
    if (files.length === 0) return '';
    
    // Calculate current size
    const fullContext = files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
    const currentTokens = estimateTokens(fullContext);
    
    if (currentTokens <= targetTokens) {
        return fullContext;
    }
    
    // Sort files by importance
    const sortedFiles = [...files].sort((a, b) => {
        const scoreA = getFileImportance(a.path);
        const scoreB = getFileImportance(b.path);
        return scoreB - scoreA;
    });
    
    // Allocate tokens per file
    const tokensPerFile = Math.floor(targetTokens / files.length);
    const minTokensPerFile = 200;
    
    const parts: string[] = [];
    let usedTokens = 0;
    
    for (const file of sortedFiles) {
        const remainingBudget = targetTokens - usedTokens;
        const fileBudget = Math.max(minTokensPerFile, Math.min(tokensPerFile, remainingBudget));
        
        if (fileBudget < minTokensPerFile) {
            // Not enough budget, just list remaining files
            const remainingFiles = sortedFiles.slice(sortedFiles.indexOf(file));
            parts.push(`\n### Other files (${remainingFiles.length}):\n${remainingFiles.map(f => `- ${f.path}`).join('\n')}`);
            break;
        }
        
        const fileTokens = estimateTokens(file.content);
        
        if (fileTokens <= fileBudget) {
            // File fits in budget
            parts.push(`### ${file.path}\n\`\`\`\n${file.content}\n\`\`\``);
            usedTokens += fileTokens + 20; // Account for header
        } else {
            // Summarize file
            const summary = summarizeFile(file.path, file.content, fileBudget);
            parts.push(summary);
            usedTokens += estimateTokens(summary);
        }
    }
    
    return parts.join('\n\n');
}

/**
 * Get importance score for a file (higher = more important)
 */
function getFileImportance(path: string): number {
    let score = 0;
    
    // Layout files are critical
    if (path === 'app/layout.tsx') score += 100;
    if (path.includes('layout.tsx')) score += 50;
    
    // Core app files
    if (path === 'app/page.tsx') score += 80;
    if (path.startsWith('app/') && path.endsWith('page.tsx')) score += 40;
    
    // Library files
    if (path.startsWith('lib/')) score += 60;
    if (path.includes('auth')) score += 30;
    if (path.includes('db') || path.includes('database')) score += 30;
    
    // Components
    if (path.startsWith('components/')) score += 35;
    
    // Hooks
    if (path.startsWith('hooks/')) score += 45;
    
    // API routes
    if (path.startsWith('app/api/')) score += 50;
    
    // Types/interfaces
    if (path.includes('types')) score += 25;
    
    return score;
}

/**
 * Create a summary of a file
 */
function summarizeFile(path: string, content: string, maxTokens: number): string {
    const lines = content.split('\n');
    
    // Extract key information
    const imports = lines.filter(l => l.startsWith('import ')).slice(0, 5);
    const exports = lines.filter(l => l.includes('export '));
    const functions = lines.filter(l => l.match(/^(export\s+)?(async\s+)?function\s+\w+/));
    const components = lines.filter(l => l.match(/^(export\s+)?(default\s+)?function\s+[A-Z]\w+/));
    const interfaces = lines.filter(l => l.match(/^(export\s+)?interface\s+\w+/));
    
    const summary = [
        `### ${path} (summary)`,
        '',
        imports.length > 0 ? `**Imports:** ${imports.length} dependencies` : '',
        interfaces.length > 0 ? `**Interfaces:** ${interfaces.map(i => i.match(/interface\s+(\w+)/)?.[1]).filter(Boolean).join(', ')}` : '',
        components.length > 0 ? `**Components:** ${components.map(c => c.match(/function\s+(\w+)/)?.[1]).filter(Boolean).join(', ')}` : '',
        functions.length > 0 ? `**Functions:** ${functions.map(f => f.match(/function\s+(\w+)/)?.[1]).filter(Boolean).join(', ')}` : '',
        exports.length > 0 ? `**Exports:** ${exports.length} items` : '',
        '',
        '```typescript',
        truncateToTokens(content, maxTokens - 100),
        '```',
    ].filter(Boolean).join('\n');
    
    return summary;
}

/**
 * Compress conversation history
 */
export function compressConversationHistory(
    messages: Array<{ role: string; content: string }>,
    targetTokens: number
): Array<{ role: string; content: string }> {
    if (messages.length === 0) return [];
    
    // Always keep the last few messages intact
    const keepLast = 4;
    const recentMessages = messages.slice(-keepLast);
    const olderMessages = messages.slice(0, -keepLast);
    
    const recentTokens = recentMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const olderBudget = targetTokens - recentTokens;
    
    if (olderBudget <= 0 || olderMessages.length === 0) {
        return recentMessages;
    }
    
    // Summarize older messages
    const tokensPerMessage = Math.floor(olderBudget / olderMessages.length);
    
    const compressedOlder = olderMessages.map(msg => {
        if (estimateTokens(msg.content) <= tokensPerMessage) {
            return msg;
        }
        
        // Truncate long messages
        return {
            role: msg.role,
            content: truncateToTokens(msg.content, tokensPerMessage),
        };
    });
    
    return [...compressedOlder, ...recentMessages];
}

/**
 * Main function: Optimize all context parts to fit budget
 */
export function optimizeContext(options: {
    systemPrompt: string;
    providerDocs: string;
    memory: string;
    files: Array<{ path: string; content: string }>;
    conversationHistory: Array<{ role: string; content: string }>;
    userMessage: string;
}): OptimizedContext {
    const { systemPrompt, providerDocs, memory, files, conversationHistory, userMessage } = options;
    
    // Calculate current sizes
    const sizes = {
        systemPrompt: estimateTokens(systemPrompt),
        providerDocs: estimateTokens(providerDocs),
        memory: estimateTokens(memory),
        files: files.reduce((sum, f) => sum + estimateTokens(f.content) + 20, 0),
        history: conversationHistory.reduce((sum, m) => sum + estimateTokens(m.content), 0),
        userMessage: estimateTokens(userMessage),
    };
    
    const totalCurrent = Object.values(sizes).reduce((a, b) => a + b, 0);
    
    // If significantly over budget, use condensed system prompt
    let finalSystemPrompt = systemPrompt;
    if (totalCurrent > TOTAL_BUDGET * 1.2) {
        // Context is way over budget - use condensed system prompt
        finalSystemPrompt = CONDENSED_SYSTEM_PROMPT;
        console.log(`[Context Optimizer] Using condensed system prompt (${estimateTokens(CONDENSED_SYSTEM_PROMPT)} vs ${sizes.systemPrompt} tokens)`);
    }
    
    // Recalculate with potentially new system prompt
    sizes.systemPrompt = estimateTokens(finalSystemPrompt);
    const recalculatedTotal = Object.values(sizes).reduce((a, b) => a + b, 0);
    
    // If we're under budget, return as-is
    if (recalculatedTotal <= TOTAL_BUDGET - TOKEN_BUDGETS.buffer) {
        const fileContext = files.length > 0 
            ? files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
            : '';
            
        return {
            systemPrompt: finalSystemPrompt,
            providerDocs,
            memory,
            fileContext,
            conversationHistory: conversationHistory.map(m => m.content).join('\n\n---\n\n'),
            totalTokens: recalculatedTotal,
            wasCompressed: finalSystemPrompt !== systemPrompt,
        };
    }
    
    // Need to compress - start with lowest priority items
    const removedParts: string[] = [];
    
    // 1. Compress provider docs first (most compressible)
    const compressedProviderDocs = compressProviderDocs(
        providerDocs,
        TOKEN_BUDGETS.providerDocs
    );
    if (estimateTokens(compressedProviderDocs) < sizes.providerDocs) {
        removedParts.push(`Compressed provider docs from ${sizes.providerDocs} to ${estimateTokens(compressedProviderDocs)} tokens`);
    }
    
    // 2. Compress file context
    const compressedFileContext = compressFileContext(files, TOKEN_BUDGETS.fileContext);
    if (estimateTokens(compressedFileContext) < sizes.files) {
        removedParts.push(`Compressed file context from ${sizes.files} to ${estimateTokens(compressedFileContext)} tokens`);
    }
    
    // 3. Compress conversation history
    const compressedHistory = compressConversationHistory(
        conversationHistory,
        TOKEN_BUDGETS.conversationHistory
    );
    const historyText = compressedHistory.map(m => m.content).join('\n\n---\n\n');
    if (estimateTokens(historyText) < sizes.history) {
        removedParts.push(`Compressed history from ${sizes.history} to ${estimateTokens(historyText)} tokens`);
    }
    
    // 4. Truncate memory if needed
    const compressedMemory = truncateToTokens(memory, TOKEN_BUDGETS.memory);
    if (estimateTokens(compressedMemory) < sizes.memory) {
        removedParts.push(`Truncated memory from ${sizes.memory} to ${estimateTokens(compressedMemory)} tokens`);
    }
    
    // 5. Use condensed system prompt if still over budget
    const afterCompressionTotal = 
        estimateTokens(finalSystemPrompt) +
        estimateTokens(compressedProviderDocs) +
        estimateTokens(compressedMemory) +
        estimateTokens(compressedFileContext) +
        estimateTokens(historyText) +
        estimateTokens(userMessage);
    
    let usedSystemPrompt = finalSystemPrompt;
    if (afterCompressionTotal > TOTAL_BUDGET) {
        // Still over budget - use condensed system prompt
        usedSystemPrompt = CONDENSED_SYSTEM_PROMPT;
        removedParts.push(`Switched to condensed system prompt to save ${estimateTokens(finalSystemPrompt) - estimateTokens(CONDENSED_SYSTEM_PROMPT)} tokens`);
    }
    
    const finalTotal = 
        estimateTokens(usedSystemPrompt) +
        estimateTokens(compressedProviderDocs) +
        estimateTokens(compressedMemory) +
        estimateTokens(compressedFileContext) +
        estimateTokens(historyText) +
        estimateTokens(userMessage);
    
    return {
        systemPrompt: usedSystemPrompt,
        providerDocs: compressedProviderDocs,
        memory: compressedMemory,
        fileContext: compressedFileContext,
        conversationHistory: historyText,
        totalTokens: finalTotal,
        wasCompressed: true,
        compressionDetails: {
            originalTokens: totalCurrent,
            removedParts,
        },
    };
}

/**
 * Quick check if context needs optimization
 */
export function needsOptimization(options: {
    systemPrompt: string;
    providerDocs: string;
    memory: string;
    files: Array<{ path: string; content: string }>;
    conversationHistory: Array<{ role: string; content: string }>;
}): boolean {
    const total = 
        estimateTokens(options.systemPrompt) +
        estimateTokens(options.providerDocs) +
        estimateTokens(options.memory) +
        options.files.reduce((sum, f) => sum + estimateTokens(f.content), 0) +
        options.conversationHistory.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    
    return total > TOTAL_BUDGET - TOKEN_BUDGETS.buffer;
}

export { TOKEN_BUDGETS, TOTAL_BUDGET };
