"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, FileData } from "./types";
import { FileBlock } from "./FileBlock";
import { CodeBlock } from "./CodeBlock";
import { MarkdownContent } from "./MarkdownContent";

interface MessageBubbleProps {
  message: Message;
  onAddFile?: (file: FileData) => void;
}

export function MessageBubble({ message, onAddFile }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 py-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0 space-y-1",
          isUser && "flex flex-col items-end"
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Jersen AI"}
        </span>

        <div className={cn("space-y-2", isUser && "text-right")}>
          {message.parsedBlocks && message.parsedBlocks.length > 0 ? (
            message.parsedBlocks.map((block, idx) => {
              if (block.type === "file") {
                return (
                  <FileBlock key={idx} block={block} onAddFile={onAddFile} />
                );
              }
              if (block.type === "code") {
                return <CodeBlock key={idx} block={block} />;
              }
              // Text block - render with markdown
              return <MarkdownContent key={idx} content={block.content} />;
            })
          ) : (
            <MarkdownContent content={message.content || "..."} />
          )}
        </div>
      </div>
    </div>
  );
}
