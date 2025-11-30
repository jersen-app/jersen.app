"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquarePlus, Trash2, Loader2, AlertCircle, Brain, Sparkles } from "lucide-react";
import type { Message, FileData, ParsedBlock, Attachment } from "./types";
import { generateId, parseAIResponse } from "./utils";
import { applyDiffBlocks } from "@/lib/ai/diff";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CreditDisplay from "@/components/CreditDisplay";

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface ChatInterfaceProps {
  projectId: string;
  onFilesGenerated?: (files: FileData[]) => void;
  existingFiles?: { path: string; content: string }[];
  onNewChat?: () => void;
}

export function ChatInterface({
  projectId,
  onFilesGenerated,
  existingFiles = [],
  onNewChat,
}: ChatInterfaceProps) {
  // Keep a ref to existing files so we can apply diffs
  const filesRef = useRef<Map<string, string>>(new Map());
  
  // Update files ref when existingFiles changes
  useEffect(() => {
    existingFiles.forEach(file => {
      filesRef.current.set(file.path, file.content);
    });
  }, [existingFiles]);

  /**
   * Process files - apply diffs to existing files or use new content
   */
  const processFiles = useCallback((rawFiles: FileData[]): FileData[] => {
    return rawFiles.map(file => {
      // If it's a full file (not an edit), return as-is
      if (!file.isEdit || !file.diffBlocks || file.diffBlocks.length === 0) {
        // Update our ref with this new file content
        filesRef.current.set(file.path, file.content);
        return file;
      }
      
      // It's a diff - we need to apply it to the existing file
      const existingContent = filesRef.current.get(file.path);
      
      if (!existingContent) {
        // No existing file - this is an error in the AI output, but we can't apply a diff
        console.warn(`Cannot apply diff to ${file.path} - file does not exist`);
        return file;
      }
      
      // Apply the diff blocks
      const result = applyDiffBlocks(existingContent, file.diffBlocks);
      
      if (!result.success) {
        console.warn(`Failed to apply some diff blocks to ${file.path}:`, result.failedBlocks);
      }
      
      // Update our ref with the new content
      filesRef.current.set(file.path, result.content);
      
      // Return the file with the applied content
      return {
        ...file,
        content: result.content,
        isEdit: false, // It's now a full file
      };
    });
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingBlocks, setStreamingBlocks] = useState<ParsedBlock[] | null>(
    null
  );
  const [creditError, setCreditError] = useState<{
    message: string;
    remainingCredits?: number;
    hourlyRemaining?: number;
  } | null>(null);
  const [hasMemory, setHasMemory] = useState(false);

  // Check for existing memory
  useEffect(() => {
    const checkMemory = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/memory`);
        if (res.ok) {
          const data = await res.json();
          setHasMemory(!!data.summary);
        }
      } catch (error) {
        console.error("Failed to check memory:", error);
      }
    };
    checkMemory();
  }, [projectId]);

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

  // Handle adding file to editor
  const handleAddFile = useCallback(
    (file: FileData) => {
      if (onFilesGenerated) {
        onFilesGenerated([file]);
      }
    },
    [onFilesGenerated]
  );

  // Clear chat history
  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setMessages([]);
        // Also clear the files ref to start fresh
        filesRef.current.clear();
      } else {
        console.error("Failed to clear chat history");
      }
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    } finally {
      setIsClearing(false);
    }
  };

  // Start new chat (clear messages but keep files)
  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setStreamingContent("");
    setStreamingBlocks(null);
    if (onNewChat) {
      onNewChat();
    }
  };

  // Send message
  const sendMessage = async (attachments?: Attachment[]) => {
    const content = input.trim();
    if ((!content && (!attachments || attachments.length === 0)) || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      attachments,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setStreamingBlocks(null);

    // Get current files from ref for context
    const currentFiles = Array.from(filesRef.current.entries()).map(([path, content]) => ({
      path,
      content,
    }));

    // Prepare attachments for API (convert to base64)
    const attachmentData = attachments ? await Promise.all(
      attachments.map(async (att) => {
        if (att.file) {
          const base64 = await fileToBase64(att.file);
          return {
            type: att.type,
            name: att.name,
            mimeType: att.file.type,
            data: base64,
          };
        }
        return null;
      })
    ) : [];

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: content,
          files: currentFiles, // Send existing files so AI knows what exists
          attachments: attachmentData.filter(Boolean),
        }),
      });

      if (!response.ok) {
        // Handle rate limit / credit exhausted errors
        if (response.status === 429) {
          const errorData = await response.json();
          setCreditError({
            message: errorData.message || "Rate limit exceeded",
            remainingCredits: errorData.remainingCredits,
            hourlyRemaining: errorData.hourlyRemaining,
          });
          setMessages((prev) => prev.slice(0, -1)); // Remove the user message we just added
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to send message");
      }

      // Clear any previous credit error on success
      setCreditError(null);

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

        // Parse streaming content for live preview
        const { blocks, files } = parseAIResponse(fullContent);
        setStreamingBlocks(blocks);

        // Real-time file detection during streaming (don't process diffs during streaming)
        if (files.length > 0 && onFilesGenerated) {
          // Only send full files during streaming, diffs will be processed at the end
          const fullFiles = files.filter(f => !f.isEdit);
          if (fullFiles.length > 0) {
            onFilesGenerated(processFiles(fullFiles));
          }
        }
      }

      // Parse the final content
      const { blocks, files } = parseAIResponse(fullContent);
      
      // Process all files (apply diffs to existing files)
      const processedFiles = processFiles(files);

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: fullContent,
        parsedBlocks: blocks,
        files: processedFiles,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
      setStreamingBlocks(null);

      // Final file notification with processed files
      if (processedFiles.length > 0 && onFilesGenerated) {
        onFilesGenerated(processedFiles);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
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

  return (
    <div className="flex flex-col h-full">
      {/* Credit Error Alert */}
      {creditError && (
        <Alert variant="destructive" className="m-3 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Credit Limit Reached</AlertTitle>
          <AlertDescription>
            {creditError.message}
            {creditError.hourlyRemaining === 0 && (
              <span className="block mt-1 text-xs">
                Your hourly rate limit will reset soon. Please wait a moment.
              </span>
            )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 px-2 text-xs"
            onClick={() => setCreditError(null)}
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Chat Header with controls */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-background/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            {messages.length > 0 ? `${messages.length} messages` : "New conversation"}
          </span>
          {hasMemory && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5 cursor-help">
                  <Brain className="h-3 w-3" />
                  Memory
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                AI remembers context from previous conversations
              </TooltipContent>
            </Tooltip>
          )}
          {existingFiles.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0.5 cursor-help">
                  <Sparkles className="h-3 w-3" />
                  {existingFiles.length} files
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                AI has context of your {existingFiles.length} project files
              </TooltipContent>
            </Tooltip>
          )}
          <CreditDisplay variant="minimal" />
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNewChat}
                disabled={isLoading || messages.length === 0}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New chat (keep files)</TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isLoading || isClearing || messages.length === 0}
                  >
                    {isClearing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Clear all history</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {messages.length} messages in this conversation. 
                  Your generated files will remain, but the AI will lose context of previous discussions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearHistory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear history
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        streamingContent={streamingContent}
        streamingBlocks={streamingBlocks}
      />
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
