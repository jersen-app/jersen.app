"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  Loader2,
  Paperclip,
  Mic,
  Square,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Music,
  MessageCircle,
  Users,
  Calendar,
  BookOpen,
  ShoppingCart,
  Kanban,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShineBorder } from "@/components/ui/shine-border";

// Template data - Full-stack MVP templates showcasing Jersen AI's power
const TEMPLATES = [
  {
    id: "todo-app",
    name: "Todo App",
    description: "Full-stack with auth & database",
    icon: CheckSquare,
    color: "bg-blue-500",
    prompt: "Build a full-stack Todo List app with user authentication. Users can sign up, log in, create/edit/delete tasks, mark them as complete, and organize them by categories. Use the database to store todos and user data. Include a clean dashboard showing today's tasks and upcoming deadlines.",
  },
  {
    id: "spotify-clone",
    name: "Spotify Clone",
    description: "Music player with playlists",
    icon: Music,
    color: "bg-green-500",
    prompt: "Build a Spotify-like music streaming app with user authentication. Features: browse music library, create and manage playlists, like songs, search for tracks/artists, and a persistent audio player at the bottom. Use the database to store user playlists and liked songs. Use storage for album artwork.",
  },
  {
    id: "twitter-clone",
    name: "Twitter Clone",
    description: "Social media with posts",
    icon: MessageCircle,
    color: "bg-sky-500",
    prompt: "Build a Twitter/X clone with user authentication. Features: post tweets, like and retweet, follow/unfollow users, user profiles with bio and avatar, home feed showing posts from followed users, and trending topics. Use the database for posts, follows, and likes. Use storage for profile pictures and media uploads.",
  },
  {
    id: "team-chat",
    name: "Team Chat",
    description: "Real-time messaging app",
    icon: Users,
    color: "bg-violet-500",
    prompt: "Build a Slack-like team chat application with user authentication. Features: create channels, direct messages, send and receive messages in real-time, share files, user presence indicators, and message reactions. Use the database for messages and channels. Use storage for file attachments.",
  },
  {
    id: "event-booking",
    name: "Event Booking",
    description: "Calendar & reservations",
    icon: Calendar,
    color: "bg-orange-500",
    prompt: "Build an event booking platform with user authentication. Features: browse events by category/date, book tickets, manage bookings, event calendar view, and user dashboard showing upcoming events. Organizers can create events and manage attendees. Use the database for events and bookings.",
  },
  {
    id: "blog-platform",
    name: "Blog Platform",
    description: "Write & publish articles",
    icon: BookOpen,
    color: "bg-pink-500",
    prompt: "Build a Medium-like blogging platform with user authentication. Features: write articles with rich text editor, publish/draft posts, follow authors, clap/like articles, comments, reading list, and personalized feed. Use the database for articles and user data. Use storage for article cover images.",
  },
  {
    id: "ecommerce-store",
    name: "E-Commerce Store",
    description: "Products, cart & checkout",
    icon: ShoppingCart,
    color: "bg-emerald-500",
    prompt: "Build a full e-commerce store with user authentication. Features: product catalog with categories and search, product detail pages, shopping cart, wishlist, checkout flow, order history, and admin dashboard for managing products. Use the database for products, orders, and inventory. Use storage for product images.",
  },
  {
    id: "project-board",
    name: "Project Board",
    description: "Kanban task management",
    icon: Kanban,
    color: "bg-indigo-500",
    prompt: "Build a Trello-like project management board with user authentication. Features: create boards and lists, drag-and-drop cards between lists, add labels and due dates, assign team members, card comments, and board sharing. Use the database for boards, lists, and cards. Support team collaboration.",
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_LENGTH = 4000;

interface Attachment {
  id: string;
  type: "image" | "pdf" | "link";
  name: string;
  size: number;
  url: string;
  file?: File;
}

export default function DashboardClient() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const updateScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [updateScrollButtons]);

  const scrollTemplates = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
      setTimeout(updateScrollButtons, 300);
    }
  };

  const handleSubmit = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt.trim();
    if (!finalPrompt || isCreating) return;

    setIsCreating(true);

    try {
      // Generate a smart project name
      const generateProjectName = (text: string): string => {
        const lowerText = text.toLowerCase();
        
        // Check for full-stack MVP project types
        if (lowerText.includes("todo") || lowerText.includes("task")) return "Todo App";
        if (lowerText.includes("spotify") || lowerText.includes("music") || lowerText.includes("streaming")) return "Music App";
        if (lowerText.includes("twitter") || lowerText.includes("tweet") || lowerText.includes("social media")) return "Social App";
        if (lowerText.includes("chat") || lowerText.includes("messaging") || lowerText.includes("slack")) return "Chat App";
        if (lowerText.includes("event") || lowerText.includes("booking") || lowerText.includes("ticket")) return "Event Booking";
        if (lowerText.includes("blog") || lowerText.includes("article") || lowerText.includes("medium")) return "Blog Platform";
        if (lowerText.includes("ecommerce") || lowerText.includes("e-commerce") || lowerText.includes("store") || lowerText.includes("shop")) return "E-Commerce Store";
        if (lowerText.includes("kanban") || lowerText.includes("trello") || lowerText.includes("project board")) return "Project Board";
        
        // Check for other common project types
        if (lowerText.includes("landing page")) return "Landing Page";
        if (lowerText.includes("portfolio")) return "Portfolio";
        if (lowerText.includes("dashboard") || lowerText.includes("admin")) return "Dashboard";
        if (lowerText.includes("saas") || lowerText.includes("startup")) return "SaaS Landing";
        if (lowerText.includes("contact") || lowerText.includes("form")) return "Contact Page";
        if (lowerText.includes("pricing")) return "Pricing Page";
        
        // Fallback: generate a random creative name
        const adjectives = ["Swift", "Bright", "Bold", "Fresh", "Smart", "Next", "Prime", "Nova", "Apex", "Core"];
        const nouns = ["App", "Site", "Project", "Build", "Launch", "Hub", "Space", "Base", "Flow", "Lab"];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj} ${noun}`;
      };

      const projectName = generateProjectName(finalPrompt);

      const data = new FormData();
      data.append("name", projectName);
      data.append("description", finalPrompt);
      data.append("status", "planning");

      const response = await fetch("/api/projects/create", {
        method: "POST",
        body: data,
      });

      if (!response.ok) throw new Error("Failed to create project");

      const result = await response.json();
      
      // Store prompt in sessionStorage
      sessionStorage.setItem(`project_initial_prompt_${result.projectId}`, finalPrompt);
      
      // Store attachments in sessionStorage (convert files to base64 for images)
      if (attachments.length > 0) {
        const attachmentData = await Promise.all(
          attachments.map(async (att) => {
            if (att.type === "link") {
              return { type: "link", url: att.url, name: att.name };
            } else if (att.file) {
              // Convert file to base64
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(att.file!);
              });
              return { type: att.type, base64, name: att.name };
            }
            return null;
          })
        );
        sessionStorage.setItem(
          `project_initial_attachments_${result.projectId}`,
          JSON.stringify(attachmentData.filter(Boolean))
        );
      }
      
      router.push(`/dashboard/projects/${result.projectId}/builder`);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTemplateClick = (template: (typeof TEMPLATES)[0]) => {
    setPrompt(template.prompt);
    textareaRef.current?.focus();
  };

  const processFile = useCallback((file: File): Attachment | null => {
    const isImageType = file.type.startsWith("image/");
    const isPdfType = file.type === "application/pdf";
    if (!isImageType && !isPdfType) return null;
    if (file.size > MAX_FILE_SIZE) return null;

    return {
      id: Math.random().toString(36).slice(2),
      type: isImageType ? "image" : "pdf",
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      file,
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = [];
    Array.from(files).forEach((file) => {
      const attachment = processFile(file);
      if (attachment) newAttachments.push(attachment);
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att && att.url && att.type !== "link") URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    
    // Basic URL validation
    let url = linkUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    try {
      new URL(url); // Validate URL
      const attachment: Attachment = {
        id: Math.random().toString(36).slice(2),
        type: "link",
        name: new URL(url).hostname,
        size: 0,
        url: url,
      };
      setAttachments((prev) => [...prev, attachment]);
      setLinkUrl("");
      setShowLinkInput(false);
    } catch {
      alert("Please enter a valid URL");
    }
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));
      if (imageItems.length > 0) {
        e.preventDefault();
        imageItems.forEach((item) => {
          const file = item.getAsFile();
          if (file) {
            const attachment = processFile(file);
            if (attachment) setAttachments((prev) => [...prev, attachment]);
          }
        });
      }
    },
    [processFile]
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
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
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio, mimeType: "audio/webm" }),
      });

      if (response.ok) {
        const { text, improvedText } = await response.json();
        const finalText = improvedText || text;
        if (finalText) setPrompt((prev) => (prev ? `${prev}\n${finalText}` : finalText));
      }
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center pt-6 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
          <Sparkles className="h-4 w-4" />
          AI-Powered Builder
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">What would you like to build?</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Describe your idea and let AI generate the code.
        </p>
      </div>

      {/* Input Box */}
      <div className="max-w-2xl mx-auto">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative group rounded-lg overflow-hidden border bg-muted/50">
                {att.type === "image" ? (
                  <div className="w-16 h-16">
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  </div>
                ) : att.type === "link" ? (
                  <div className="px-3 py-2 flex items-center gap-2 max-w-[200px]">
                    <Link2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-xs truncate">{att.name}</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative rounded-2xl border bg-background shadow-lg overflow-hidden transition-all">
          <ShineBorder 
            shineColor={["#8B5CF6", "#EC4899", "#3B82F6"]} 
            borderWidth={2}
            duration={10}
          />
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX_INPUT_LENGTH))}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Describe what you want to build... e.g., 'A landing page for my startup with pricing'"
            className="min-h-[100px] max-h-[200px] resize-none border-0 bg-transparent px-4 pt-4 pb-14 text-sm focus-visible:ring-0"
            disabled={isCreating || isRecording || isTranscribing}
            maxLength={MAX_INPUT_LENGTH}
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFileSelect} className="hidden" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isCreating}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach images or PDF</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button" 
                    variant={showLinkInput ? "secondary" : "ghost"} 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => setShowLinkInput(!showLinkInput)} 
                    disabled={isCreating}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add reference link</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "ghost"}
                    size="icon"
                    className={cn("h-8 w-8", isRecording && "animate-pulse")}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isCreating || isTranscribing}
                  >
                    {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isTranscribing ? "Transcribing..." : isRecording ? "Stop" : "Voice input"}</TooltipContent>
              </Tooltip>

              {isRecording && <span className="text-xs text-destructive font-medium">{formatTime(recordingTime)}</span>}
            </div>

            <div className="flex items-center gap-2">
              <span className={cn("text-xs tabular-nums", prompt.length > MAX_INPUT_LENGTH * 0.9 ? "text-destructive" : "text-muted-foreground")}>
                {prompt.length}/{MAX_INPUT_LENGTH}
              </span>
              <Button 
                onClick={() => handleSubmit()} 
                disabled={!prompt.trim() || isCreating} 
                className="rounded-full border gap-2  hover:from-violet-700 hover:via-pink-700 hover:to-blue-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Build
              </Button>
            </div>
          </div>

        </div>

        {/* Link Input Popup - positioned outside the chat box */}
        {showLinkInput && (
          <div className="mt-2 p-3 rounded-lg border bg-background shadow-lg">
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Paste a reference URL (e.g., dribbble.com/shot/...)"
                className="flex-1 text-sm px-3 py-2 rounded-md border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLink();
                  } else if (e.key === "Escape") {
                    setShowLinkInput(false);
                  }
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Add design references like Dribbble, Behance, or any website URL
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-2">Press Enter to build • Shift+Enter for new line</p>
      </div>

      {/* Templates Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Start with a template</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollTemplates("left")} disabled={!canScrollLeft}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollTemplates("right")} disabled={!canScrollRight}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              disabled={isCreating}
              className="flex-shrink-0 w-[160px] flex flex-col items-start gap-2 p-3 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all text-left disabled:opacity-50"
            >
              <div className={cn("p-2 rounded-lg text-white", template.color)}>
                <template.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
