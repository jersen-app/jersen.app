"use client";

import { useRef, useEffect } from "react";
import type { Message, FileData, ParsedBlock } from "./types";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { FileBlock } from "./FileBlock";
import { CodeBlock } from "./CodeBlock";
import { MarkdownContent } from "./MarkdownContent";
import { Bot } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  streamingBlocks: ParsedBlock[] | null;
  onAddFile?: (file: FileData) => void;
}

export function MessageList({
  messages,
  isLoading,
  streamingContent,
  streamingBlocks,
  onAddFile,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
      <div className="py-4 space-y-2">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAddFile={onAddFile}
          />
        ))}

        {/* Streaming content */}
        {isLoading && streamingContent && streamingBlocks && (
          <div className="flex gap-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Jersen AI
              </span>
              <div className="space-y-2">
                {streamingBlocks.map((block, idx) => {
                  if (block.type === "file") {
                    return (
                      <FileBlock key={idx} block={block} onAddFile={onAddFile} />
                    );
                  }
                  if (block.type === "code") {
                    return <CodeBlock key={idx} block={block} />;
                  }
                  return <MarkdownContent key={idx} content={block.content} />;
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator when no streaming content yet */}
        {isLoading && !streamingContent && <StreamingIndicator />}
      </div>
    </div>
  );
}
