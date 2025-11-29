import { applyDiff, type FileDiff, type DiffBlock } from "./diff";

export interface ParsedFile {
    path: string;
    content: string;
    isEdit?: boolean;
    diffBlocks?: DiffBlock[];
}

/**
 * Parse SEARCH/REPLACE blocks from content
 */
function extractDiffBlocks(content: string): DiffBlock[] {
    const blocks: DiffBlock[] = [];
    const blockRegex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
    
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
        blocks.push({
            search: match[1],
            replace: match[2],
        });
    }
    
    return blocks;
}

/**
 * Parse AI response to extract generated files and diffs
 * Handles:
 * 1. Full file format: ```tsx\nfilepath: path/to/file.tsx\n[content]```
 * 2. Diff format: ```diff\nfilepath: path/to/file.tsx\n<<<<<<< SEARCH...```
 * 3. Filepath outside code block: filepath: path\n```tsx\n[content]```
 */
export function parseGeneratedFiles(aiResponse: string): ParsedFile[] {
    const files: ParsedFile[] = [];
    
    // Pre-process: Handle "filepath: xxx\n\n```lang" pattern (filepath outside code block)
    // Convert to "```lang\nfilepath: xxx" pattern
    let processedContent = aiResponse.replace(
        /filepath:\s*([^\n]+)\n\n```(\w+)?/gi,
        (_, filepath, lang) => `\`\`\`${lang || 'tsx'}\nfilepath: ${filepath.trim()}`
    );
    
    // Also handle single newline variant
    processedContent = processedContent.replace(
        /filepath:\s*([^\n]+)\n```(\w+)?/gi,
        (_, filepath, lang) => `\`\`\`${lang || 'tsx'}\nfilepath: ${filepath.trim()}`
    );
    
    // Match code blocks with language
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(processedContent)) !== null) {
        const language = match[1] || '';
        const blockContent = match[2] || '';
        
        const lines = blockContent.split('\n');
        const firstLine = lines[0]?.trim() || '';
        
        // Extract filepath
        let filepath: string | null = null;
        let contentStartIndex = 0;
        
        const filepathMatch = firstLine.match(/^filepath:\s*(.+)$/i);
        if (filepathMatch) {
            filepath = filepathMatch[1].trim();
            contentStartIndex = 1;
        }
        
        if (!filepath) {
            const commentFilepathMatch = firstLine.match(/^\/\/\s*filepath:\s*(.+)$/i);
            if (commentFilepathMatch) {
                filepath = commentFilepathMatch[1].trim();
                contentStartIndex = 1;
            }
        }
        
        if (!filepath) {
            const pathLikeMatch = firstLine.match(/^([a-zA-Z0-9_\-\/]+\.(tsx?|jsx?|css|json|md|ts))$/i);
            if (pathLikeMatch) {
                filepath = pathLikeMatch[1].trim();
                contentStartIndex = 1;
            }
        }
        
        if (!filepath) continue;
        
        const restContent = lines.slice(contentStartIndex).join('\n');
        
        // Check if this is a diff (has SEARCH/REPLACE blocks)
        const isDiff = restContent.includes('<<<<<<< SEARCH') && restContent.includes('>>>>>>> REPLACE');
        
        if (isDiff || language === 'diff') {
            // Parse as diff
            const diffBlocks = extractDiffBlocks(restContent);
            if (diffBlocks.length > 0) {
                files.push({
                    path: filepath,
                    content: restContent,
                    isEdit: true,
                    diffBlocks,
                });
            }
        } else {
            // Full file
            const content = restContent.trim();
            if (content) {
                files.push({
                    path: filepath,
                    content,
                    isEdit: false,
                });
            }
        }
    }
    
    // Deduplicate - keep last occurrence of each file
    const fileMap = new Map<string, ParsedFile>();
    for (const file of files) {
        fileMap.set(file.path, file);
    }
    
    // Filter out config files that shouldn't be generated
    const configFilesToIgnore = [
        'tailwind.config.ts',
        'tailwind.config.js',
        'postcss.config.js',
        'postcss.config.mjs',
        'next.config.ts',
        'next.config.js',
        'next.config.mjs',
        'tsconfig.json',
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        '.eslintrc.json',
        '.eslintrc.js',
        'eslint.config.mjs',
        'app/globals.css',
        'app/layout.tsx', // E2B template already has this
    ];
    
    const filteredFiles = Array.from(fileMap.values()).filter(
        file => !configFilesToIgnore.includes(file.path)
    );

    return filteredFiles;
}

/**
 * Apply parsed files to existing files
 * Returns the final file contents after applying any diffs
 */
export function applyFilesToExisting(
    parsedFiles: ParsedFile[],
    existingFiles: Record<string, string>
): Record<string, string> {
    const result = { ...existingFiles };
    
    for (const file of parsedFiles) {
        if (file.isEdit && file.diffBlocks && file.diffBlocks.length > 0) {
            // Apply diff to existing file
            const existing = result[file.path] || '';
            const fileDiff: FileDiff = {
                path: file.path,
                blocks: file.diffBlocks,
                isFullFile: false,
            };
            const diffResult = applyDiff(existing, fileDiff);
            
            if (diffResult.success || diffResult.appliedBlocks > 0) {
                result[file.path] = diffResult.content;
                console.log(`Applied ${diffResult.appliedBlocks} edits to ${file.path}`);
                if (diffResult.failedBlocks.length > 0) {
                    console.warn(`Failed to apply ${diffResult.failedBlocks.length} edits to ${file.path}`);
                }
            } else {
                console.warn(`Could not apply any edits to ${file.path}, using as full replacement`);
                result[file.path] = file.content;
            }
        } else {
            // Full file replacement
            result[file.path] = file.content;
        }
    }
    
    return result;
}

/**
 * Upload generated files to R2
 */
export async function saveFilesToR2(
    projectId: string,
    files: ParsedFile[]
): Promise<void> {
    const { uploadFile } = await import("@/lib/storage/r2");

    for (const file of files) {
        const buffer = Buffer.from(file.content, "utf-8");
        await uploadFile({
            projectId,
            key: `files/${file.path}`,
            body: buffer,
            contentType: "text/plain",
        });
    }
}

/**
 * Get all files for a project from R2
 */
export async function getProjectFiles(projectId: string): Promise<ParsedFile[]> {
    // For now, return empty array - we'll implement R2 listing later
    // In production, you'd list all objects with prefix `projects/${projectId}/files/`
    return [];
}
