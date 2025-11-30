"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  MicOff,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  Loader2,
  Send,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Attachment } from "./types";
import { generateId } from "./utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (increased for clipboard screenshots which can be larger)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachments?: Attachment[]) => void;
  isLoading: boolean;
  maxLength?: number;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  maxLength = 4000,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || isLoading) return;
    onSend(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  };

  // File handling
  const processFile = useCallback((file: File, fromClipboard = false): Attachment | null => {
    // For clipboard images, be more lenient with type checking
    const isImageType = file.type.startsWith("image/") || fromClipboard;
    const isPdfType = file.type === "application/pdf";
    
    if (!isImageType && !isPdfType) {
      alert(`File type not supported. Please use images or PDF.`);
      return null;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File "${file.name || 'image'}" is ${sizeMB}MB. Maximum size is 5MB.`);
      return null;
    }

    const url = URL.createObjectURL(file);

    return {
      id: generateId(),
      type: isImageType ? "image" : "pdf",
      name: file.name || `clipboard-${Date.now()}.png`,
      size: file.size,
      url,
      file,
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    Array.from(files).forEach((file) => {
      const attachment = processFile(file);
      if (attachment) {
        newAttachments.push(attachment);
      }
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = ""; // Reset input
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // Paste handling
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/")
      );

      if (imageItems.length > 0) {
        e.preventDefault();
        imageItems.forEach((item) => {
          const file = item.getAsFile();
          if (file) {
            const attachment = processFile(file, true); // true = from clipboard
            if (attachment) {
              setAttachments((prev) => [...prev, attachment]);
            }
          }
        });
      }
    },
    [processFile]
  );

  // Voice recording with Gemini transcription
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      const base64Audio = await base64Promise;

      // Send to our API endpoint for transcription with Gemini
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: "audio/webm",
        }),
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const { text, improvedText } = await response.json();
      
      // Use improved text if available, otherwise use original transcription
      const finalText = improvedText || text;
      
      if (finalText) {
        onChange(value ? `${value}\n${finalText}` : finalText);
        textareaRef.current?.focus();
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="shrink-0 border-t bg-background">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group rounded-lg overflow-hidden border bg-muted/50"
            >
              {attachment.type === "image" ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-16 h-16 object-cover"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-red-500" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 truncate">
                {attachment.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="relative rounded-2xl border bg-muted/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="What do you want to build? Paste images or attach files..."
            className="min-h-[80px] max-h-[200px] resize-none border-0 bg-transparent px-4 pt-4 pb-14 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isLoading || isRecording || isTranscribing}
            rows={3}
            maxLength={maxLength}
          />

          {/* Bottom toolbar */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* File attachment */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(",")}
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isRecording}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Attach files (images, PDF - max 5MB)
                </TooltipContent>
              </Tooltip>

              {/* Voice recording */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      isRecording && "animate-pulse"
                    )}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading || isTranscribing}
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-3 w-3 fill-current" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isTranscribing
                    ? "Transcribing..."
                    : isRecording
                    ? "Stop recording"
                    : "Voice input (Khmer/English)"}
                </TooltipContent>
              </Tooltip>

              {/* Recording indicator */}
              {isRecording && (
                <span className="text-xs text-destructive font-medium ml-1">
                  {formatRecordingTime(recordingTime)}
                </span>
              )}
              
              {isTranscribing && (
                <span className="text-xs text-muted-foreground ml-1">
                  Transcribing with AI...
                </span>
              )}
            </div>

            {/* Send button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleSend}
                  disabled={(!value.trim() && attachments.length === 0) || isLoading || isRecording}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-muted-foreground">
            Enter to send • Shift+Enter for new line • Paste images directly
          </p>
          <span className={cn(
            "text-[10px] tabular-nums",
            value.length > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground"
          )}>
            {value.length}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
