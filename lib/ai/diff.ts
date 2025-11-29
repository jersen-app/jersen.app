/**
 * Diff parsing and application utilities
 * Handles SEARCH/REPLACE block format for incremental file edits
 */

export interface DiffBlock {
    search: string;
    replace: string;
}

export interface FileDiff {
    path: string;
    blocks: DiffBlock[];
    isFullFile: boolean; // true if this is a full file replacement, not a diff
    fullContent?: string; // only set if isFullFile is true
}

export interface DiffResult {
    success: boolean;
    content: string;
    appliedBlocks: number;
    failedBlocks: { search: string; reason: string }[];
}

/**
 * Parse a diff block from AI output
 * Supports format:
 * ```diff
 * filepath: app/page.tsx
 * <<<<<<< SEARCH
 * old code
 * =======
 * new code
 * >>>>>>> REPLACE
 * ```
 */
export function parseDiffBlocks(content: string): FileDiff | null {
    const lines = content.split('\n');
    
    // Check for filepath on first line
    const firstLine = lines[0]?.trim() || '';
    const filepathMatch = firstLine.match(/^filepath:\s*(.+)$/i);
    
    if (!filepathMatch) {
        return null;
    }
    
    const path = filepathMatch[1].trim();
    const restContent = lines.slice(1).join('\n');
    
    // Check if this contains SEARCH/REPLACE blocks
    if (!restContent.includes('<<<<<<< SEARCH') || !restContent.includes('>>>>>>> REPLACE')) {
        // This is a full file, not a diff
        return {
            path,
            blocks: [],
            isFullFile: true,
            fullContent: restContent.trim(),
        };
    }
    
    // Parse SEARCH/REPLACE blocks
    const blocks: DiffBlock[] = [];
    const blockRegex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
    
    let match;
    while ((match = blockRegex.exec(restContent)) !== null) {
        blocks.push({
            search: match[1],
            replace: match[2],
        });
    }
    
    return {
        path,
        blocks,
        isFullFile: false,
    };
}

/**
 * Apply diff blocks to existing file content
 */
export function applyDiff(originalContent: string, diff: FileDiff): DiffResult {
    // If it's a full file replacement, just return the new content
    if (diff.isFullFile && diff.fullContent !== undefined) {
        return {
            success: true,
            content: diff.fullContent,
            appliedBlocks: 1,
            failedBlocks: [],
        };
    }
    
    let content = originalContent;
    const failedBlocks: { search: string; reason: string }[] = [];
    let appliedBlocks = 0;
    
    for (const block of diff.blocks) {
        // Try exact match first
        if (content.includes(block.search)) {
            content = content.replace(block.search, block.replace);
            appliedBlocks++;
            continue;
        }
        
        // Try with normalized whitespace (trim each line)
        const normalizedSearch = normalizeWhitespace(block.search);
        const normalizedContent = normalizeWhitespace(content);
        
        if (normalizedContent.includes(normalizedSearch)) {
            // Find the actual position and replace
            const searchLines = block.search.split('\n');
            const contentLines = content.split('\n');
            
            const startIdx = findBlockStart(contentLines, searchLines);
            if (startIdx !== -1) {
                const replaceLines = block.replace.split('\n');
                contentLines.splice(startIdx, searchLines.length, ...replaceLines);
                content = contentLines.join('\n');
                appliedBlocks++;
                continue;
            }
        }
        
        // Try fuzzy match (ignoring leading/trailing whitespace per line)
        const fuzzyResult = fuzzyReplace(content, block.search, block.replace);
        if (fuzzyResult.success) {
            content = fuzzyResult.content;
            appliedBlocks++;
            continue;
        }
        
        // Failed to find the search text
        failedBlocks.push({
            search: block.search.substring(0, 100) + (block.search.length > 100 ? '...' : ''),
            reason: 'Could not find matching text in file',
        });
    }
    
    return {
        success: failedBlocks.length === 0,
        content,
        appliedBlocks,
        failedBlocks,
    };
}

/**
 * Normalize whitespace for comparison
 */
function normalizeWhitespace(text: string): string {
    return text
        .split('\n')
        .map(line => line.trim())
        .join('\n');
}

/**
 * Find the starting line index of a block in content
 */
function findBlockStart(contentLines: string[], searchLines: string[]): number {
    const firstSearchLine = searchLines[0].trim();
    
    for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
        if (contentLines[i].trim() === firstSearchLine) {
            // Check if all lines match
            let allMatch = true;
            for (let j = 0; j < searchLines.length; j++) {
                if (contentLines[i + j].trim() !== searchLines[j].trim()) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) {
                return i;
            }
        }
    }
    
    return -1;
}

/**
 * Fuzzy replace - tries to match ignoring whitespace differences
 */
function fuzzyReplace(
    content: string,
    search: string,
    replace: string
): { success: boolean; content: string } {
    const searchLines = search.split('\n').map(l => l.trim()).filter(l => l);
    const contentLines = content.split('\n');
    
    // Find sequence of lines that match (ignoring whitespace)
    for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
        let matches = true;
        let matchEnd = i;
        let searchIdx = 0;
        
        for (let j = i; j < contentLines.length && searchIdx < searchLines.length; j++) {
            const contentLine = contentLines[j].trim();
            if (!contentLine && !searchLines[searchIdx]) {
                // Both empty, continue
                matchEnd = j + 1;
                continue;
            }
            if (contentLine === searchLines[searchIdx]) {
                searchIdx++;
                matchEnd = j + 1;
            } else if (contentLine === '') {
                // Skip empty lines in content
                matchEnd = j + 1;
            } else {
                matches = false;
                break;
            }
        }
        
        if (matches && searchIdx === searchLines.length) {
            // Found a match, replace
            const replaceLines = replace.split('\n');
            // Preserve original indentation from first matched line
            const indent = contentLines[i].match(/^(\s*)/)?.[1] || '';
            const indentedReplace = replaceLines.map((line, idx) => {
                if (idx === 0 || !line.trim()) return line;
                return indent + line.trimStart();
            });
            
            contentLines.splice(i, matchEnd - i, ...indentedReplace);
            return { success: true, content: contentLines.join('\n') };
        }
    }
    
    return { success: false, content };
}

/**
 * Apply diffs to file content using DiffBlock array
 * This is the main function used by ChatInterface
 */
export function applyDiffBlocks(
    originalContent: string,
    blocks: DiffBlock[]
): DiffResult {
    let content = originalContent;
    const failedBlocks: { search: string; reason: string }[] = [];
    let appliedBlocks = 0;
    
    for (const block of blocks) {
        // Try exact match first
        if (content.includes(block.search)) {
            content = content.replace(block.search, block.replace);
            appliedBlocks++;
            continue;
        }
        
        // Try with normalized whitespace
        const searchLines = block.search.split('\n');
        const contentLines = content.split('\n');
        
        const startIdx = findBlockStart(contentLines, searchLines);
        if (startIdx !== -1) {
            const replaceLines = block.replace.split('\n');
            contentLines.splice(startIdx, searchLines.length, ...replaceLines);
            content = contentLines.join('\n');
            appliedBlocks++;
            continue;
        }
        
        // Try fuzzy match
        const fuzzyResult = fuzzyReplace(content, block.search, block.replace);
        if (fuzzyResult.success) {
            content = fuzzyResult.content;
            appliedBlocks++;
            continue;
        }
        
        // Failed to find the search text
        failedBlocks.push({
            search: block.search.substring(0, 100) + (block.search.length > 100 ? '...' : ''),
            reason: 'Could not find matching text in file',
        });
    }
    
    return {
        success: failedBlocks.length === 0,
        content,
        appliedBlocks,
        failedBlocks,
    };
}

/**
 * Generate a unified diff for display (for UI purposes)
 */
export function generateDisplayDiff(
    originalContent: string,
    newContent: string,
    filepath: string
): string {
    const originalLines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    
    const diff: string[] = [];
    diff.push(`--- a/${filepath}`);
    diff.push(`+++ b/${filepath}`);
    
    // Simple line-by-line diff (not optimal but works for display)
    let i = 0, j = 0;
    
    while (i < originalLines.length || j < newLines.length) {
        if (i >= originalLines.length) {
            diff.push(`+ ${newLines[j]}`);
            j++;
        } else if (j >= newLines.length) {
            diff.push(`- ${originalLines[i]}`);
            i++;
        } else if (originalLines[i] === newLines[j]) {
            diff.push(`  ${originalLines[i]}`);
            i++;
            j++;
        } else {
            // Lines differ - check if it's a modification or add/remove
            diff.push(`- ${originalLines[i]}`);
            diff.push(`+ ${newLines[j]}`);
            i++;
            j++;
        }
    }
    
    return diff.join('\n');
}
