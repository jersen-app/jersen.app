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
 * 4. Comment filepath: ```typescript\n// filepath: path/to/file.ts\n[content]```
 * 5. Inline filepath comment: // filepath: app/api/todos/route.ts anywhere in first 3 lines
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
    let blockCount = 0;

    while ((match = codeBlockRegex.exec(processedContent)) !== null) {
        blockCount++;
        const language = match[1] || '';
        const blockContent = match[2] || '';
        
        const lines = blockContent.split('\n');
        
        // Extract filepath - check first 3 lines for various patterns
        let filepath: string | null = null;
        let contentStartIndex = 0;
        
        for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i]?.trim() || '';
            
            // Pattern 1: filepath: path/to/file.tsx
            const filepathMatch = line.match(/^filepath:\s*(.+)$/i);
            if (filepathMatch) {
                filepath = filepathMatch[1].trim();
                contentStartIndex = i + 1;
                break;
            }
            
            // Pattern 2: // filepath: path/to/file.tsx
            const commentFilepathMatch = line.match(/^\/\/\s*filepath:\s*(.+)$/i);
            if (commentFilepathMatch) {
                filepath = commentFilepathMatch[1].trim();
                contentStartIndex = i + 1;
                break;
            }
            
            // Pattern 3: Just a path-like first line: app/page.tsx or lib/db.ts
            if (i === 0) {
                const pathLikeMatch = line.match(/^([a-zA-Z0-9_\-\/\[\]\.]+\.(tsx?|jsx?|css|json|md))$/i);
                if (pathLikeMatch) {
                    filepath = pathLikeMatch[1].trim();
                    contentStartIndex = 1;
                    break;
                }
            }
        }
        
        if (!filepath) {
            console.log(`[parseGeneratedFiles] Block ${blockCount} (${language}): No filepath found. First line: "${lines[0]?.slice(0, 50)}..."`);
            continue;
        }
        
        console.log(`[parseGeneratedFiles] Block ${blockCount}: Found file ${filepath}`);
        
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
        // NOTE: app/layout.tsx is allowed - needed for AuthProvider and other context providers
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
                    console.warn(`Failed to apply ${diffResult.failedBlocks.length} edits to ${file.path}:`, diffResult.failedBlocks);
                }
            } else {
                // Diff failed - use the REPLACE content from the last block as fallback
                // This is better than using raw diff content with markers
                console.warn(`Could not apply any edits to ${file.path}`);
                if (file.diffBlocks.length > 0) {
                    // Use the replacement content from the diff block
                    const lastBlock = file.diffBlocks[file.diffBlocks.length - 1];
                    console.warn(`Using REPLACE content as full file for ${file.path}`);
                    result[file.path] = lastBlock.replace;
                }
                // If no diff blocks, keep the existing file unchanged
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

/**
 * Extract npm packages from import statements in generated files
 * Returns packages that are NOT in the base Next.js template
 * 
 * @param files - Either ParsedFile[] or Record<string, string> (path -> content)
 */
export function extractDependencies(files: ParsedFile[] | Record<string, string>): string[] {
    // Packages already in the base nextjs-developer template
    const basePackages = new Set([
        'react',
        'react-dom',
        'next',
        'lucide-react',
        'tailwindcss',
        // Internal/relative imports start with . or @/
    ]);

    const packages = new Set<string>();
    
    // Regex to match import statements
    // Matches: import X from 'package' or import { X } from "package"
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    
    // Normalize input to array of contents
    const contents: string[] = Array.isArray(files)
        ? files.map(f => f.content)
        : Object.values(files);
    
    for (const content of contents) {
        let match;
        // Reset regex state for each file
        importRegex.lastIndex = 0;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            
            // Skip relative imports (., .., @/)
            if (importPath.startsWith('.') || importPath.startsWith('@/')) {
                continue;
            }
            
            // Extract package name (handle scoped packages like @clerk/nextjs)
            let packageName: string;
            if (importPath.startsWith('@')) {
                // Scoped package: @scope/package or @scope/package/subpath
                const parts = importPath.split('/');
                packageName = `${parts[0]}/${parts[1]}`;
            } else {
                // Regular package: package or package/subpath
                packageName = importPath.split('/')[0];
            }
            
            // Skip base packages and Node.js built-ins
            if (basePackages.has(packageName)) {
                continue;
            }
            
            // Skip Node.js built-in modules
            const nodeBuiltins = ['fs', 'path', 'os', 'http', 'https', 'crypto', 'stream', 'util', 'events', 'buffer', 'url', 'querystring', 'child_process', 'cluster', 'dgram', 'dns', 'net', 'readline', 'repl', 'tls', 'tty', 'v8', 'vm', 'zlib'];
            if (nodeBuiltins.includes(packageName)) {
                continue;
            }
            
            packages.add(packageName);
        }
    }
    
    return Array.from(packages);
}

/**
 * Extract explicit package install commands from AI response
 * Parses: <jersen_install>package1 package2 @scope/package</jersen_install>
 * 
 * @param aiResponse - The full AI response text
 * @returns Array of package names to install
 */
export function extractInstallCommands(aiResponse: string): string[] {
    const packages: string[] = [];
    
    // Match <jersen_install>...</jersen_install> blocks
    const installRegex = /<jersen_install>([\s\S]*?)<\/jersen_install>/gi;
    let match;
    
    while ((match = installRegex.exec(aiResponse)) !== null) {
        const content = match[1].trim();
        // Split by whitespace, commas, or newlines
        const pkgs = content.split(/[\s,]+/).filter(pkg => pkg.length > 0);
        packages.push(...pkgs);
    }
    
    // Validate package names (basic validation)
    return packages.filter(pkg => {
        // Valid npm package name pattern
        return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(pkg);
    });
}
