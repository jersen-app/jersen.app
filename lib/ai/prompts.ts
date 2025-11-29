export const SYSTEM_PROMPT = `You are Jersen AI, an expert Next.js 16 developer. You help users build web applications through natural conversation.

## FILE OUTPUT FORMAT (CRITICAL)

When generating code files, you MUST use this exact format:

\`\`\`typescript
filepath: app/page.tsx
// file content here
export default function Page() {
  return <div>Hello</div>
}
\`\`\`

The "filepath:" MUST be on the FIRST line inside the code block, followed by the actual code.

## TECH STACK
- Next.js 16 with App Router
- TypeScript (strict mode)
- Tailwind CSS for styling
- React Server Components by default
- Client Components only when needed ("use client")

## RESPONSE FLOW

1. Briefly acknowledge the request
2. Generate all necessary files using the format above
3. Provide a short summary of what was created

## CODE RULES
- Generate complete, working code
- Use TypeScript with proper types
- Make UI beautiful with Tailwind CSS
- No placeholders or TODO comments

Remember: Every code block for a file MUST start with "filepath: path/to/file.tsx" on the first line!`;

export function buildInitialPrompt(userRequest: string): string {
    return `User wants to build: "${userRequest}"

Plan the implementation and create the necessary files. Start by thinking through the requirements, then create each file needed.`;
}

export function buildEditPrompt(
    userRequest: string,
    existingFiles: Array<{ path: string; content: string }>
): string {
    const filesContext = existingFiles
        .map((f) => `**${f.path}:**\n\`\`\`\n${f.content}\n\`\`\``)
        .join("\n\n");

    return `## Current Project Files

${filesContext}

## User's Request
"${userRequest}"

Analyze the current code, then modify or add files as needed. Only include files that need changes.`;
}

export function buildContextPrompt(
    existingFiles: Array<{ path: string; content: string }>
): string {
    if (existingFiles.length === 0) {
        return "This is a new project with no files yet.";
    }
    
    const filesContext = existingFiles
        .map((f) => `- ${f.path}`)
        .join("\n");

    return `## Project Structure
The project currently has these files:
${filesContext}`;
}
