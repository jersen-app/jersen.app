"use client";

import { useState, useMemo } from "react";
import { Bot, User, ChevronDown, ChevronUp, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "./types";
import { FileBlock } from "./FileBlock";
import { CodeBlock } from "./CodeBlock";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const MAX_CONTENT_LENGTH = 500; // Characters before collapsing

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if message should be collapsible (long user messages)
  const shouldCollapse = useMemo(() => {
    if (!isUser) return false;
    return message.content.length > MAX_CONTENT_LENGTH;
  }, [isUser, message.content]);

  const truncatedContent = useMemo(() => {
    if (!shouldCollapse) return message.content;
    return message.content.slice(0, MAX_CONTENT_LENGTH) + "...";
  }, [shouldCollapse, message.content]);

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {message.attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative group rounded-lg overflow-hidden border bg-muted/50"
          >
            {attachment.type === "image" ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-[200px] max-h-[150px] object-cover"
              />
            ) : (
              <div className="flex items-center gap-2 p-3">
                <FileText className="h-8 w-8 text-red-500" />
                <div className="text-xs">
                  <p className="font-medium truncate max-w-[120px]">{attachment.name}</p>
                  <p className="text-muted-foreground">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (message.parsedBlocks && message.parsedBlocks.length > 0) {
      return message.parsedBlocks.map((block, idx) => {
        if (block.type === "file" || block.type === "diff") {
          // File blocks are collapsed by default
          return <FileBlock key={idx} block={block} defaultCollapsed={true} />;
        }
        if (block.type === "code") {
          return <CodeBlock key={idx} block={block} />;
        }
        return <MarkdownContent key={idx} content={block.content} />;
      });
    }
    return <MarkdownContent content={message.content || "..."} />;
  };

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
          {shouldCollapse ? (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <div className="space-y-2">
                {isExpanded ? (
                  <CollapsibleContent forceMount>
                    <MarkdownContent content={message.content} />
                    {renderAttachments()}
                  </CollapsibleContent>
                ) : (
                  <>
                    <MarkdownContent content={truncatedContent} />
                    {renderAttachments()}
                  </>
                )}
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more ({message.content.length} characters)
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </Collapsible>
          ) : (
            <>
              {renderContent()}
              {renderAttachments()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
