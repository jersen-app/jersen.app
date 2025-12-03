"use client";

import { 
  Search, 
  FileText, 
  FolderTree, 
  BookOpen, 
  Brain, 
  ClipboardList,
  CheckCircle2,
  Compass,
  LayoutTemplate,
  Loader2,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tool metadata for display
const TOOL_INFO: Record<string, { 
  icon: LucideIcon; 
  label: string; 
  description: string;
  color: string;
}> = {
  // Core tools
  searchFiles: {
    icon: Search,
    label: "Searching",
    description: "Finding relevant files...",
    color: "text-blue-500",
  },
  readFile: {
    icon: FileText,
    label: "Reading",
    description: "Analyzing file content...",
    color: "text-green-500",
  },
  listDirectory: {
    icon: FolderTree,
    label: "Exploring",
    description: "Browsing project structure...",
    color: "text-amber-500",
  },
  findRelatedFiles: {
    icon: Compass,
    label: "Finding",
    description: "Locating related files...",
    color: "text-purple-500",
  },
  getProviderDocs: {
    icon: BookOpen,
    label: "Loading Docs",
    description: "Retrieving provider documentation...",
    color: "text-cyan-500",
  },
  remember: {
    icon: Brain,
    label: "Remembering",
    description: "Storing context for future...",
    color: "text-pink-500",
  },
  
  // Planning tools
  planFeature: {
    icon: ClipboardList,
    label: "Planning",
    description: "Creating implementation plan...",
    color: "text-indigo-500",
  },
  getCurrentPlan: {
    icon: ClipboardList,
    label: "Reviewing Plan",
    description: "Checking current plan...",
    color: "text-indigo-400",
  },
  markFileComplete: {
    icon: CheckCircle2,
    label: "Updating Plan",
    description: "Marking file complete...",
    color: "text-green-500",
  },
  
  // Validation tools
  validateCode: {
    icon: CheckCircle2,
    label: "Validating",
    description: "Checking code syntax...",
    color: "text-emerald-500",
  },
  validateMultiple: {
    icon: CheckCircle2,
    label: "Validating",
    description: "Checking multiple files...",
    color: "text-emerald-500",
  },
  
  // Discovery tools
  discoverComponents: {
    icon: Compass,
    label: "Discovering",
    description: "Finding existing components...",
    color: "text-violet-500",
  },
  findRelated: {
    icon: Compass,
    label: "Finding Related",
    description: "Locating related code...",
    color: "text-violet-400",
  },
  getComponentDetails: {
    icon: FileText,
    label: "Analyzing",
    description: "Getting component details...",
    color: "text-violet-300",
  },
  
  // Template tools
  listTemplates: {
    icon: LayoutTemplate,
    label: "Browsing Templates",
    description: "Finding available templates...",
    color: "text-orange-500",
  },
  useTemplate: {
    icon: LayoutTemplate,
    label: "Using Template",
    description: "Generating from template...",
    color: "text-orange-400",
  },
  getTemplateDetails: {
    icon: LayoutTemplate,
    label: "Loading Template",
    description: "Getting template info...",
    color: "text-orange-300",
  },
};

export interface ToolCall {
  toolName: string;
  args?: Record<string, unknown>;
  state: 'pending' | 'running' | 'complete';
  result?: unknown;
}

interface ToolIndicatorProps {
  toolCalls: ToolCall[];
  className?: string;
}

export function ToolIndicator({ toolCalls, className }: ToolIndicatorProps) {
  if (toolCalls.length === 0) return null;

  // Get the most recent active tool (running or pending)
  const activeTool = toolCalls.find(t => t.state === 'running') || 
                     toolCalls.find(t => t.state === 'pending');
  
  // Count completed tools
  const completedCount = toolCalls.filter(t => t.state === 'complete').length;
  const allComplete = completedCount > 0 && !activeTool;

  if (!activeTool && completedCount === 0) return null;

  // If all tools are complete, show completion state
  if (allComplete) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50",
        className
      )}>
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Ready</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {completedCount} step{completedCount > 1 ? 's' : ''} completed
        </span>
      </div>
    );
  }

  const toolInfo = activeTool ? TOOL_INFO[activeTool.toolName] : null;
  const Icon = toolInfo?.icon || Loader2;
  const label = toolInfo?.label || "Processing";
  const description = toolInfo?.description || "Working...";
  const colorClass = toolInfo?.color || "text-muted-foreground";

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50",
      className
    )}>
      <div className={cn("flex items-center gap-2", colorClass)}>
        <Icon className={cn(
          "h-4 w-4",
          activeTool?.state === 'running' && "animate-pulse"
        )} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {description}
      </span>

      {completedCount > 0 && (
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          {completedCount} done
        </span>
      )}

      {activeTool?.state === 'running' && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

// Compact version for inline display
export function ToolIndicatorCompact({ toolCalls, className }: ToolIndicatorProps) {
  if (toolCalls.length === 0) return null;

  const activeTool = toolCalls.find(t => t.state === 'running') || 
                     toolCalls.find(t => t.state === 'pending');
  
  if (!activeTool) return null;

  const toolInfo = TOOL_INFO[activeTool.toolName];
  const Icon = toolInfo?.icon || Loader2;
  const label = toolInfo?.label || "Processing";
  const colorClass = toolInfo?.color || "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", colorClass, className)}>
      <Icon className="h-3 w-3 animate-pulse" />
      <span>{label}...</span>
    </div>
  );
}
