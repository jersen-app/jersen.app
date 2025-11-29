"use client";

import { useState, useEffect, useCallback } from "react";
import type { Message, FileData, ParsedBlock } from "./types";
import { generateId, parseAIResponse } from "./utils";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatInterfaceProps {
  projectId: string;
  onFilesGenerated?: (files: FileData[]) => void;
}

export function ChatInterface({
  projectId,
  onFilesGenerated,
}: ChatInterfaceProps) {
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

        // Parse streaming content for live preview
        const { blocks, files } = parseAIResponse(fullContent);
        setStreamingBlocks(blocks);

        // Real-time file detection during streaming
        if (files.length > 0 && onFilesGenerated) {
          onFilesGenerated(files);
        }
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
      setStreamingBlocks(null);

      // Final file notification
      if (files.length > 0 && onFilesGenerated) {
        onFilesGenerated(files);
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
    <div className="flex flex-col h-full overflow-hidden">
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
