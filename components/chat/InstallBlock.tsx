"use client";

import { Package } from "lucide-react";
import type { ParsedBlock } from "./types";

interface InstallBlockProps {
  block: ParsedBlock;
}

export function InstallBlock({ block }: InstallBlockProps) {
  const packages = block.packages || [];

  return (
    <div className="my-2 rounded-lg border border-blue-500/30 bg-blue-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10">
        <Package className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Dependencies to install
        </span>
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-2">
        {packages.map((pkg, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"
          >
            {pkg}
          </span>
        ))}
      </div>
    </div>
  );
}
