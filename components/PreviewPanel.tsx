"use client";

import { useState, useEffect, useRef } from "react";
import {
    Play,
    RefreshCw,
    ExternalLink,
    X,
    Loader2,
    Smartphone,
    Tablet,
    Monitor,
    Maximize,
    Minimize,
    RotateCw,
    Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
    url: string | null;
    status: "idle" | "creating" | "running" | "updating" | "error";
    error: string | null;
    onStart: () => void;
    onRefresh: () => void;
    onStop: () => void;
    isLoading: boolean;
    needsSync?: boolean;
    requiresVercelConnection?: boolean;
    hasVercelConnected?: boolean;
    hasSandboxToken?: boolean;
}

type ViewportSize = "mobile" | "tablet" | "desktop";

const viewports: Record<ViewportSize, { width: number; label: string }> = {
    mobile: { width: 375, label: "Mobile" },
    tablet: { width: 768, label: "Tablet" },
    desktop: { width: 1280, label: "Desktop" },
};

export function PreviewPanel({
    url,
    status,
    error,
    onStart,
    onRefresh,
    onStop,
    isLoading,
    needsSync = false,
    requiresVercelConnection = false,
    hasVercelConnected = false,
    hasSandboxToken = false,
}: PreviewPanelProps) {
    const [viewport, setViewport] = useState<ViewportSize>("desktop");
    const [iframeKey, setIframeKey] = useState(0);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle Vercel OAuth redirect
    const connectVercel = () => {
        // Store current URL so user returns here after OAuth
        sessionStorage.setItem("vercel_return_url", window.location.href);
        window.location.href = "/api/integrations/vercel";
    };

    // Reset iframe loading state when URL changes or iframe key changes
    useEffect(() => {
        if (url) {
            setIframeLoading(true);
        }
    }, [url, iframeKey]);

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    const handleRefresh = () => {
        setIframeKey((prev) => prev + 1);
        onRefresh();
    };

    // Refresh only the iframe (not the sandbox)
    const handleRefreshIframe = () => {
        setIframeLoading(true);
        setIframeKey((prev) => prev + 1);
    };

    const handleOpenExternal = () => {
        if (url) {
            window.open(url, "_blank");
        }
    };

    const handleToggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-background">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
                <div className="flex items-center gap-2">
                    {status === "idle" && (
                        <Button
                            size="sm"
                            onClick={onStart}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <Play className="h-3.5 w-3.5" />
                            Preview
                        </Button>
                    )}

                    {(status === "running" || status === "updating") && (
                        <>
                            <Button
                                size="sm"
                                variant={needsSync ? "default" : "outline"}
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="gap-1.5"
                            >
                                <RefreshCw
                                    className={cn(
                                        "h-3.5 w-3.5",
                                        isLoading && "animate-spin"
                                    )}
                                />
                                {needsSync && <span className="text-xs">Sync</span>}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRefreshIframe}
                                disabled={isLoading}
                                title="Refresh preview"
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleToggleFullscreen}
                                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? (
                                    <Minimize className="h-3.5 w-3.5" />
                                ) : (
                                    <Maximize className="h-3.5 w-3.5" />
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleOpenExternal}
                                title="Open in new tab"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onStop}
                                className="text-muted-foreground hover:text-destructive"
                                title="Stop sandbox"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}

                    {status === "creating" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Starting sandbox...
                        </div>
                    )}
                </div>

                {/* Viewport Switcher */}
                {(status === "running" || status === "updating") && (
                    <div className="flex items-center gap-1 rounded-md border p-0.5">
                        <button
                            onClick={() => setViewport("mobile")}
                            className={cn(
                                "rounded p-1.5 transition-colors",
                                viewport === "mobile"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Mobile"
                        >
                            <Smartphone className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setViewport("tablet")}
                            className={cn(
                                "rounded p-1.5 transition-colors",
                                viewport === "tablet"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Tablet"
                        >
                            <Tablet className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setViewport("desktop")}
                            className={cn(
                                "rounded p-1.5 transition-colors",
                                viewport === "desktop"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Desktop"
                        >
                            <Monitor className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
                {status === "idle" && (
                    <div className="text-center text-muted-foreground">
                        <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Click Preview to start the sandbox</p>
                        <p className="text-xs mt-1 opacity-60">
                            Files will be synced to a live Next.js environment
                        </p>
                    </div>
                )}

                {status === "creating" && (
                    <div className="text-center text-muted-foreground">
                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                        <p className="text-sm">Starting Next.js sandbox...</p>
                        <p className="text-xs mt-1 opacity-60">
                            This may take a few seconds
                        </p>
                    </div>
                )}

                {status === "error" && (
                    <div className="text-center text-destructive">
                        <X className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-medium">Failed to start sandbox</p>
                        <p className="text-xs mt-1 opacity-80">{error}</p>
                        {requiresVercelConnection && !hasVercelConnected ? (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={connectVercel}
                                className="mt-4"
                            >
                                <Link2 className="mr-2 h-4 w-4" />
                                Connect Vercel Account
                            </Button>
                        ) : requiresVercelConnection && hasVercelConnected && !hasSandboxToken ? (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => window.location.href = "/dashboard/settings"}
                                className="mt-4"
                            >
                                Configure Sandbox Token
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onStart}
                                className="mt-4"
                            >
                                Try Again
                            </Button>
                        )}
                    </div>
                )}

                {(status === "running" || status === "updating") && url && (
                    <div
                        className={cn(
                            "bg-white rounded-lg shadow-lg overflow-hidden transition-all relative",
                            viewport === "desktop" && "w-full h-full",
                            viewport === "tablet" && "w-[768px] h-full max-h-[1024px]",
                            viewport === "mobile" && "w-[375px] h-full max-h-[812px]"
                        )}
                        style={
                            viewport !== "desktop"
                                ? {
                                      maxWidth: viewports[viewport].width,
                                  }
                                : {}
                        }
                    >
                        {/* Loading overlay */}
                        {iframeLoading && (
                            <div className="absolute inset-0 bg-background flex flex-col items-center justify-center z-10">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-muted rounded-full" />
                                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">Loading preview...</p>
                                <div className="mt-2 flex gap-1">
                                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                        <iframe
                            key={iframeKey}
                            src={url}
                            className="w-full h-full border-0"
                            title="Preview"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            onLoad={() => setIframeLoading(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
