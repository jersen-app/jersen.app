"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Message, FileData, ParsedBlock } from "./types";
import { generateId, parseAIResponse } from "./utils";
import { applyDiffBlocks } from "@/lib/ai/diff";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatInterfaceProps {
  projectId: string;
  onFilesGenerated?: (files: FileData[]) => void;
  existingFiles?: { path: string; content: string }[];
}

export function ChatInterface({
  projectId,
  onFilesGenerated,
  existingFiles = [],
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
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingBlocks, setStreamingBlocks] = useState<ParsedBlock[] | null>(
    null
  );

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
    setStreamingBlocks(null);

    // Get current files from ref for context
    const currentFiles = Array.from(filesRef.current.entries()).map(([path, content]) => ({
      path,
      content,
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: content,
          files: currentFiles, // Send existing files so AI knows what exists
        }),
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
      <MessageList
        messages={messages}
        isLoading={isLoading}
        streamingContent={streamingContent}
        streamingBlocks={streamingBlocks}
        onAddFile={handleAddFile}
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
