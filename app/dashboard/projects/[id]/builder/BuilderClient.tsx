"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Code, Eye, PanelRightClose, PanelRight } from "lucide-react";
import { ChatInterface } from "@/components/chat";
import CodeEditor from "@/components/CodeEditor";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useSandbox } from "@/hooks/use-sandbox";
import { cn } from "@/lib/utils";

interface BuilderClientProps {
    projectId: string;
    projectName: string;
    initialFiles: { path: string; content: string }[];
}

type RightPanel = "code" | "preview";

export default function BuilderClient({
    projectId,
    projectName,
    initialFiles,
}: BuilderClientProps) {
    const [files, setFiles] = useState(initialFiles);
    const [rightPanel, setRightPanel] = useState<RightPanel>("code");
    const [showRightPanel, setShowRightPanel] = useState(true);

    const sandbox = useSandbox({ projectId });

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

    // Handle new files generated from AI
    const handleFilesGenerated = useCallback(
        (newFiles: { path: string; content: string }[]) => {
            setFiles((prevFiles) => {
                // Merge new files with existing ones
                const fileMap = new Map(prevFiles.map((f) => [f.path, f]));
                newFiles.forEach((file) => {
                    fileMap.set(file.path, file);
                });
                return Array.from(fileMap.values());
            });
        },
        []
    );

    // Track if we need to sync files to sandbox
    const [needsSync, setNeedsSync] = useState(false);

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

    return (
        <div className="fixed inset-0 flex flex-col lg:flex-row bg-background">
            {/* Chat panel */}
            <div className="flex flex-col w-full h-[40vh] lg:h-full lg:w-[380px] lg:min-w-[320px] lg:max-w-[450px] border-b lg:border-b-0 lg:border-r">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between border-b px-3 py-2.5 bg-background">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/projects"
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <span className="font-semibold text-sm truncate max-w-[180px]">
                            {projectName}
                        </span>
                    </div>
                    <Link
                        href={`/dashboard/projects/${projectId}/settings`}
                        className="rounded-md p-1.5 transition-colors hover:bg-muted"
                    >
                        <Settings className="h-4 w-4" />
                    </Link>
                </div>

                {/* Chat - takes remaining height */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <ChatInterface
                        projectId={projectId}
                        onFilesGenerated={handleFilesGenerated}
                    />
                </div>
            </div>

            {/* Right panel (Code + Preview) */}
            <div className="flex-1 flex flex-col h-[60vh] lg:h-full min-h-0 overflow-hidden">
                {/* Panel tabs */}
                <div className="shrink-0 flex items-center justify-between border-b px-2 py-1 bg-background">
                    <div className="flex items-center gap-1">
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
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
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
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
