"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { ChatInterface } from "@/components/chat";
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
        <div className="fixed inset-0 flex flex-col lg:flex-row bg-background">
            {/* Chat panel */}
            <div className="flex flex-col w-full h-[50vh] lg:h-full lg:w-[420px] lg:min-w-[360px] lg:max-w-[500px] border-b lg:border-b-0 lg:border-r">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between border-b px-3 py-2.5 bg-background">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/projects"
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <span className="font-semibold text-sm truncate max-w-[200px]">
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

            {/* Code editor */}
            <div className="flex-1 h-[50vh] lg:h-full min-h-0 overflow-hidden">
                <CodeEditor files={files} projectId={projectId} />
            </div>
        </div>
    );
}
