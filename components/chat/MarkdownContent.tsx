"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-1 prose-p:leading-relaxed",
        "prose-ul:my-1 prose-ol:my-1",
        "prose-li:my-0.5",
        "prose-headings:my-2 prose-headings:font-semibold",
        "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
        "prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-zinc-950 prose-pre:text-zinc-100",
        "prose-strong:font-semibold",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override code blocks to prevent double rendering
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="text-xs bg-muted px-1 py-0.5 rounded font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            // Block code - just return the content, we handle blocks separately
            return <code {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
