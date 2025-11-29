export interface ParsedFile {
    path: string;
    content: string;
}

/**
 * Parse AI response to extract generated files
 * Expected format: ```filepath:path/to/file.tsx
 */
export function parseGeneratedFiles(aiResponse: string): ParsedFile[] {
    const files: ParsedFile[] = [];

    // Match code blocks with filepath
    const fileBlockRegex = /```filepath:([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileBlockRegex.exec(aiResponse)) !== null) {
        const path = match[1].trim();
        const content = match[2].trim();

        files.push({ path, content });
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
