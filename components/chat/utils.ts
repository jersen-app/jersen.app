import type { ParsedBlock, FileData } from "./types";

/**
 * Generate unique ID for messages
 */
export function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse AI response into blocks (text, code, files)
 */
export function parseAIResponse(content: string): {
  blocks: ParsedBlock[];
  files: FileData[];
} {
  const blocks: ParsedBlock[] = [];
  const files: FileData[] = [];

  // Match all code blocks with their language
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    const language = match[1] || "plaintext";
    const blockContent = match[2] || "";
    const lines = blockContent.split("\n");
    const firstLine = lines[0]?.trim() || "";
    const secondLine = lines[1]?.trim() || "";

    // Skip empty or tool-related blocks
    if (
      language === "json" ||
      language === "tool_code" ||
      blockContent.trim().startsWith('{"') ||
      blockContent.trim().startsWith('[{')
    ) {
      // Skip JSON/tool blocks entirely
      lastIndex = match.index + match[0].length;
      continue;
    }

    // Try to extract filepath from first line
    let filepath: string | null = null;
    let codeStartIndex = 0;

    // Pattern 1: "filepath: path/to/file.tsx"
    const filepathMatch = firstLine.match(/^filepath:\s*(.+)$/i);
    if (filepathMatch) {
      filepath = filepathMatch[1].trim();
      codeStartIndex = 1;
    }

    // Pattern 2: "// filepath: path/to/file.tsx"
    const commentMatch = firstLine.match(/^\/\/\s*filepath:\s*(.+)$/i);
    if (!filepath && commentMatch) {
      filepath = commentMatch[1].trim();
      codeStartIndex = 1;
    }

    // Pattern 3: Check second line for filepath (if first line is empty)
    if (!filepath && !firstLine && secondLine) {
      const secondFilepathMatch = secondLine.match(/^filepath:\s*(.+)$/i);
      if (secondFilepathMatch) {
        filepath = secondFilepathMatch[1].trim();
        codeStartIndex = 2;
      }
    }

    // Pattern 4: First line is just a path like "app/page.tsx"
    const pathMatch = firstLine.match(
      /^([a-zA-Z0-9_\-\/\.]+\.(tsx?|jsx?|css|json|md|html))$/i
    );
    if (!filepath && pathMatch) {
      filepath = pathMatch[1].trim();
      codeStartIndex = 1;
    }

    // Pattern 5: Language hints a file type (tsx, ts, css) - try to infer from content
    if (!filepath && (language === "tsx" || language === "typescript" || language === "ts")) {
      // Look for export default function ComponentName pattern
      const componentMatch = blockContent.match(/export\s+default\s+function\s+(\w+)/);
      if (componentMatch) {
        const name = componentMatch[1];
        // Try to guess the path
        if (name === "RootLayout" || name === "Layout") {
          filepath = "app/layout.tsx";
        } else if (name === "Page" || name === "Home" || name === "HomePage") {
          filepath = "app/page.tsx";
        } else {
          filepath = `components/${name}.tsx`;
        }
      }
    }

    // Get the actual code content
    const codeContent = lines.slice(codeStartIndex).join("\n").trim();

    if (filepath && codeContent) {
      // This is a file block
      blocks.push({
        type: "file",
        content: codeContent,
        language: language === "typescript" ? "tsx" : language,
        filename: filepath,
      });
      files.push({ path: filepath, content: codeContent });
    } else if (codeContent) {
      // Regular code block (only if has content)
      blocks.push({
        type: "code",
        content: codeContent || blockContent.trim(),
        language,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no blocks were parsed, treat the whole thing as text
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: "text", content: content.trim() });
  }

  return { blocks, files };
}
