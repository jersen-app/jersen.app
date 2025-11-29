"use client";

import { Send, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

// Simple ID generator
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface ChatInterfaceProps {
    projectId: string;
}

export default function ChatInterface({ projectId }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load chat history on mount
    useEffect(() => {
        async function loadHistory() {
            try {
                const response = await fetch(`/api/projects/${projectId}/chat`);
                if (response.ok) {
                    const history = await response.json();
                    if (Array.isArray(history) && history.length > 0) {
                        setMessages(history.map((msg: any) => ({
                            id: msg.id || msg._id || generateId(),
                            role: msg.role,
                            content: msg.content,
                        })));
                    }
                }
            } catch (err) {
                console.error("Failed to load chat history:", err);
            } finally {
                setIsLoadingHistory(false);
            }
        }
        loadHistory();
    }, [projectId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
        }
    }, [input]);

    const sendMessage = useCallback(async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage: Message = {
            id: generateId(),
            role: "user",
            content: trimmedInput,
        };

        // Add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        // Create placeholder for assistant message
        const assistantId = generateId();
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

        try {
            const response = await fetch(`/api/projects/${projectId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: trimmedInput }],
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                // Parse the streaming response (AI SDK data stream format)
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    // AI SDK data stream format: "0:text" for text chunks
                    if (line.startsWith("0:")) {
                        try {
                            const text = JSON.parse(line.slice(2));
                            assistantContent += text;
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === assistantId 
                                        ? { ...msg, content: assistantContent }
                                        : msg
                                )
                            );
                        } catch {
                            // If JSON parse fails, try to use the raw content
                        }
                    }
                }
            }

            // If we got no content from streaming, try to get the full response
            if (!assistantContent) {
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === assistantId 
                            ? { ...msg, content: "I received your message but couldn't generate a response." }
                            : msg
                    )
                );
            }
        } catch (err) {
            console.error("Failed to send message:", err);
            setError(err instanceof Error ? err.message : "Failed to send message");
            // Remove the empty assistant message on error
            setMessages(prev => prev.filter(msg => msg.id !== assistantId));
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, projectId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (isLoadingHistory) {
        return (
            <div className="flex h-full items-center justify-center bg-white dark:bg-gray-950">
                <div className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
                    <p className="mt-2 text-sm text-gray-500">Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-white dark:bg-gray-950">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-6 text-center">
                        <div className="max-w-sm">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Start Building with AI
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Describe what you want to build and I'll generate the code for you
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 p-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                                        message.role === "user"
                                            ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white"
                                            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {message.content || "..."}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.content === "" && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                                    <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex justify-center">
                                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    Error: {error}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <form onSubmit={handleSubmit} className="flex items-end gap-3">
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe what you want to build..."
                            disabled={isLoading}
                            className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-400 dark:focus:ring-violet-400/20"
                            rows={1}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </button>
                </form>
                <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
