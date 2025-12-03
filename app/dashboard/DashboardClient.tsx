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
  Layout,
  ShoppingBag,
  FileCode,
  Briefcase,
  GraduationCap,
  Utensils,
  Heart,
  Camera,
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

// Template data
const TEMPLATES = [
  {
    id: "landing",
    name: "Landing Page",
    description: "Hero, features, and CTA",
    icon: Layout,
    color: "bg-blue-500",
    prompt: "Create a modern landing page with a hero section featuring a headline and CTA button, a features section with 3 feature cards, a testimonials section, and a footer. Use a clean, professional design.",
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    description: "Products and checkout",
    icon: ShoppingBag,
    color: "bg-emerald-500",
    prompt: "Build an e-commerce product page with a product image gallery, product details, size/variant selectors, add to cart button, and related products section. Include a clean header with cart icon.",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Showcase your work",
    icon: Briefcase,
    color: "bg-violet-500",
    prompt: "Create a personal portfolio website with an about section, skills showcase, project gallery with hover effects, and a contact form. Use elegant typography and smooth animations.",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Charts and tables",
    icon: FileCode,
    color: "bg-orange-500",
    prompt: "Build an admin dashboard with a sidebar navigation, header with search and user menu, stats cards at the top, a line chart showing analytics, and a data table with pagination.",
  },
  {
    id: "blog",
    name: "Blog",
    description: "Articles and posts",
    icon: FileCode,
    color: "bg-pink-500",
    prompt: "Create a blog homepage with a featured article at the top, article grid below with thumbnails and excerpts, sidebar with categories and newsletter signup.",
  },
  {
    id: "education",
    name: "Education",
    description: "Courses and learning",
    icon: GraduationCap,
    color: "bg-cyan-500",
    prompt: "Build an online course platform homepage with course cards showing progress, category filters, search bar, and a hero section promoting featured courses.",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Menu and reservations",
    icon: Utensils,
    color: "bg-amber-500",
    prompt: "Create a restaurant website with a hero image, menu section with categories and food items with prices, reservation form, location map, and contact info.",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Medical services",
    icon: Heart,
    color: "bg-red-500",
    prompt: "Build a healthcare clinic website with services section, doctor profiles, appointment booking form, testimonials, and emergency contact information.",
  },
  {
    id: "photography",
    name: "Photography",
    description: "Photo gallery",
    icon: Camera,
    color: "bg-slate-600",
    prompt: "Create a photography portfolio with a masonry gallery layout, lightbox for full-size images, about section, pricing packages, and booking contact form.",
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_LENGTH = 4000;

interface Attachment {
  id: string;
  type: "image" | "pdf";
  name: string;
  size: number;
  url: string;
  file: File;
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
        
        // Check for common project types and generate appropriate names
        if (lowerText.includes("landing page")) return "Landing Page";
        if (lowerText.includes("e-commerce") || lowerText.includes("ecommerce") || lowerText.includes("product page")) return "E-Commerce Site";
        if (lowerText.includes("portfolio")) return "Portfolio";
        if (lowerText.includes("dashboard") || lowerText.includes("admin")) return "Dashboard";
        if (lowerText.includes("blog")) return "Blog";
        if (lowerText.includes("restaurant") || lowerText.includes("menu")) return "Restaurant Site";
        if (lowerText.includes("healthcare") || lowerText.includes("clinic") || lowerText.includes("medical")) return "Healthcare Site";
        if (lowerText.includes("education") || lowerText.includes("course") || lowerText.includes("learning")) return "Education Platform";
        if (lowerText.includes("photography") || lowerText.includes("gallery")) return "Photography Portfolio";
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
      sessionStorage.setItem(`project_initial_prompt_${result.projectId}`, finalPrompt);
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
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
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
              <div key={att.id} className="relative group rounded-lg overflow-hidden border bg-muted/50 w-14 h-14">
                {att.type === "image" ? (
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
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
                <TooltipContent>Attach images</TooltipContent>
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
