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
  const displayName = filename === 'unknown' ? 'Code Update' : (filename.split('/').pop() || filename);
  const hasPath = filename !== 'unknown' && filename.includes('/');

  return (
    <div className="rounded-lg border bg-card overflow-hidden my-2 shadow-sm">
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {hasPath && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline font-mono opacity-70">
              {filename}
            </span>
          )}
        </div>
        {/* Line change indicators */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0 bg-background px-2 py-0.5 rounded-md border">
          {changes.added > 0 && (
            <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
              +{changes.added}
            </span>
          )}
          {changes.removed > 0 && (
            <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
              -{changes.removed}
            </span>
          )}
        </div>
      </div>

      {/* Diff Content - collapsed by default */}
      {isExpanded && (
        <div className="divide-y border-t max-h-[400px] overflow-auto bg-background">
          {diffBlocks.map((block, idx) => (
            <DiffBlockView 
              key={idx} 
              block={block} 
              index={idx} 
              total={diffBlocks.length} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiffBlockView({ block, index, total }: { block: { search: string; replace: string }; index: number; total: number }) {
  const searchLines = block.search.split('\n');
  const replaceLines = block.replace.split('\n');

  return (
    <div className="text-xs font-mono leading-relaxed">
      {/* Change header - only show if multiple blocks */}
      {total > 1 && (
        <div className="px-3 py-1.5 bg-muted/30 text-muted-foreground text-[10px] font-medium uppercase tracking-wider border-b">
          Change {index + 1} of {total}
        </div>
      )}
      
      {/* Removed lines (search) */}
      {searchLines.map((line, i) => (
        <div
          key={`search-${i}`}
          className="flex bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10 transition-colors"
        >
          <div className="w-8 shrink-0 text-center text-red-500/50 select-none border-r border-red-500/10 py-0.5">-</div>
          <div className="px-3 py-0.5 text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">{line}</div>
        </div>
      ))}

      {/* Added lines (replace) */}
      {replaceLines.map((line, i) => (
        <div
          key={`replace-${i}`}
          className="flex bg-green-500/5 dark:bg-green-500/10 hover:bg-green-500/10 transition-colors"
        >
          <div className="w-8 shrink-0 text-center text-green-500/50 select-none border-r border-green-500/10 py-0.5">+</div>
          <div className="px-3 py-0.5 text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">{line}</div>
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
