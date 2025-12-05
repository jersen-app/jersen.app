"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Code, Eye, PanelRightClose, PanelRight, Save, Cloud, CloudOff, X } from "lucide-react";
import { ChatInterface } from "@/components/chat";
import CodeEditor from "@/components/CodeEditor";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DeployDialog } from "@/components/DeployDialog";
import { useSandbox } from "@/hooks/use-sandbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface BuilderClientProps {
    projectId: string;
    projectName: string;
    initialFiles: { path: string; content: string }[];
    vercelDeploymentUrl?: string;
    lastDeployedAt?: string;
}

type RightPanel = "code" | "preview";
type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export default function BuilderClient({
    projectId,
    projectName,
    initialFiles,
    vercelDeploymentUrl,
    lastDeployedAt,
}: BuilderClientProps) {
    const [files, setFiles] = useState(initialFiles);
    const [rightPanel, setRightPanel] = useState<RightPanel>("code");
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [mobilePanel, setMobilePanel] = useState<RightPanel | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
    const [needsSync, setNeedsSync] = useState(false);
    const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
    const [initialAttachments, setInitialAttachments] = useState<Array<{type: string; url?: string; base64?: string; name: string}> | undefined>(undefined);
    const [deploymentUrl, setDeploymentUrl] = useState<string | undefined>(vercelDeploymentUrl);
    
    const isMobile = useIsMobile();
    
    // Track pending save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedFilesRef = useRef<string>(JSON.stringify(initialFiles));

    const sandbox = useSandbox({ projectId });
    
    // Ref to prevent duplicate sync operations
    const isSyncingRef = useRef(false);

    // Check for initial prompt and attachments from dashboard (stored in sessionStorage)
    useEffect(() => {
        const storedPrompt = sessionStorage.getItem(`project_initial_prompt_${projectId}`);
        if (storedPrompt) {
            setInitialPrompt(storedPrompt);
            // Clear it after reading so it doesn't re-trigger on refresh
            sessionStorage.removeItem(`project_initial_prompt_${projectId}`);
        }
        
        const storedAttachments = sessionStorage.getItem(`project_initial_attachments_${projectId}`);
        if (storedAttachments) {
            try {
                const parsed = JSON.parse(storedAttachments);
                setInitialAttachments(parsed);
            } catch (e) {
                console.error("Failed to parse initial attachments:", e);
            }
            sessionStorage.removeItem(`project_initial_attachments_${projectId}`);
        }
    }, [projectId]);

    // Convert files array to object for sandbox
    const filesObject = useMemo(() => {
        return files.reduce(
            (acc, file) => {
                acc[file.path] = file.content;
                return acc;
            },
            {} as Record<string, string>
        );
    }, [files]);

    // Track if a refetch is pending (to avoid race conditions)
    const refetchPendingRef = useRef(false);

    // Refetch files from backend (used after AI streaming completes to get authoritative file state)
    const refetchFiles = useCallback(async () => {
        // Skip if already syncing (handleFilesGenerated is running)
        if (isSyncingRef.current) {
            console.log(`[BuilderClient] Skipping refetch - sync in progress`);
            refetchPendingRef.current = true;
            return;
        }

        try {
            console.log(`[BuilderClient] Refetching files from backend...`);
            const response = await fetch(`/api/projects/${projectId}/files`);
            if (!response.ok) {
                console.error(`[BuilderClient] Failed to refetch files: ${response.status}`);
                return;
            }
            const data = await response.json();
            const fetchedFiles = data.files || [];
            console.log(`[BuilderClient] Fetched ${fetchedFiles.length} files from backend:`, fetchedFiles.map((f: {path: string}) => f.path));
            
            if (fetchedFiles.length > 0) {
                setFiles(fetchedFiles);
                lastSavedFilesRef.current = JSON.stringify(fetchedFiles);
                setNeedsSync(false); // Backend state is authoritative, mark as synced
                
                // Auto-sync to sandbox if running
                if (sandbox.status === "running" && sandbox.autoPreviewEnabled) {
                    isSyncingRef.current = true;
                    try {
                        const filesObj = fetchedFiles.reduce((acc: Record<string, string>, f: {path: string; content: string}) => {
                            acc[f.path] = f.content;
                            return acc;
                        }, {} as Record<string, string>);
                        await sandbox.update(filesObj);
                        console.log(`[BuilderClient] Synced refetched files to sandbox`);
                    } finally {
                        isSyncingRef.current = false;
                    }
                }
            }
        } catch (error) {
            console.error("[BuilderClient] Failed to refetch files:", error);
        }
    }, [projectId, sandbox]);

    // Save files to database
    const saveFiles = useCallback(async (filesToSave: { path: string; content: string }[]) => {
        if (filesToSave.length === 0) return;
        
        const filesJson = JSON.stringify(filesToSave);
        if (filesJson === lastSavedFilesRef.current) {
            setSaveStatus("saved");
            return;
        }

        setSaveStatus("saving");
        try {
            const response = await fetch(`/api/projects/${projectId}/files`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: filesToSave }),
            });

            if (!response.ok) {
                throw new Error("Failed to save files");
            }

            lastSavedFilesRef.current = filesJson;
            setSaveStatus("saved");
        } catch (error) {
            console.error("Failed to save files:", error);
            setSaveStatus("error");
        }
    }, [projectId]);

    // Auto-save files with debounce
    useEffect(() => {
        if (files.length === 0) return;

        const filesJson = JSON.stringify(files);
        if (filesJson === lastSavedFilesRef.current) return;

        setSaveStatus("unsaved");

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce save by 2 seconds
        saveTimeoutRef.current = setTimeout(() => {
            saveFiles(files);
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [files, saveFiles]);

    // Handle streaming file updates (real-time editor update, no sandbox sync)
    const handleStreamingFiles = useCallback(
        (newFiles: { path: string; content: string; isDelete?: boolean }[]) => {
            // Only update files in editor, don't trigger sandbox sync
            const filesToDelete = newFiles.filter(f => f.isDelete).map(f => f.path);
            const filesToUpdate = newFiles.filter(f => !f.isDelete);
            
            setFiles(prevFiles => {
                const fileMap = new Map(prevFiles.map((f) => [f.path, f]));
                
                // Remove deleted files
                for (const path of filesToDelete) {
                    fileMap.delete(path);
                }
                
                // Add/update files
                filesToUpdate.forEach((file) => {
                    fileMap.set(file.path, file);
                });
                
                return Array.from(fileMap.values());
            });
        },
        []
    );

    // Handle new files generated from AI (with auto-preview)
    const handleFilesGenerated = useCallback(
        async (newFiles: { path: string; content: string; isDelete?: boolean }[]) => {
            console.log(`[BuilderClient] Received ${newFiles.length} file operations:`, newFiles.map(f => ({ path: f.path, isDelete: f.isDelete })));
            
            // Separate deletions from additions/updates
            const filesToDelete = newFiles.filter(f => f.isDelete).map(f => f.path);
            const filesToUpdate = newFiles.filter(f => !f.isDelete);
            
            // Merge new files with existing ones, handling deletions
            const updatedFiles = (() => {
                const fileMap = new Map(files.map((f) => [f.path, f]));
                
                // Remove deleted files
                for (const path of filesToDelete) {
                    fileMap.delete(path);
                    console.log(`[BuilderClient] Deleted file: ${path}`);
                }
                
                // Add/update files
                filesToUpdate.forEach((file) => {
                    fileMap.set(file.path, file);
                });
                return Array.from(fileMap.values());
            })();
            
            setFiles(updatedFiles);
            console.log(`[BuilderClient] Total files after merge: ${updatedFiles.length}`, updatedFiles.map(f => f.path));
            
            // Prevent duplicate sync operations
            if (isSyncingRef.current) {
                console.log(`[BuilderClient] Already syncing, skipping`);
                setNeedsSync(true);
                return;
            }
            
            // Convert to files object for sandbox
            const filesObj = updatedFiles.reduce((acc, f) => {
                acc[f.path] = f.content;
                return acc;
            }, {} as Record<string, string>);
            
            // Small delay to ensure server's onFinish callback has saved dependencies
            // This prevents a race condition where sandbox.update fetches project before deps are saved
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Auto-preview: If enabled, automatically start or update sandbox
            if (sandbox.autoPreviewEnabled) {
                isSyncingRef.current = true;
                try {
                    if (sandbox.status === "running" || sandbox.status === "updating") {
                        // Sandbox already running, just update files
                        await sandbox.update(filesObj);
                        setNeedsSync(false);
                        console.log(`[BuilderClient] Auto-synced files to running sandbox`);
                    } else if (sandbox.status === "idle" || sandbox.status === "error") {
                        // No sandbox running, create one with files and switch to preview panel
                        setRightPanel("preview");
                        // Note: sandbox.create already passes files to the sandbox
                        await sandbox.create(filesObj);
                        setNeedsSync(false);
                        console.log(`[BuilderClient] Auto-started sandbox with files`);
                    } else if (sandbox.status === "creating") {
                        // Sandbox is being created, mark as needing sync
                        // The files will be synced once sandbox is ready
                        setNeedsSync(true);
                        console.log(`[BuilderClient] Sandbox creating, marked for sync`);
                    }
                } catch (error) {
                    console.error('[BuilderClient] Auto-preview failed:', error);
                    setNeedsSync(true);
                } finally {
                    isSyncingRef.current = false;
                    // If a refetch was pending, do it now
                    if (refetchPendingRef.current) {
                        refetchPendingRef.current = false;
                        setTimeout(() => refetchFiles(), 100);
                    }
                }
            } else {
                // Auto-preview disabled, just mark as needing sync if sandbox is running
                if (sandbox.status === "running") {
                    setNeedsSync(true);
                }
            }
        },
        [files, sandbox, refetchFiles]
    );

    // Mark files as needing sync when they change
    useEffect(() => {
        if (sandbox.status === "running" && files.length > 0) {
            setNeedsSync(true);
        }
    }, [files, sandbox.status]);

    // Start preview handler
    const handleStartPreview = useCallback(() => {
        sandbox.create(filesObject);
        setRightPanel("preview");
    }, [sandbox, filesObject]);

    // Refresh preview - sync files and reload
    const handleRefreshPreview = useCallback(async () => {
        if (needsSync) {
            await sandbox.update(filesObject);
            setNeedsSync(false);
        }
    }, [sandbox, filesObject, needsSync]);

    // Manual save
    const handleManualSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveFiles(files);
    }, [files, saveFiles]);

    // Save status indicator
    const SaveIndicator = () => {
        switch (saveStatus) {
            case "saved":
                return (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Cloud className="h-3 w-3" />
                        Saved
                    </span>
                );
            case "saving":
                return (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                        <Cloud className="h-3 w-3" />
                        Saving...
                    </span>
                );
            case "unsaved":
                return (
                    <button 
                        onClick={handleManualSave}
                        className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400"
                    >
                        <Save className="h-3 w-3" />
                        Unsaved
                    </button>
                );
            case "error":
                return (
                    <button 
                        onClick={handleManualSave}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400"
                    >
                        <CloudOff className="h-3 w-3" />
                        Error - Retry
                    </button>
                );
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col lg:flex-row bg-background">
            {/* Chat panel - full screen on mobile */}
            <div className="flex flex-col w-full h-full lg:h-full lg:w-[380px] lg:min-w-[320px] lg:max-w-[450px] lg:border-r">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between border-b px-3 py-2.5 bg-background">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/projects"
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <span className="font-semibold text-sm truncate max-w-[140px] sm:max-w-[180px]">
                            {projectName}
                        </span>
                        <SaveIndicator />
                    </div>
                    <div className="flex items-center gap-1">
                        <DeployDialog 
                            projectId={projectId} 
                            projectName={projectName} 
                            hasFiles={files.length > 0}
                            vercelDeploymentUrl={deploymentUrl}
                            lastDeployedAt={lastDeployedAt}
                            onDeploySuccess={(url) => setDeploymentUrl(url)}
                        />
                        <Link
                            href={`/dashboard/projects/${projectId}/settings`}
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {/* Chat - takes remaining height */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <ChatInterface
                        projectId={projectId}
                        onFilesGenerated={handleFilesGenerated}
                        onStreamingFiles={handleStreamingFiles}
                        onStreamComplete={refetchFiles}
                        existingFiles={files}
                        initialPrompt={initialPrompt}
                        initialAttachments={initialAttachments}
                    />
                </div>

                {/* Mobile floating buttons for Code/Preview */}
                {isMobile && files.length > 0 && (
                    <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-40">
                        <button
                            onClick={() => setMobilePanel("code")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all",
                                "bg-primary text-primary-foreground hover:bg-primary/90",
                                "text-sm font-medium"
                            )}
                        >
                            <Code className="h-4 w-4" />
                            <span>{files.length} files</span>
                        </button>
                        <button
                            onClick={() => {
                                setMobilePanel("preview");
                                if (sandbox.status === "idle" && files.length > 0) {
                                    handleStartPreview();
                                }
                            }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all",
                                "bg-background border text-foreground hover:bg-muted",
                                "text-sm font-medium"
                            )}
                        >
                            <Eye className="h-4 w-4" />
                            <span>Preview</span>
                            {sandbox.status === "running" && (
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Sheet for Code/Preview */}
            {isMobile && (
                <Sheet open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}>
                    <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-xl [&>button:last-child]:hidden">
                        {/* Sheet header */}
                        <div className="flex items-center justify-between border-b px-4 py-3 bg-background">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setMobilePanel("code")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                                        mobilePanel === "code"
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Code className="h-3.5 w-3.5" />
                                    Code
                                </button>
                                <button
                                    onClick={() => {
                                        setMobilePanel("preview");
                                        if (sandbox.status === "idle" && files.length > 0) {
                                            handleStartPreview();
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                                        mobilePanel === "preview"
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    Preview
                                    {sandbox.status === "running" && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={() => setMobilePanel(null)}
                                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Sheet content */}
                        <div className="flex-1 h-[calc(85vh-52px)] overflow-hidden">
                            {mobilePanel === "code" && (
                                <CodeEditor files={files} projectId={projectId} />
                            )}
                            {mobilePanel === "preview" && (
                                <PreviewPanel
                                    url={sandbox.url}
                                    status={sandbox.status}
                                    error={sandbox.error}
                                    onStart={handleStartPreview}
                                    onRefresh={handleRefreshPreview}
                                    onStop={sandbox.destroy}
                                    isLoading={sandbox.isLoading}
                                    needsSync={needsSync}
                                    requiresVercelConnection={sandbox.requiresVercelConnection}
                                    hasVercelConnected={sandbox.hasVercelConnected}
                                    hasSandboxToken={sandbox.hasSandboxToken}
                                />
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            )}

            {/* Right panel (Code + Preview) - Desktop only */}
            {!isMobile && (
                <div className="hidden lg:flex mx-4 rounded-3xl p-3 flex-1 flex-col h-full min-h-0 overflow-hidden border-l">
                    {/* Panel tabs */}
                    <div className="shrink-0 flex items-center justify-between border-b h-10 bg-background">
                        <div className="flex items-center gap-1 px-2">
                            <button
                                onClick={() => setRightPanel("code")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                                    rightPanel === "code"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Code className="h-3.5 w-3.5" />
                                Code
                            </button>
                            <button
                                onClick={() => {
                                    setRightPanel("preview");
                                    if (sandbox.status === "idle" && files.length > 0) {
                                        handleStartPreview();
                                    }
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                                    rightPanel === "preview"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                Preview
                                {sandbox.status === "running" && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                )}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowRightPanel(!showRightPanel)}
                            className="p-1.5 mr-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                        >
                            {showRightPanel ? (
                                <PanelRightClose className="h-4 w-4" />
                            ) : (
                                <PanelRight className="h-4 w-4" />
                            )}
                        </button>
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {rightPanel === "code" && (
                            <CodeEditor files={files} projectId={projectId} />
                        )}
                        {rightPanel === "preview" && (
                            <PreviewPanel
                                url={sandbox.url}
                                status={sandbox.status}
                                error={sandbox.error}
                                onStart={handleStartPreview}
                                onRefresh={handleRefreshPreview}
                                onStop={sandbox.destroy}
                                isLoading={sandbox.isLoading}
                                needsSync={needsSync}
                                requiresVercelConnection={sandbox.requiresVercelConnection}
                                hasVercelConnected={sandbox.hasVercelConnected}
                                hasSandboxToken={sandbox.hasSandboxToken}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
