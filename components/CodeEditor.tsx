"use client";

import { Editor } from "@monaco-editor/react";
import { useState } from "react";
import { Code2, FileCode } from "lucide-react";

export default function CodeEditor({
    files,
    projectId,
}: {
    files: Array<{ path: string; content: string }>;
    projectId: string;
}) {
    const [selectedFile, setSelectedFile] = useState(files[0]?.path || "");
    const [code, setCode] = useState(files[0]?.content || "");

    const currentFile = files.find((f) => f.path === selectedFile);

    // Determine language based on file extension
    const getLanguage = (path: string) => {
        if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
        if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
        if (path.endsWith(".css")) return "css";
        if (path.endsWith(".json")) return "json";
        if (path.endsWith(".html")) return "html";
        if (path.endsWith(".md")) return "markdown";
        return "typescript";
    };

    return (
        <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
            {files.length > 0 ? (
                <>
                    {/* File tabs */}
                    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-1.5 dark:border-gray-800 dark:bg-gray-950">
                        {files.map((file) => (
                            <button
                                key={file.path}
                                onClick={() => {
                                    setSelectedFile(file.path);
                                    setCode(file.content);
                                }}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    selectedFile === file.path
                                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                }`}
                            >
                                <FileCode className="h-3.5 w-3.5" />
                                {file.path.split("/").pop()}
                            </button>
                        ))}
                    </div>

                    {/* Editor */}
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            defaultLanguage="typescript"
                            language={getLanguage(currentFile?.path || "")}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 16 },
                                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
                                fontLigatures: true,
                                renderLineHighlight: "line",
                                cursorBlinking: "smooth",
                                smoothScrolling: true,
                            }}
                        />
                    </div>
                </>
            ) : (
                <div className="flex h-full items-center justify-center p-6">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                            <Code2 className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            No files generated yet
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Start chatting with AI to generate code!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
