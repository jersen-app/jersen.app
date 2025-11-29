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
        <div className="flex h-screen flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/dashboard/projects"
                        className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="truncate font-semibold text-gray-900 dark:text-white">
                            {projectName}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            AI Builder
                        </p>
                    </div>
                </div>
                <Link
                    href={`/dashboard/projects/${projectId}/settings`}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:gap-2 sm:px-3"
                >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Link>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Chat panel */}
                <div className="h-1/2 w-full border-b border-gray-200 dark:border-gray-800 lg:h-full lg:w-[400px] lg:min-w-[320px] lg:max-w-[480px] lg:border-b-0 lg:border-r xl:w-[420px]">
                    <ChatInterface
                        projectId={projectId}
                        onFilesGenerated={handleFilesGenerated}
                    />
                </div>

                {/* Code editor */}
                <div className="h-1/2 flex-1 lg:h-full">
                    <CodeEditor files={files} projectId={projectId} />
                </div>
            </div>
        </div>
    );
}
