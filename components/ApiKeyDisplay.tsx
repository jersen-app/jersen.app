"use client";

import { useState } from "react";
import { Key, Copy, Check, RefreshCw } from "lucide-react";

export default function ApiKeyDisplay({ initialApiKey, projectId }: { initialApiKey?: string; projectId: string }) {
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [copied, setCopied] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);

    const copyToClipboard = () => {
        if (apiKey) {
            navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRegenerate = async () => {
        if (!confirm("Are you sure? This will invalidate the current API key.")) {
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/regenerate-key`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to regenerate key");
            }

            const data = await response.json();
            setApiKey(data.apiKey);
            setIsRevealed(true);
            alert("API key regenerated successfully! Make sure to copy it now.");
        } catch (error) {
            alert("Failed to regenerate API key");
        }
    };

    if (!apiKey) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                <p className="text-sm text-gray-500">No API key generated yet.</p>
            </div>
        );
    }

    const maskedKey = apiKey.slice(0, 15) + "..." + apiKey.slice(-4);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-gray-400" />
                    <code className="text-sm font-mono">
                        {isRevealed ? apiKey : maskedKey}
                    </code>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsRevealed(!isRevealed)}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        {isRevealed ? "Hide" : "Reveal"}
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            </div>
            <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
                <RefreshCw className="h-4 w-4" />
                Regenerate API Key
            </button>
        </div>
    );
}
