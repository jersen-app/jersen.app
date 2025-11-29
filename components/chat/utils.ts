import type { ParsedBlock, FileData, DiffBlock } from "./types";

/**
 * Generate unique ID for messages
 */
export function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse SEARCH/REPLACE blocks from diff content
 */
function parseDiffBlocks(content: string): DiffBlock[] {
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
 * Check if content contains diff markers
 */
function isDiffContent(content: string): boolean {
  return content.includes('<<<<<<< SEARCH') && content.includes('>>>>>>> REPLACE');
}

/**
 * Parse AI response into blocks (text, code, files, diffs)
 */
export function parseAIResponse(content: string): {
  blocks: ParsedBlock[];
  files: FileData[];
} {
  const blocks: ParsedBlock[] = [];
  const files: FileData[] = [];

  // Match all COMPLETE code blocks with their language
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  // Also check for incomplete code block at the end (streaming)
  const incompleteBlockMatch = content.match(/```(\w+)?\n([\s\S]*)$/);
  const hasIncompleteBlock = incompleteBlockMatch && !content.endsWith('```');

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

    // Get the rest of the content after filepath line
    const restContent = lines.slice(codeStartIndex).join("\n");
    
    // Check if this is a diff block
    if (filepath && (language === "diff" || isDiffContent(restContent))) {
      const diffBlocks = parseDiffBlocks(restContent);
      
      if (diffBlocks.length > 0) {
        // This is a diff/edit block
        blocks.push({
          type: "diff",
          content: restContent,
          language: "diff",
          filename: filepath,
          diffBlocks,
          isFullFile: false,
        });
        
        files.push({
          path: filepath,
          content: restContent,
          isEdit: true,
          diffBlocks,
        });
      } else {
        // Has filepath but no valid diff blocks - treat as full file
        const codeContent = restContent.trim();
        if (codeContent) {
          blocks.push({
            type: "file",
            content: codeContent,
            language: language === "diff" ? "tsx" : language,
            filename: filepath,
            isFullFile: true,
          });
          files.push({ path: filepath, content: codeContent, isEdit: false });
        }
      }
    } else if (filepath) {
      // Regular file block (full file)
      const codeContent = restContent.trim();
      if (codeContent) {
        blocks.push({
          type: "file",
          content: codeContent,
          language: language === "typescript" ? "tsx" : language,
          filename: filepath,
          isFullFile: true,
        });
        files.push({ path: filepath, content: codeContent, isEdit: false });
      }
    } else {
      // Try to infer filepath from content
      let inferredPath: string | null = null;
      
      if (language === "tsx" || language === "typescript" || language === "ts") {
        const componentMatch = blockContent.match(/export\s+default\s+function\s+(\w+)/);
        if (componentMatch) {
          const name = componentMatch[1];
          if (name === "RootLayout" || name === "Layout") {
            inferredPath = "app/layout.tsx";
          } else if (name === "Page" || name === "Home" || name === "HomePage") {
            inferredPath = "app/page.tsx";
          } else {
            inferredPath = `components/${name}.tsx`;
          }
        }
      }
      
      const codeContent = blockContent.trim();
      if (inferredPath && codeContent) {
        blocks.push({
          type: "file",
          content: codeContent,
          language: language === "typescript" ? "tsx" : language,
          filename: inferredPath,
          isFullFile: true,
        });
        files.push({ path: inferredPath, content: codeContent, isEdit: false });
      } else if (codeContent) {
        // Regular code block
        blocks.push({
          type: "code",
          content: codeContent,
          language,
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    let textContent = content.slice(lastIndex).trim();
    
    // If there's an incomplete code block at the end (during streaming),
    // show it as a "streaming" code block instead of text
    if (hasIncompleteBlock && incompleteBlockMatch) {
      const incompleteStart = content.lastIndexOf('```');
      textContent = content.slice(lastIndex, incompleteStart).trim();
      
      if (textContent) {
        blocks.push({ type: "text", content: textContent });
      }
      
      // Parse the incomplete block
      const language = incompleteBlockMatch[1] || "plaintext";
      const blockContent = incompleteBlockMatch[2] || "";
      const lines = blockContent.split("\n");
      const firstLine = lines[0]?.trim() || "";
      
      // Check for filepath
      const filepathMatch = firstLine.match(/^filepath:\s*(.+)$/i);
      if (filepathMatch) {
        const filepath = filepathMatch[1].trim();
        const restContent = lines.slice(1).join("\n");
        blocks.push({
          type: "file",
          content: restContent + "\n...", // Show it's still streaming
          language: language === "diff" ? "tsx" : language,
          filename: filepath,
          isFullFile: true,
        });
      } else if (blockContent.trim()) {
        // Regular code block still streaming
        blocks.push({
          type: "code",
          content: blockContent + "\n...",
          language,
        });
      }
    } else if (textContent) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no blocks were parsed, treat the whole thing as text
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: "text", content: content.trim() });
  }

  return { blocks, files };
}
