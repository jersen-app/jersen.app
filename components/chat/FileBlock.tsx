"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileCode,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Pencil,
} from "lucide-react";
import type { ParsedBlock } from "./types";
import { DiffPreview } from "./DiffPreview";

interface FileBlockProps {
  block: ParsedBlock;
  defaultCollapsed?: boolean;
}

// Calculate line changes for display
function calculateLineChanges(content: string, diffBlocks?: Array<{ search: string; replace: string }>): { added: number; removed: number } {
  if (diffBlocks && diffBlocks.length > 0) {
    let added = 0;
    let removed = 0;
    for (const block of diffBlocks) {
      const searchLines = block.search.split('\n').length;
      const replaceLines = block.replace.split('\n').filter(l => l !== '').length;
      removed += searchLines;
      added += replaceLines;
    }
    return { added, removed };
  }
  // For new files, all lines are added
  const lines = content.split('\n').length;
  return { added: lines, removed: 0 };
}

export function FileBlock({ block, defaultCollapsed = true }: FileBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [copied, setCopied] = useState(false);

  const isDiff = block.type === "diff" || (block.diffBlocks && block.diffBlocks.length > 0);
  const lineChanges = calculateLineChanges(block.content, block.diffBlocks);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = block.filename?.split("/").pop() || "file";
  const filePath = block.filename || "";

  // Render diff view
  if (isDiff && block.diffBlocks && block.diffBlocks.length > 0) {
    return (
      <div className="my-2">
        <DiffPreview
          filename={filePath}
          diffBlocks={block.diffBlocks}
          defaultCollapsed={defaultCollapsed}
          lineChanges={lineChanges}
        />
      </div>
    );
  }

  // Render full file view (collapsed by default)
  return (
    <div className="my-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/15 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
        )}
        <FileCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate">
            {displayName}
          </span>
          {filePath !== displayName && (
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 truncate hidden sm:inline">
              {filePath}
            </span>
          )}
        </div>
        {/* Line change indicators */}
        <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
          {lineChanges.added > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{lineChanges.added}
            </span>
          )}
          {lineChanges.removed > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{lineChanges.removed}
            </span>
          )}
        </div>
        {block.isFullFile === false && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400">
            <Pencil className="h-2.5 w-2.5" />
            EDIT
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
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
      </div>

      {/* Code Content - collapsed by default */}
      {isExpanded && (
        <div className="max-h-[350px] overflow-auto">
          <pre className="p-3 text-xs leading-relaxed bg-zinc-950 text-zinc-100 overflow-x-auto">
            <code>{block.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
