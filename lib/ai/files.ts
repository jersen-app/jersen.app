export interface ParsedFile {
    path: string;
    content: string;
}

/**
 * Parse AI response to extract generated files
 * Handles multiple formats:
 * 1. ```typescript:filepath:path/to/file.tsx\n...
 * 2. ```typescript\nfilepath: path/to/file.tsx\n...
 * 3. ```tsx\n// app/page.tsx\n...
 * 4. Inferred from language (json → package.json, tsx → app/page.tsx, etc.)
 */
export function parseGeneratedFiles(aiResponse: string): ParsedFile[] {
    const files: ParsedFile[] = [];
    
    // Match code blocks with language and optional filepath in fence
    // Supports: ```typescript:filepath:path/to/file.tsx or ```tsx
    const codeBlockRegex = /```(\w+)?(?::filepath:([^\n]+))?\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
        const language = match[1] || '';
        const fenceFilepath = match[2]?.trim();
        const blockContent = match[3] || '';
        
        // Try to extract filepath from the first line
        const lines = blockContent.split('\n');
        const firstLine = lines[0]?.trim() || '';
        const secondLine = lines[1]?.trim() || '';
        
        let filepath: string | null = fenceFilepath || null;
        let contentStartIndex = 0;
        
        // Pattern 1: Already got filepath from fence (```typescript:filepath:path/file.tsx)
        if (filepath) {
            contentStartIndex = 0;
        }
        
        // Pattern 2: "filepath: path/to/file.tsx" or "filepath:path/to/file.tsx" on first line
        if (!filepath) {
            const filepathMatch = firstLine.match(/^filepath:\s*(.+)$/i);
            if (filepathMatch) {
                filepath = filepathMatch[1].trim();
                contentStartIndex = 1;
            }
        }
        
        // Pattern 3: "// filepath: path/to/file.tsx" as comment
        if (!filepath) {
            const commentFilepathMatch = firstLine.match(/^\/\/\s*filepath:\s*(.+)$/i);
            if (commentFilepathMatch) {
                filepath = commentFilepathMatch[1].trim();
                contentStartIndex = 1;
            }
        }
        
        // Pattern 4: "// app/page.tsx" or "// src/components/Button.tsx" - path-like comment
        if (!filepath) {
            const pathCommentMatch = firstLine.match(/^\/\/\s*([a-zA-Z0-9_\-\/]+\.(tsx?|jsx?|css|json|md|ts))$/i);
            if (pathCommentMatch) {
                filepath = pathCommentMatch[1].trim();
                contentStartIndex = 1;
            }
        }
        
        // Pattern 5: First line is just a file path like "app/page.tsx"
        if (!filepath) {
            const pathLikeMatch = firstLine.match(/^([a-zA-Z0-9_\-\/]+\.(tsx?|jsx?|css|json|md|ts))$/i);
            if (pathLikeMatch) {
                filepath = pathLikeMatch[1].trim();
                contentStartIndex = 1;
            }
        }
        
        // Pattern 6: Infer from language for common file types
        if (!filepath) {
            const languageToPath: Record<string, string> = {
                'json': 'package.json',
                'tsx': 'app/page.tsx',
                'typescript': 'app/page.tsx',
                'ts': 'app/page.ts',
                'jsx': 'app/page.jsx',
                'javascript': 'app/page.js',
                'js': 'app/page.js',
                'css': 'app/globals.css',
            };
            
            // Check if content gives hints about the file
            const lowerContent = blockContent.toLowerCase();
            const lowerFirstLine = firstLine.toLowerCase();
            
            if (language === 'json' && (lowerContent.includes('"dependencies"') || lowerContent.includes('"name":'))) {
                filepath = 'package.json';
            } else if (language === 'json' && lowerContent.includes('"compileroptions"')) {
                filepath = 'tsconfig.json';
            } else if (lowerFirstLine.includes("'use client'") || lowerFirstLine.includes('"use client"')) {
                filepath = 'app/page.tsx';
            } else if (lowerContent.includes('export default function') && (language === 'tsx' || language === 'typescript')) {
                filepath = 'app/page.tsx';
            } else if (languageToPath[language.toLowerCase()]) {
                filepath = languageToPath[language.toLowerCase()];
            }
        }
        
        if (filepath) {
            // Remove the filepath line from content if we used it
            const content = lines.slice(contentStartIndex).join('\n').trim();
            if (content) {
                files.push({ path: filepath, content });
            }
        }
    }

    return files;
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
