"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileCode,
  ChevronDown,
  ChevronRight,
  Brain,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ParsedBlock {
  type: "text" | "code" | "thinking";
  content: string;
  language?: string;
  filename?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsedBlocks?: ParsedBlock[];
  files?: { path: string; content: string }[];
  timestamp?: Date;
}

interface ChatInterfaceProps {
  projectId: string;
  onFilesGenerated?: (files: { path: string; content: string }[]) => void;
}

// Generate unique ID
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Parse AI response into blocks
function parseAIResponse(content: string): {
  blocks: ParsedBlock[];
  files: { path: string; content: string }[];
} {
  const blocks: ParsedBlock[] = [];
  const files: { path: string; content: string }[] = [];

  // Regex to match code blocks with optional language and filepath
  const codeBlockRegex = /```(\w+)?\n?(filepath:\s*([^\n]+)\n)?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        // Check for thinking patterns
        if (
          textContent.toLowerCase().includes("let me think") ||
          textContent.toLowerCase().includes("i'll analyze") ||
          textContent.toLowerCase().includes("considering")
        ) {
          blocks.push({ type: "thinking", content: textContent });
        } else {
          blocks.push({ type: "text", content: textContent });
        }
      }
    }

    const language = match[1] || "plaintext";
    const filepath = match[3]?.trim();
    const code = match[4]?.trim() || "";

    blocks.push({
      type: "code",
      content: code,
      language,
      filename: filepath,
    });

    // Collect files
    if (filepath) {
      files.push({ path: filepath, content: code });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
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

// Code Block Component
function CodeBlock({
  block,
  onAddFile,
}: {
  block: ParsedBlock;
  onAddFile?: (file: { path: string; content: string }) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFile = () => {
    if (block.filename && onAddFile) {
      onAddFile({ path: block.filename, content: block.content });
    }
  };

  return (
    <div className="my-2 rounded-md border border-border/50 bg-muted/30 overflow-hidden text-left">
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
          {block.filename ? (
            <span className="text-xs font-medium truncate">
              {block.filename}
            </span>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {block.language}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          {block.filename && onAddFile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px]"
              onClick={(e) => {
                e.stopPropagation();
                handleAddFile();
              }}
            >
              Add
            </Button>
          )}
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Code Content */}
      {isExpanded && (
        <div className="relative max-h-[300px] overflow-auto">
          <pre className="p-2 text-xs bg-zinc-950 text-zinc-100">
            <code className={`language-${block.language}`}>{block.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

// Thinking Block Component
function ThinkingBlock({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 rounded-md border border-amber-500/30 bg-amber-500/5 overflow-hidden text-left">
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-amber-500/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Brain className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Reasoning
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-amber-500/60" />
        ) : (
          <ChevronRight className="h-3 w-3 text-amber-500/60" />
        )}
      </div>
      {isExpanded && (
        <div className="px-2 pb-2 text-xs text-muted-foreground">
          {content}
        </div>
      )}
    </div>
  );
}

// Message Component
function MessageBubble({
  message,
  onAddFile,
}: {
  message: Message;
  onAddFile?: (file: { path: string; content: string }) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2 py-2", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 space-y-0.5", isUser && "flex flex-col items-end")}>
        <span className="text-[10px] font-medium text-muted-foreground">
          {isUser ? "You" : "Jersen AI"}
        </span>
        <div
          className={cn(
            "text-sm leading-relaxed",
            isUser && "text-right"
          )}
        >
          {message.parsedBlocks && message.parsedBlocks.length > 0 ? (
            message.parsedBlocks.map((block, idx) => {
              if (block.type === "code") {
                return <CodeBlock key={idx} block={block} onAddFile={onAddFile} />;
              }
              if (block.type === "thinking") {
                return <ThinkingBlock key={idx} content={block.content} />;
              }
              return (
                <p key={idx} className="whitespace-pre-wrap text-sm">
                  {block.content}
                </p>
              );
            })
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {message.content || "..."}
            </p>
          )}
        </div>

        {/* Files generated indicator */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.files.map((file, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[10px] py-0 px-1.5 flex items-center gap-0.5"
              >
                <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                {file.path.split('/').pop()}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Streaming indicator
function StreamingIndicator() {
  return (
    <div className="flex gap-2 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 space-y-0.5">
        <span className="text-[10px] font-medium text-muted-foreground">
          Jersen AI
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Generating...</span>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function ChatInterface({
  projectId,
  onFilesGenerated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/chat`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            const loadedMessages = data.messages.map(
              (msg: { role: string; content: string; _id?: string }) => {
                const { blocks, files } = parseAIResponse(msg.content || "");
                return {
                  id: msg._id || generateId(),
                  role: msg.role as "user" | "assistant",
                  content: msg.content || "",
                  parsedBlocks: blocks,
                  files: msg.role === "assistant" ? files : undefined,
                };
              }
            );
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };
    loadHistory();
  }, [projectId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Handle file addition to editor
  const handleAddFile = useCallback(
    (file: { path: string; content: string }) => {
      if (onFilesGenerated) {
        onFilesGenerated([file]);
      }
    },
    [onFilesGenerated]
  );

  // Send message
  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // Parse the final content
      const { blocks, files } = parseAIResponse(fullContent);

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: fullContent,
        parsedBlocks: blocks,
        files,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");

      // Notify parent about generated files in real-time
      if (files.length > 0 && onFilesGenerated) {
        onFilesGenerated(files);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          parsedBlocks: [
            {
              type: "text",
              content: "Sorry, I encountered an error. Please try again.",
            },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Parse streaming content for preview
  const streamingParsed = streamingContent
    ? parseAIResponse(streamingContent)
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages - scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-3">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">Jersen AI</h3>
            <p className="text-xs text-muted-foreground max-w-[250px]">
              Describe what you want to build and I'll generate the code for you.
            </p>
          </div>
        ) : (
          <div className="py-3 space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onAddFile={handleAddFile}
              />
            ))}

            {/* Streaming content */}
            {isLoading && streamingContent && (
              <div className="flex gap-2 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Jersen AI
                  </span>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {streamingParsed?.blocks.map((block, idx) => {
                      if (block.type === "code") {
                        return (
                          <CodeBlock
                            key={idx}
                            block={block}
                            onAddFile={handleAddFile}
                          />
                        );
                      }
                      if (block.type === "thinking") {
                        return (
                          <ThinkingBlock key={idx} content={block.content} />
                        );
                      }
                      return (
                        <p
                          key={idx}
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                        >
                          {block.content}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator when no streaming content yet */}
            {isLoading && !streamingContent && <StreamingIndicator />}
          </div>
        )}
      </div>

      {/* Input - fixed at bottom */}
      <div className="shrink-0 border-t p-3 bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to build?"
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
