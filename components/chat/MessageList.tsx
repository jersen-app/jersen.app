"use client";

import { useRef, useEffect } from "react";
import type { Message, ParsedBlock, ToolCall } from "./types";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { FileBlock } from "./FileBlock";
import { CodeBlock } from "./CodeBlock";
import { MarkdownContent } from "./MarkdownContent";
import { ToolIndicator } from "./ToolIndicator";
import { Trash2 } from "lucide-react";
import Image from "next/image";

import { InstallBlock } from "./InstallBlock";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  streamingBlocks: ParsedBlock[] | null;
  activeToolCalls?: ToolCall[];
}

// Component to render delete file blocks
function DeleteBlock({ block }: { block: ParsedBlock }) {
  return (
    <div className="my-2 rounded-lg border border-red-500/30 bg-red-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1.5 bg-red-500/10">
        <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-xs font-medium text-red-700 dark:text-red-300">
          Deleted: {block.filename}
        </span>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  streamingContent,
  streamingBlocks,
  activeToolCalls = [],
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Track if user has scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Consider "near bottom" if within 100px
      userScrolledUp.current = distanceFromBottom > 100;
    }
  };

  // Auto scroll to bottom only if user hasn't scrolled up
  useEffect(() => {
    if (scrollRef.current && !userScrolledUp.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Reset scroll tracking when new message starts
  useEffect(() => {
    if (isLoading && !streamingContent) {
      userScrolledUp.current = false;
    }
  }, [isLoading, streamingContent]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4">
      <div className="py-4 space-y-2">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}

        {/* Streaming content */}
        {isLoading && streamingContent && streamingBlocks && (
          <div className="flex gap-3 py-3">
            <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center">
              <Image src="/logo.png" alt="Jersen AI" width={56} height={56} className="dark:invert" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Jersen AI
              </span>
              
              {/* Show active tool calls */}
              {activeToolCalls.length > 0 && (
                <ToolIndicator toolCalls={activeToolCalls} className="mb-2" />
              )}
              
              <div className="space-y-2">
                {streamingBlocks.map((block, idx) => {
                  if (block.type === "delete") {
                    return <DeleteBlock key={idx} block={block} />;
                  }
                  if (block.type === "install") {
                    return <InstallBlock key={idx} block={block} />;
                  }
                  if (block.type === "file" || block.type === "diff") {
                    return (
                      <FileBlock key={idx} block={block} />
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

        {/* Loading indicator when no streaming content yet - also show tool calls */}
        {isLoading && !streamingContent && (
          <div className="flex gap-3 py-3">
            <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center">
              <Image src="/logo.png" alt="Jersen AI" width={56} height={56} className="dark:invert" />
            </div>
            <div className="flex-1 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                Jersen AI
              </span>
              {activeToolCalls.length > 0 ? (
                <ToolIndicator toolCalls={activeToolCalls} />
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
