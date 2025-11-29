"use client";

import { Bot } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Jersen AI Builder</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Describe what you want to build and I'll generate the code for you.
      </p>
      <div className="mt-6 space-y-2 text-left">
        <p className="text-xs text-muted-foreground">Try something like:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• "Create a landing page with hero and pricing"</li>
          <li>• "Build a contact form with validation"</li>
          <li>• "Add a dark mode toggle to the navbar"</li>
        </ul>
      </div>
    </div>
  );
}
