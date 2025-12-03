"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";

export function StreamingIndicator() {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center">
        <Image src="/logo.png" alt="Jersen AI" width={56} height={56} className="dark:invert" />
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
