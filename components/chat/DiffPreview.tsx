"use client";

import { Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DiffBlockProps {
  filename: string;
  diffBlocks: Array<{ search: string; replace: string }>;
  onApply?: () => void;
  onReject?: () => void;
}

export function DiffPreview({ filename, diffBlocks, onApply, onReject }: DiffBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-muted/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{filename}</span>
          <span className="text-xs text-muted-foreground">
            {diffBlocks.length} change{diffBlocks.length !== 1 ? 's' : ''}
          </span>
        </div>
        {(onApply || onReject) && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {onApply && (
              <button
                onClick={onApply}
                className="p-1 rounded hover:bg-green-500/20 text-green-600"
                title="Apply changes"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {onReject && (
              <button
                onClick={onReject}
                className="p-1 rounded hover:bg-red-500/20 text-red-600"
                title="Reject changes"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Diff Content */}
      {isExpanded && (
        <div className="divide-y">
          {diffBlocks.map((block, idx) => (
            <DiffBlockView key={idx} block={block} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiffBlockView({ block, index }: { block: { search: string; replace: string }; index: number }) {
  const searchLines = block.search.split('\n');
  const replaceLines = block.replace.split('\n');

  return (
    <div className="text-xs font-mono">
      {/* Change header */}
      <div className="px-3 py-1 bg-muted/30 text-muted-foreground text-[10px]">
        Change {index + 1}
      </div>
      
      {/* Removed lines (search) */}
      {searchLines.map((line, i) => (
        <div
          key={`search-${i}`}
          className={cn(
            "px-3 py-0.5 flex",
            "bg-red-500/10 text-red-700 dark:text-red-400"
          )}
        >
          <span className="w-6 shrink-0 text-red-500/70 select-none">-</span>
          <pre className="overflow-x-auto">{line || ' '}</pre>
        </div>
      ))}
      
      {/* Added lines (replace) */}
      {replaceLines.length > 0 && replaceLines[0] !== '' && replaceLines.map((line, i) => (
        <div
          key={`replace-${i}`}
          className={cn(
            "px-3 py-0.5 flex",
            "bg-green-500/10 text-green-700 dark:text-green-400"
          )}
        >
          <span className="w-6 shrink-0 text-green-500/70 select-none">+</span>
          <pre className="overflow-x-auto">{line || ' '}</pre>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline diff indicator for file blocks
 */
export function DiffIndicator({ isEdit }: { isEdit: boolean }) {
  if (!isEdit) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400">
      EDIT
    </span>
  );
}
