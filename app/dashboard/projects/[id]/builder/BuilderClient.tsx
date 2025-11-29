"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import CodeEditor from "@/components/CodeEditor";

interface BuilderClientProps {
    projectId: string;
    projectName: string;
    initialFiles: { path: string; content: string }[];
}

export default function BuilderClient({
    projectId,
    projectName,
    initialFiles,
}: BuilderClientProps) {
    const [files, setFiles] = useState(initialFiles);

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

    return (
        <div className="flex h-[100dvh] flex-col lg:flex-row overflow-hidden bg-background">
            {/* Chat panel */}
            <div className="flex flex-col h-[50dvh] w-full border-b lg:h-full lg:w-[380px] lg:min-w-[320px] lg:max-w-[450px] lg:border-b-0 lg:border-r xl:w-[400px]">
                {/* Compact header inside chat */}
                <div className="flex items-center justify-between border-b px-3 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/projects"
                            className="rounded-md p-1 transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <span className="font-medium text-sm truncate max-w-[180px]">
                            {projectName}
                        </span>
                    </div>
                    <Link
                        href={`/dashboard/projects/${projectId}/settings`}
                        className="rounded-md p-1 transition-colors hover:bg-muted"
                    >
                        <Settings className="h-4 w-4" />
                    </Link>
                </div>
                
                {/* Chat content */}
                <div className="flex-1 min-h-0">
                    <ChatInterface
                        projectId={projectId}
                        onFilesGenerated={handleFilesGenerated}
                    />
                </div>
            </div>

            {/* Code editor */}
            <div className="flex-1 h-[50dvh] lg:h-full min-h-0">
                <CodeEditor files={files} projectId={projectId} />
            </div>
        </div>
    );
}
