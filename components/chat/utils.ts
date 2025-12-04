import type { ParsedBlock, FileData, DiffBlock } from "./types";

/**
 * Generate unique ID for messages
 */
export function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalize diff content before parsing
 * Fixes common AI malformations
 */
function normalizeDiffContent(content: string): string {
  let result = content;
  
  // Fix: code on same line as <<<<<<< SEARCH
  result = result.replace(/<<<<<<<?:?\s*SEARCH\s+(.+)/gi, '<<<<<<< SEARCH\n$1');
  
  // Fix: just "REPLACE" at end without >>>>>>>
  result = result.replace(/\n\s*REPLACE\s*$/gim, '\n>>>>>>> REPLACE');
  
  // Fix: new format markers -> convert to old format
  if (result.includes('[SEARCH_START]') && result.includes('[REPLACE_START]')) {
    result = result
      .replace(/\/\/\s*\[SEARCH_START\]/gi, '<<<<<<< SEARCH')
      .replace(/\/\/\s*\[SEARCH_END\]/gi, '=======')
      .replace(/\/\/\s*\[REPLACE_START\]/gi, '')
      .replace(/\/\/\s*\[REPLACE_END\]/gi, '>>>>>>> REPLACE');
  }
  
  return result;
}

/**
 * Parse SEARCH/REPLACE blocks from diff content
 * More flexible regex to handle variations in whitespace
 */
function parseDiffBlocks(content: string): DiffBlock[] {
  let blocks: DiffBlock[] = [];
  
  // Normalize first
  const normalizedContent = normalizeDiffContent(content);
  
  // Try multiple regex patterns to handle different AI output formats
  const patterns = [
    // Standard format: <<<<<<< SEARCH\n...\n=======\n...\n>>>>>>> REPLACE
    /<{7}\s*SEARCH\s*\n([\s\S]*?)\n={7}\n([\s\S]*?)\n>{7}\s*REPLACE/gi,
    // With optional colon
    /<{7}:?\s*SEARCH\s*\n([\s\S]*?)\n={7}\n([\s\S]*?)\n>{7}:?\s*REPLACE/gi,
    // More lenient whitespace
    /<{7}\s*SEARCH\s*\n([\s\S]*?)={7}\n?([\s\S]*?)>{7}\s*REPLACE/gi,
    // Handle possible extra < or > characters
    /<{3,}\s*:?\s*SEARCH\s*\n([\s\S]*?)={3,}\n?([\s\S]*?)>{3,}\s*:?\s*REPLACE/gi,
  ];
  
  for (const pattern of patterns) {
    // Reset lastIndex for each pattern
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(normalizedContent)) !== null) {
      const search = match[1];
      const replace = match[2];
      // Validate we got both parts
      if (search !== undefined && replace !== undefined) {
        blocks.push({ search, replace });
      }
    }
    if (blocks.length > 0) break; // Use first pattern that works
  }
  
  // If standard patterns failed, try malformed pattern parsing
  if (blocks.length === 0 && isDiffContent(normalizedContent)) {
    console.warn('[parseDiffBlocks] Standard patterns failed, trying malformed parser...');
    blocks = parseMalformedDiffBlocks(normalizedContent);
    
    if (blocks.length > 0) {
      console.log('[parseDiffBlocks] Malformed parser found', blocks.length, 'blocks');
    } else {
      // Last resort: try aggressive parsing
      blocks = parseAggressiveDiffBlocks(normalizedContent);
      if (blocks.length > 0) {
        console.log('[parseDiffBlocks] Aggressive parser found', blocks.length, 'blocks');
      } else {
        console.warn('[parseDiffBlocks] All parsers failed. Content sample:', normalizedContent.substring(0, 300));
      }
    }
  }
  
  return blocks;
}

/**
 * Even more aggressive diff block parsing for edge cases
 * This handles cases where the markers might have unusual formatting
 */
function parseAggressiveDiffBlocks(content: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  
  // Try to manually find and extract blocks
  // Split by the SEARCH marker first
  const searchSplit = content.split(/<<<+\s*:?\s*SEARCH\s*/i);
  
  for (let i = 1; i < searchSplit.length; i++) {
    const part = searchSplit[i];
    // Find the ======= separator
    const eqIndex = part.indexOf('=======');
    if (eqIndex === -1) {
      // Try parsing without ======= (malformed output)
      // Format: <<<<<<< SEARCH code...\nreplacement\nREPLACE
      const replaceOnlyMatch = part.match(/^([\s\S]*?)\n([\s\S]*?)>*\s*REPLACE/i);
      if (replaceOnlyMatch) {
        // The first capture is the search, second is replace
        // But this format is ambiguous, so we try to be smart
        const fullMatch = replaceOnlyMatch[0];
        const lines = fullMatch.split('\n');
        if (lines.length >= 2) {
          // Assume first line(s) are search, rest is replace
          const search = lines[0].trim();
          const replace = lines.slice(1).join('\n').replace(/>*\s*REPLACE\s*$/i, '').trim();
          if (search) {
            blocks.push({ search, replace });
          }
        }
      }
      continue;
    }
    
    const searchPart = part.substring(0, eqIndex);
    const afterEq = part.substring(eqIndex + 7); // Skip "======="
    
    // Find the REPLACE marker
    const replaceMatch = afterEq.match(/^([\s\S]*?)>+\s*:?\s*REPLACE/i);
    if (replaceMatch) {
      const search = searchPart.trim();
      const replace = replaceMatch[1].trim();
      if (search || replace !== undefined) { // Allow empty replace (deletion)
        blocks.push({ search, replace });
      }
    }
  }
  
  return blocks;
}

/**
 * Parse malformed diff blocks where content is on same line as marker
 * Handles various broken formats from AI output:
 * 1. "<<<<<<< SEARCH code...\nmore code\nREPLACE" (no ======= separator)
 * 2. "<<<<<<< SEARCH code on same line\nreplacement\nREPLACE"
 */
function parseMalformedDiffBlocks(content: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  
  // Try to find all sections between <<<<<<< SEARCH and REPLACE
  const sectionPattern = /<<<+\s*SEARCH\s*([\s\S]*?)\n\s*REPLACE/gi;
  
  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    const fullContent = match[1];
    
    if (!fullContent || !fullContent.trim()) continue;
    
    // Check if there's an ======= separator we missed
    const eqIndex = fullContent.indexOf('=======');
    if (eqIndex !== -1) {
      // Found separator - parse properly
      const search = fullContent.substring(0, eqIndex).trim();
      const replace = fullContent.substring(eqIndex + 7).replace(/^>+\s*/, '').trim();
      if (search) {
        blocks.push({ search, replace });
      }
      continue;
    }
    
    // No separator found - try heuristics
    const lines = fullContent.split('\n');
    
    // Heuristic 1: If first line looks like it has code on same line as SEARCH
    // and is different from the rest, treat first line as search
    if (lines.length >= 2) {
      const firstLine = lines[0].trim();
      const rest = lines.slice(1).join('\n').trim();
      
      // If first line looks like actual code and rest exists
      if (firstLine && rest && !firstLine.startsWith('//') && !firstLine.startsWith('/*')) {
        blocks.push({ search: firstLine, replace: rest });
        continue;
      }
    }
    
    // Heuristic 2: Try to find a logical split point
    // Look for imports, function declarations, etc. that might indicate a boundary
    const importMatch = fullContent.match(/([\s\S]*?import[^;]*;[\s\S]*?)\n\n([\s\S]+)/);
    if (importMatch) {
      blocks.push({ search: importMatch[1].trim(), replace: importMatch[2].trim() });
      continue;
    }
    
    // Heuristic 3: Split roughly in half if nothing else works
    if (lines.length >= 4) {
      const midpoint = Math.floor(lines.length / 2);
      const search = lines.slice(0, midpoint).join('\n').trim();
      const replace = lines.slice(midpoint).join('\n').trim();
      if (search && replace) {
        blocks.push({ search, replace });
        continue;
      }
    }
    
    // Last resort: treat entire content as search with empty replace (deletion)
    console.warn('[parseMalformedDiffBlocks] Could not determine search/replace boundary');
    blocks.push({ search: fullContent.trim(), replace: '' });
  }
  
  return blocks;
}
/**
 * Check if content contains diff markers
 */
function isDiffContent(content: string): boolean {
  // More flexible check for diff markers - handle various spacing
  const hasSearchMarker = /<{3,}\s*:?\s*SEARCH/i.test(content);
  // Also accept just "REPLACE" at end of line (malformed output)
  const hasReplaceMarker = />{3,}\s*:?\s*REPLACE/i.test(content) || /\n\s*REPLACE\s*$/im.test(content);
  // Also check for new format markers
  const hasNewSearchMarker = content.includes('[SEARCH_START]');
  const hasNewReplaceMarker = content.includes('[REPLACE_END]');
  return (hasSearchMarker && hasReplaceMarker) || (hasNewSearchMarker && hasNewReplaceMarker);
}

/**
 * Try to infer filename from diff content based on code patterns
 */
function inferFilenameFromContent(content: string): string {
  // Check for common patterns in the diff content
  
  // CSS file patterns
  if (content.includes('@import "tailwindcss"') || content.includes('@import "tw-animate-css"') || 
      content.includes(':root {') || content.includes('--background:') || content.includes('--foreground:')) {
    return 'app/globals.css';
  }
  
  // Layout patterns - check for Toaster, html/body tags, RootLayout
  if (content.includes('RootLayout') || (content.includes('<html') && content.includes('<body')) ||
      (content.includes('<Toaster') && content.includes('<body'))) {
    return 'app/layout.tsx';
  }
  
  // Page patterns  
  if (content.includes('export default function Home') || content.includes('export default function Page') ||
      content.includes('function HomePage') || content.includes('function Home(')) {
    return 'app/page.tsx';
  }
  
  // Detect toast import/usage - likely modifying a component that uses toast
  // Look for what component is being modified by checking function definitions
  if (content.includes('toast.success') || content.includes('toast.error') || content.includes("from 'react-hot-toast'")) {
    // Check what component this might be in
    const componentMatch = content.match(/(?:export\s+)?(?:default\s+)?function\s+([A-Z][a-zA-Z]+)/);
    if (componentMatch) {
      const name = componentMatch[1];
      if (name === 'RootLayout' || name === 'Layout') {
        return 'app/layout.tsx';
      }
      return `components/${name}.tsx`;
    }
    // Look for setTodos pattern (common in TodoList)
    if (content.includes('setTodos') || content.includes('todos.map') || content.includes('addTodo') || content.includes('deleteTodo')) {
      return 'components/TodoList.tsx';
    }
  }
  
  // Component definition patterns - look for "function ComponentName" or "const ComponentName"
  const componentDefMatch = content.match(/(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z]+)\s*[:(=<]/);
  if (componentDefMatch) {
    const name = componentDefMatch[1];
    // Skip common page names
    if (name === 'Home' || name === 'HomePage' || name === 'Page') {
      return 'app/page.tsx';
    }
    if (name === 'RootLayout' || name === 'Layout') {
      return 'app/layout.tsx';
    }
    return `components/${name}.tsx`;
  }
  
  // Common state patterns - infer component from state variable names
  if (content.includes('setTodos') || content.includes('[todos,') || content.includes('todos.filter') || content.includes('todos.map')) {
    return 'components/TodoList.tsx';
  }
  
  // Component usage patterns - look for <ComponentName in JSX
  // This helps when the diff only contains component usage, not definition
  const jsxComponentMatch = content.match(/<([A-Z][a-zA-Z]+)[\s\n>]/);
  if (jsxComponentMatch) {
    const usedComponent = jsxComponentMatch[1];
    // If the content is modifying how a component is used (like adding props),
    // the file is likely the PARENT component, not the used one
    // Look for other clues
    
    // Check if we're mapping over something to render this component
    const mapMatch = content.match(/(\w+)\.map\([^)]*\)\s*=>\s*[^<]*<([A-Z][a-zA-Z]+)/);
    if (mapMatch) {
      // This is a list component - the parent is likely "ComponentList" or similar
      const childComponent = mapMatch[2];
      // Common patterns: TodoItem -> TodoList, ArticleCard -> ArticleList
      if (childComponent.endsWith('Item')) {
        return `components/${childComponent.replace('Item', 'List')}.tsx`;
      }
      if (childComponent.endsWith('Card')) {
        return `components/${childComponent.replace('Card', 'List')}.tsx`;
      }
    }
  }
  
  // Hook patterns
  if (content.includes('export function use') || content.includes('export const use')) {
    const hookMatch = content.match(/export\s+(?:function|const)\s+(use\w+)/);
    if (hookMatch) {
      return `hooks/${hookMatch[1]}.ts`;
    }
  }
  
  // Hook usage patterns - if using a custom hook, might give hints
  const useHookMatch = content.match(/const\s+\{[^}]+\}\s*=\s*(use\w+)/);
  if (useHookMatch) {
    // Content uses a hook but doesn't define it - likely a component
  }
  
  // API route patterns
  if (content.includes('NextRequest') || content.includes('NextResponse')) {
    return 'app/api/route.ts';
  }
  
  return 'unknown';
}

/**
 * Check if content still contains raw diff markers (for debugging/safety)
 * Checks both old format (<<<<<<< SEARCH) and new format (// [SEARCH_START])
 */
export function containsRawDiffMarkers(content: string): boolean {
  // Old format
  const hasOldFormat = /<{3,}\s*(SEARCH|search)/i.test(content) || />{3,}\s*(REPLACE|replace)/i.test(content);
  // New format
  const hasNewFormat = content.includes('[SEARCH_START]') && content.includes('[REPLACE_END]');
  return hasOldFormat || hasNewFormat;
}

/**
 * Check if a file's content appears to be incomplete/truncated
 * This catches cases where the AI response was cut off mid-file
 */
export function isIncompleteFile(content: string): boolean {
  // Check for obvious truncation indicators
  if (content.endsWith('\n...') || content.endsWith('...')) return true;
  
  // Check for unclosed brackets/braces (simple heuristic)
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  
  // If significantly more opens than closes, likely truncated
  if (openBraces - closeBraces > 3 || openParens - closeParens > 3) {
    return true;
  }
  
  // Check for truncated JSX (ends with incomplete tag or attribute)
  if (/<[a-zA-Z][^>]*$/.test(content.trim())) return true;
  if (/className="[^"]*$/.test(content.trim())) return true;
  if (/class="[^"]*$/.test(content.trim())) return true;
  
  // Check if ends mid-string
  const lastLine = content.trim().split('\n').pop() || '';
  const quoteCount = (lastLine.match(/"/g) || []).length;
  const singleQuoteCount = (lastLine.match(/'/g) || []).length;
  const backtickCount = (lastLine.match(/`/g) || []).length;
  
  // Odd number of quotes suggests unclosed string
  if (quoteCount % 2 !== 0 || singleQuoteCount % 2 !== 0 || backtickCount % 2 !== 0) {
    return true;
  }
  
  return false;
}

/**
 * Extract file deletion commands from content
 * Format: <jersen_delete>path/to/file.tsx</jersen_delete>
 */
function extractFileDeletions(content: string): { deletedFiles: string[], cleanedContent: string } {
  const deletedFiles: string[] = [];
  const deleteRegex = /<jersen_delete>([^<]+)<\/jersen_delete>/gi;
  
  let match;
  while ((match = deleteRegex.exec(content)) !== null) {
    const filepath = match[1].trim();
    if (filepath) {
      deletedFiles.push(filepath);
    }
  }
  
  // Remove the delete tags from content for display
  const cleanedContent = content.replace(deleteRegex, '').trim();
  
  return { deletedFiles, cleanedContent };
}

/**
 * Extract install commands from content
 * Format: <jersen_install>package-name</jersen_install>
 */
function extractInstallCommands(content: string): { packages: string[], cleanedContent: string } {
  const packages: string[] = [];
  const installRegex = /<jersen_install>([^<]+)<\/jersen_install>/gi;
  
  let match;
  while ((match = installRegex.exec(content)) !== null) {
    const pkg = match[1].trim();
    if (pkg) {
      packages.push(pkg);
    }
  }
  
  // Remove the install tags from content for display
  const cleanedContent = content.replace(installRegex, '').trim();
  
  return { packages, cleanedContent };
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

  // First, extract file deletions
  const { deletedFiles, cleanedContent: afterDeletions } = extractFileDeletions(content);
  
  // Then extract install commands
  const { packages: installPackages, cleanedContent } = extractInstallCommands(afterDeletions);
  
  // Add install blocks for each package (or group them)
  if (installPackages.length > 0) {
    blocks.push({
      type: "install",
      content: `Installing: ${installPackages.join(', ')}`,
      packages: installPackages,
    });
  }
  
  // Add delete blocks and file entries for deletions
  for (const filepath of deletedFiles) {
    blocks.push({
      type: "delete",
      content: `Delete: ${filepath}`,
      filename: filepath,
      isDelete: true,
    });
    files.push({
      path: filepath,
      content: "",
      isDelete: true,
    });
  }

  // Pre-process: Handle "filepath: xxx\n\n```lang" pattern (filepath outside code block)
  // Convert to "```lang\nfilepath: xxx" pattern
  let processedContent = cleanedContent.replace(
    /filepath:\s*([^\n]+)\n\n```(\w+)?/gi,
    (_, filepath, lang) => `\`\`\`${lang || 'tsx'}\nfilepath: ${filepath.trim()}`
  );
  
  // Also handle single newline variant
  processedContent = processedContent.replace(
    /filepath:\s*([^\n]+)\n```(\w+)?/gi,
    (_, filepath, lang) => `\`\`\`${lang || 'tsx'}\nfilepath: ${filepath.trim()}`
  );

  // Pre-process: Wrap raw diff blocks (filepath + SEARCH/REPLACE not in code fence) in ```diff
  // This handles cases where AI outputs diff content without proper code fence
  processedContent = processedContent.replace(
    /(?:^|\n)(filepath:\s*[^\n]+)\n(<<<<<<<?:?\s*SEARCH[\s\S]*?(?:>>>>>>>?:?\s*REPLACE|(?:\n|\s)REPLACE\s*$))/gim,
    (_, filepath, diffContent) => `\n\`\`\`diff\n${filepath}\n${diffContent}\n\`\`\``
  );
  
  // Pre-process: Handle malformed diff where AI puts code on same line as <<<<<<< SEARCH
  // e.g., "<<<<<<< SEARCH import { X } from 'y';" -> split to separate lines
  processedContent = processedContent.replace(
    /<<<<<<<?:?\s*SEARCH\s+(.+)/gi,
    '<<<<<<< SEARCH\n$1'
  );
  
  // Pre-process: Add >>>>>>> REPLACE if just "REPLACE" appears at end
  processedContent = processedContent.replace(
    /\n\s*REPLACE\s*$/gim,
    '\n>>>>>>> REPLACE'
  );
  
  // Pre-process: Handle "diff\n\n<<<<<<< SEARCH" pattern (diff label without filepath)
  // This happens when AI doesn't include the filepath line
  processedContent = processedContent.replace(
    /\bdiff\s*\n+\s*(<<<<<<<?:?\s*SEARCH)/gi,
    '```diff\nfilepath: unknown\n$1'
  );
  
  // Pre-process: If we see raw diff content that starts with <<<<<<< SEARCH but isn't in a code fence,
  // try to wrap it. This catches orphan diff blocks.
  if (processedContent.includes('<<<<<<< SEARCH') && !processedContent.match(/```(?:diff)?\s*\n[^`]*<<<<<<< SEARCH/)) {
    // Find raw diff blocks and wrap them (handle both >>>>>>> REPLACE and just REPLACE)
    processedContent = processedContent.replace(
      /(?:^|\n)(?!```)([^\n]*?)(<<<<<<<?:?\s*SEARCH[\s\S]*?(?:>>>>>>>?:?\s*REPLACE|(?:\n|\s)REPLACE\s*))/gim,
      (match, prefix, diffContent) => {
        const trimmedPrefix = prefix.trim();
        // If prefix looks like a filepath
        if (trimmedPrefix.match(/^[\w\-\/\.]+\.(tsx?|jsx?|css|json|md)$/i)) {
          return `\n\`\`\`diff\nfilepath: ${trimmedPrefix}\n${diffContent}\n\`\`\``;
        }
        return `\n\`\`\`diff\nfilepath: unknown\n${diffContent}\n\`\`\``;
      }
    );
  }

  // Match all COMPLETE code blocks with their language
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  // Also check for incomplete code block at the end (streaming)
  const incompleteBlockMatch = processedContent.match(/```(\w+)?\n([\s\S]*)$/);
  const hasIncompleteBlock = incompleteBlockMatch && !processedContent.endsWith('```');

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(processedContent)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      let textContent = processedContent.slice(lastIndex, match.index).trim();
      // Remove standalone "filepath: xxx" lines that we couldn't match
      textContent = textContent.replace(/^filepath:\s*[^\n]+$/gim, '').trim();
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
        // Has diff markers but regex didn't parse - this is an ERROR case
        // Still push as diff block, just with empty diffBlocks (will need original content to apply)
        console.warn(`[chat/utils] Diff markers detected but failed to parse for ${filepath}. Content: ${restContent.substring(0, 200)}`);
        
        // Try a more aggressive parsing approach
        const aggressiveDiffBlocks = parseAggressiveDiffBlocks(restContent);
        
        if (aggressiveDiffBlocks.length > 0) {
          blocks.push({
            type: "diff",
            content: restContent,
            language: "diff",
            filename: filepath,
            diffBlocks: aggressiveDiffBlocks,
            isFullFile: false,
          });
          
          files.push({
            path: filepath,
            content: restContent,
            isEdit: true,
            diffBlocks: aggressiveDiffBlocks,
          });
        } else {
          // Last resort: Push as text block, not file - don't sync broken diff to sandbox
          blocks.push({
            type: "text",
            content: `⚠️ Edit block for ${filepath} could not be parsed:\n\`\`\`diff\n${restContent}\n\`\`\``,
          });
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
  if (lastIndex < processedContent.length) {
    let textContent = processedContent.slice(lastIndex).trim();
    // Remove standalone "filepath: xxx" lines
    textContent = textContent.replace(/^filepath:\s*[^\n]+$/gim, '').trim();
    
    // If there's an incomplete code block at the end (during streaming),
    // show it as a "streaming" code block instead of text
    if (hasIncompleteBlock && incompleteBlockMatch) {
      const incompleteStart = processedContent.lastIndexOf('```');
      textContent = processedContent.slice(lastIndex, incompleteStart).trim();
      textContent = textContent.replace(/^filepath:\s*[^\n]+$/gim, '').trim();
      
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
  if (blocks.length === 0 && processedContent.trim()) {
    blocks.push({ type: "text", content: processedContent.trim() });
  }

  // Deduplicate file blocks with the same filename
  // Keep only the last occurrence (most complete version)
  const seenFiles = new Map<string, number>();
  const indicesToRemove = new Set<number>();
  
  blocks.forEach((block, index) => {
    if ((block.type === "file" || block.type === "diff") && block.filename) {
      const prevIndex = seenFiles.get(block.filename);
      if (prevIndex !== undefined) {
        // Mark the previous (older) one for removal
        indicesToRemove.add(prevIndex);
      }
      seenFiles.set(block.filename, index);
    }
  });
  
  const deduplicatedBlocks = blocks.filter((_, index) => !indicesToRemove.has(index));
  
  // Post-process: Convert text blocks that contain raw diff markers into diff blocks
  // This catches cases where the pre-processing didn't wrap diffs properly
  const postProcessedBlocks: ParsedBlock[] = [];
  for (const block of deduplicatedBlocks) {
    if (block.type === "text" && isDiffContent(block.content)) {
      // This text block contains raw diff - try to parse it
      console.warn('[parseAIResponse] Text block contains raw diff markers, attempting to parse...');
      const normalizedContent = normalizeDiffContent(block.content);
      const diffBlocks = parseDiffBlocks(normalizedContent);
      
      if (diffBlocks.length > 0) {
        // Try to infer filename from the diff content
        const inferredFilename = inferFilenameFromContent(block.content);
        
        // Successfully parsed - push as diff block
        postProcessedBlocks.push({
          type: "diff",
          content: block.content,
          language: "diff",
          filename: inferredFilename,
          diffBlocks,
          isFullFile: false,
        });
        
        // Also add to files array for syncing (if valid filename)
        if (inferredFilename !== 'unknown') {
          files.push({
            path: inferredFilename,
            content: block.content,
            isEdit: true,
            diffBlocks,
          });
        }
      } else {
        // Still couldn't parse - keep as text but format nicely
        postProcessedBlocks.push({
          type: "code",
          content: block.content,
          language: "diff",
        });
      }
    } else if ((block.type === "diff" || block.type === "file") && block.filename === "unknown") {
      // Try to infer filename for blocks that couldn't determine it earlier
      const inferredFilename = inferFilenameFromContent(block.content);
      postProcessedBlocks.push({
        ...block,
        filename: inferredFilename,
      });
      
      // Update files array too if we found a better filename
      if (inferredFilename !== 'unknown' && block.diffBlocks) {
        files.push({
          path: inferredFilename,
          content: block.content,
          isEdit: true,
          diffBlocks: block.diffBlocks,
        });
      }
    } else {
      postProcessedBlocks.push(block);
    }
  }

  // Deduplicate files array - merge diff blocks for same file
  const uniqueFiles = new Map<string, FileData>();
  for (const file of files) {
    const existing = uniqueFiles.get(file.path);
    if (existing) {
      // If both are edits with diff blocks, merge them
      if (existing.isEdit && file.isEdit && existing.diffBlocks && file.diffBlocks) {
        existing.diffBlocks = [...existing.diffBlocks, ...file.diffBlocks];
        existing.content = existing.content + '\n' + file.content;
      } else {
        // Otherwise newer file overwrites
        uniqueFiles.set(file.path, file);
      }
    } else {
      uniqueFiles.set(file.path, file);
    }
  }
  
  // Filter out config files that shouldn't be generated
  // NOTE: app/layout.tsx is NOT filtered - it's essential and AI should generate it
  const configFilesToIgnore = new Set([
    'tailwind.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'postcss.config.mjs',
    'next.config.ts',
    'next.config.js',
    'next.config.mjs',
    'tsconfig.json',
    'package.json',
  ]);
  
  const filteredFiles = Array.from(uniqueFiles.values()).filter(
    file => !configFilesToIgnore.has(file.path)
  );
  
  // Also filter blocks
  const filteredBlocks = postProcessedBlocks.filter(block => {
    if ((block.type === "file" || block.type === "diff") && block.filename) {
      return !configFilesToIgnore.has(block.filename);
    }
    return true;
  });

  return { blocks: filteredBlocks, files: filteredFiles };
}
