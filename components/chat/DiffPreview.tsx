"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DiffBlockProps {
  filename: string;
  diffBlocks: Array<{ search: string; replace: string }>;
  defaultCollapsed?: boolean;
  lineChanges?: { added: number; removed: number };
}

export function DiffPreview({ 
  filename, 
  diffBlocks, 
  defaultCollapsed = true,
  lineChanges 
}: DiffBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  // Calculate line changes if not provided
  const changes = lineChanges || (() => {
    let added = 0;
    let removed = 0;
    for (const block of diffBlocks) {
      const searchLines = block.search.split('\n').length;
      const replaceLines = block.replace.split('\n').filter(l => l !== '').length;
      removed += searchLines;
      added += replaceLines;
    }
    return { added, removed };
  })();

  // Get just the filename from path
  const displayName = filename.split('/').pop() || filename;
  const hasPath = filename.includes('/');

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs font-medium truncate">{displayName}</span>
          {hasPath && (
            <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
              {filename}
            </span>
          )}
        </div>
        {/* Line change indicators */}
        <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
          {changes.added > 0 && (
            <span className="flex items-center text-green-600 dark:text-green-400">
              +{changes.added}
            </span>
          )}
          {changes.removed > 0 && (
            <span className="flex items-center text-red-600 dark:text-red-400">
              -{changes.removed}
            </span>
          )}
        </div>
      </div>

      {/* Diff Content - collapsed by default */}
      {isExpanded && (
        <div className="divide-y max-h-[300px] overflow-auto">
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
