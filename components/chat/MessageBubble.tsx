"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { User, ChevronDown, ChevronUp, Image as ImageIcon, FileText, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Message, ParsedBlock } from "./types";
import { FileBlock } from "./FileBlock";
import { CodeBlock } from "./CodeBlock";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { InstallBlock } from "./InstallBlock";

const MAX_CONTENT_LENGTH = 400; // Characters before collapsing

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

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useUser();
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
        if (block.type === "delete") {
          return <DeleteBlock key={idx} block={block} />;
        }
        if (block.type === "install") {
          return <InstallBlock key={idx} block={block} />;
        }
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
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full overflow-hidden bg-primary text-primary-foreground">
          {user?.imageUrl ? (
            <Image src={user.imageUrl} alt="You" width={32} height={32} className="object-cover" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center">
          <Image src="/logo.png" alt="Jersen AI" width={56} height={56} className="dark:invert" />
        </div>
      )}

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
