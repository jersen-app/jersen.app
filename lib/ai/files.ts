export interface ParsedFile {
    path: string;
    content: string;
}

/**
 * Parse AI response to extract generated files
 * Handles multiple formats:
 * 1. ```typescript\nfilepath: path/to/file.tsx\n...
 * 2. ```filepath:path/to/file.tsx\n...
 * 3. ```tsx\nfilepath: path/to/file.tsx\n...
 */
export function parseGeneratedFiles(aiResponse: string): ParsedFile[] {
    const files: ParsedFile[] = [];
    
    // Match all code blocks
    const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
        const blockContent = match[1];
        
        // Try to extract filepath from the first line
        const lines = blockContent.split('\n');
        const firstLine = lines[0]?.trim() || '';
        
        // Check various filepath patterns
        let filepath: string | null = null;
        
        // Pattern 1: "filepath: path/to/file.tsx" or "filepath:path/to/file.tsx"
        const filepathMatch = firstLine.match(/^filepath:\s*(.+)$/i);
        if (filepathMatch) {
            filepath = filepathMatch[1].trim();
        }
        
        // Pattern 2: "// filepath: path/to/file.tsx"
        const commentFilepathMatch = firstLine.match(/^\/\/\s*filepath:\s*(.+)$/i);
        if (!filepath && commentFilepathMatch) {
            filepath = commentFilepathMatch[1].trim();
        }
        
        // Pattern 3: Check if first line looks like a file path (e.g., "app/page.tsx")
        const pathLikeMatch = firstLine.match(/^([a-zA-Z0-9_\-\/]+\.(tsx?|jsx?|css|json|md))$/i);
        if (!filepath && pathLikeMatch) {
            filepath = pathLikeMatch[1].trim();
        }
        
        if (filepath) {
            // Remove the filepath line from content
            const content = lines.slice(1).join('\n').trim();
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
