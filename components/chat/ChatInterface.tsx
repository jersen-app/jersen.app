"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquarePlus, Trash2, Loader2, AlertCircle, Brain, Sparkles } from "lucide-react";
import type { Message, FileData, ParsedBlock, Attachment, ToolCall } from "./types";
import { generateId, parseAIResponse, containsRawDiffMarkers, isIncompleteFile } from "./utils";
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

// Chat limits
const MAX_MESSAGES = 50; // Maximum messages per conversation
const MAX_INPUT_LENGTH = 4000; // Maximum characters per message

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
  onStreamingFiles?: (files: FileData[]) => void; // Real-time file updates (no sandbox sync)
  existingFiles?: { path: string; content: string }[];
  onNewChat?: () => void;
  initialPrompt?: string;
  initialAttachments?: Array<{type: string; url?: string; base64?: string; name: string}>;
}

export function ChatInterface({
  projectId,
  onFilesGenerated,
  onStreamingFiles,
  existingFiles = [],
  onNewChat,
  initialPrompt,
  initialAttachments,
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
      // Handle file deletions
      if (file.isDelete) {
        filesRef.current.delete(file.path);
        return file;
      }
      
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
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const [creditError, setCreditError] = useState<{
    message: string;
    remainingCredits?: number;
    hourlyRemaining?: number;
  } | null>(null);
  const [hasMemory, setHasMemory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const initialPromptSentRef = useRef(false);

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
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [projectId]);

  // Handle initial prompt (from dashboard quick start)
  useEffect(() => {
    if (
      initialPrompt &&
      historyLoaded &&
      !initialPromptSentRef.current &&
      messages.length === 0
    ) {
      initialPromptSentRef.current = true;
      
      // Convert initial attachments to Attachment format
      const convertedAttachments: Attachment[] = [];
      if (initialAttachments && initialAttachments.length > 0) {
        initialAttachments.forEach((att, index) => {
          if (att.type === "link" && att.url) {
            // For links, we'll include them in the message content
            // since the Attachment type expects a file
          } else if (att.base64 && (att.type === "image" || att.type === "pdf")) {
            // Convert base64 back to File
            const byteString = atob(att.base64.split(",")[1] || att.base64);
            const mimeType = att.type === "image" ? "image/png" : "application/pdf";
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });
            const file = new File([blob], att.name, { type: mimeType });
            
            convertedAttachments.push({
              id: generateId(),
              type: att.type as "image" | "pdf",
              name: att.name,
              size: file.size,
              url: URL.createObjectURL(blob),
              file,
            });
          }
        });
      }
      
      // Build prompt with any link references
      let finalPrompt = initialPrompt;
      const linkAttachments = initialAttachments?.filter(att => att.type === "link") || [];
      if (linkAttachments.length > 0) {
        finalPrompt += "\n\nReference links:\n" + linkAttachments.map(att => `- ${att.url}`).join("\n");
      }
      
      // Use setTimeout to ensure the component is fully rendered
      setTimeout(() => {
        sendMessage(
          convertedAttachments.length > 0 ? convertedAttachments : undefined, 
          finalPrompt
        );
      }, 100);
    }
  }, [initialPrompt, initialAttachments, historyLoaded, messages.length]);

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
    setActiveToolCalls([]);
    if (onNewChat) {
      onNewChat();
    }
  };

  // Send message
  const sendMessage = async (attachments?: Attachment[], messageOverride?: string) => {
    const content = (messageOverride ?? input).trim();
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
      setActiveToolCalls([]);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let lastStreamedFileCount = 0;
      let buffer = "";
      const toolCallsMap = new Map<string, ToolCall>();
      
      // Add timeout to prevent infinite hangs
      let lastChunkTime = Date.now();
      const STREAM_TIMEOUT_MS = 60000; // 60 seconds without data = timeout

      while (true) {
        // Check for timeout
        if (Date.now() - lastChunkTime > STREAM_TIMEOUT_MS) {
          console.warn('Stream timeout - no data received for 60 seconds');
          break;
        }
        
        const { done, value } = await reader.read();
        if (done) break;
        
        lastChunkTime = Date.now(); // Reset timeout on each chunk

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Parse SSE events from the UI message stream
        // Format: "data: {JSON}\n\n" or "data: [DONE]\n\n"
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer
        
        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6); // Remove "data: " prefix
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const partType = parsed.type;
              
              if (partType === 'text-delta') {
                // Text content delta
                fullContent += parsed.delta || '';
                setStreamingContent(fullContent);
                
                // Parse streaming content for live preview
                const { blocks, files } = parseAIResponse(fullContent);
                setStreamingBlocks(blocks);
                
                // Stream files to editor in real-time
                if (onStreamingFiles && files.length > lastStreamedFileCount) {
                  const completeFiles = files.filter(f => 
                    !f.content.endsWith('\n...') && 
                    !isIncompleteFile(f.content)
                  );
                  if (completeFiles.length > lastStreamedFileCount) {
                    const processedStreamFiles = processFiles(completeFiles);
                    const validFiles = processedStreamFiles.filter(f => !containsRawDiffMarkers(f.content));
                    if (validFiles.length > 0) {
                      onStreamingFiles(validFiles);
                    }
                    lastStreamedFileCount = completeFiles.length;
                  }
                }
              } else if (partType === 'tool-input-start') {
                // Tool call started
                const toolId = parsed.toolCallId || generateId();
                toolCallsMap.set(toolId, {
                  id: toolId,
                  toolName: parsed.toolName || 'unknown',
                  args: {},
                  state: 'running',
                });
                setActiveToolCalls(Array.from(toolCallsMap.values()));
              } else if (partType === 'tool-input-delta') {
                // Tool call input delta (args being streamed)
                const toolId = parsed.toolCallId;
                if (toolId && toolCallsMap.has(toolId)) {
                  const existing = toolCallsMap.get(toolId)!;
                  // Delta contains partial JSON, we could accumulate but for display just keep state
                  setActiveToolCalls(Array.from(toolCallsMap.values()));
                }
              } else if (partType === 'tool-input-end') {
                // Tool call input complete
                const toolId = parsed.toolCallId;
                if (toolId && toolCallsMap.has(toolId)) {
                  const existing = toolCallsMap.get(toolId)!;
                  toolCallsMap.set(toolId, {
                    ...existing,
                    args: parsed.input || existing.args,
                    state: 'running',
                  });
                  setActiveToolCalls(Array.from(toolCallsMap.values()));
                }
              } else if (partType === 'tool-result') {
                // Tool result received
                const toolId = parsed.toolCallId;
                if (toolId && toolCallsMap.has(toolId)) {
                  const existing = toolCallsMap.get(toolId)!;
                  toolCallsMap.set(toolId, {
                    ...existing,
                    state: 'complete',
                    result: parsed.output,
                  });
                  setActiveToolCalls(Array.from(toolCallsMap.values()));
                }
              } else if (partType === 'tool-call') {
                // Alternative tool call event (some SDK versions)
                const toolId = parsed.toolCallId || generateId();
                if (!toolCallsMap.has(toolId)) {
                  toolCallsMap.set(toolId, {
                    id: toolId,
                    toolName: parsed.toolName || 'unknown',
                    args: parsed.args || parsed.input || {},
                    state: 'running',
                  });
                  setActiveToolCalls(Array.from(toolCallsMap.values()));
                }
              } else if (partType === 'tool-output-available') {
                // Tool output is ready (marks completion)
                const toolId = parsed.toolCallId;
                if (toolId && toolCallsMap.has(toolId)) {
                  const existing = toolCallsMap.get(toolId)!;
                  toolCallsMap.set(toolId, {
                    ...existing,
                    state: 'complete',
                    result: parsed.output,
                  });
                  setActiveToolCalls(Array.from(toolCallsMap.values()));
                }
              } else if (partType === 'error') {
                console.error('Stream error:', parsed.errorText || parsed.error || parsed.message);
              } else if (partType === 'finish') {
                // Stream finished - clear tool calls
                setActiveToolCalls([]);
              } else if (partType && !['text-start', 'text-end', 'reasoning', 'step-start', 'step-finish', 'finish-message', 'finish-step', 'message-annotations'].includes(partType)) {
                // Log unknown event types for debugging (but not common ones)
                console.debug('[Stream] Unknown event type:', partType, parsed);
              }
              // Ignore other types: text-start, text-end, reasoning-*, step-*, etc.
            } catch (e) {
              // Log parse errors for debugging (but don't spam console)
              if (data.length > 0 && data !== '[DONE]') {
                console.debug('[Stream] Failed to parse:', data.substring(0, 100));
              }
            }
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
      setActiveToolCalls([]);

      // Final file notification with processed files (filter out any with raw diff markers or incomplete)
      const validProcessedFiles = processedFiles.filter(f => {
        if (containsRawDiffMarkers(f.content)) {
          console.warn(`[ChatInterface] Skipping ${f.path} - contains raw diff markers`);
          return false;
        }
        if (isIncompleteFile(f.content)) {
          console.warn(`[ChatInterface] Skipping ${f.path} - appears to be incomplete/truncated`);
          return false;
        }
        return true;
      });
      if (validProcessedFiles.length > 0 && onFilesGenerated) {
        console.log(`[ChatInterface] Calling onFilesGenerated with ${validProcessedFiles.length} files:`, validProcessedFiles.map(f => f.path));
        onFilesGenerated(validProcessedFiles);
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
        activeToolCalls={activeToolCalls}
      />
      
      {/* Message limit reached */}
      {messages.length >= MAX_MESSAGES ? (
        <div className="shrink-0 border-t bg-muted/50 p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Message limit reached. Please start a new chat to continue.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
      ) : (
        <ChatInput
          value={input}
          onChange={(v) => setInput(v.slice(0, MAX_INPUT_LENGTH))}
          onSend={sendMessage}
          isLoading={isLoading}
          maxLength={MAX_INPUT_LENGTH}
        />
      )}
    </div>
  );
}
