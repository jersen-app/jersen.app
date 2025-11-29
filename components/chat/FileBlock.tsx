"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCode,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedBlock, FileData } from "./types";

interface FileBlockProps {
  block: ParsedBlock;
  onAddFile?: (file: FileData) => void;
}

export function FileBlock({ block, onAddFile }: FileBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFile = () => {
    if (block.filename && onAddFile) {
      onAddFile({ path: block.filename, content: block.content });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const displayName = block.filename?.split("/").pop() || "file";
  const filePath = block.filename || "";

  return (
    <div className="my-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/15 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate block">
              {displayName}
            </span>
            {filePath !== displayName && (
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 truncate block">
                {filePath}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onAddFile && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs gap-1",
                added && "text-green-600"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleAddFile();
              }}
            >
              {added ? (
                <>
                  <Check className="h-3 w-3" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Add
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-emerald-500/60" />
          ) : (
            <ChevronRight className="h-4 w-4 text-emerald-500/60" />
          )}
        </div>
      </div>

      {/* Code Content */}
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
