"use client";

import { Bot, Loader2 } from "lucide-react";

export function StreamingIndicator() {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          Jersen AI
        </span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating...</span>
        </div>
      </div>
    </div>
  );
}
