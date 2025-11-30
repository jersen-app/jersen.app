"use client";

import { Editor, loader } from "@monaco-editor/react";
import { useState, useEffect, useRef, useMemo } from "react";
import {
    Code2,
    FileCode,
    Sparkles,
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    FileJson,
    FileText,
    FileType,
    PanelLeftClose,
    PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoType = any;

// Define custom Jersen light theme for Monaco
const defineJersenTheme = (monaco: MonacoType) => {
    monaco.editor.defineTheme("jersen-light", {
        base: "vs",
        inherit: false,
        rules: [
            // General
            { token: "", foreground: "1f2937" },
            { token: "comment", foreground: "6b7280", fontStyle: "italic" },
            { token: "comment.ts", foreground: "6b7280", fontStyle: "italic" },
            { token: "comment.tsx", foreground: "6b7280", fontStyle: "italic" },
            
            // Keywords (purple)
            { token: "keyword", foreground: "a855f7" },
            { token: "keyword.ts", foreground: "a855f7" },
            { token: "keyword.tsx", foreground: "a855f7" },
            { token: "keyword.control", foreground: "a855f7" },
            { token: "storage", foreground: "a855f7" },
            { token: "storage.type", foreground: "a855f7" },
            
            // Strings (green)
            { token: "string", foreground: "22c55e" },
            { token: "string.ts", foreground: "22c55e" },
            { token: "string.tsx", foreground: "22c55e" },
            { token: "string.key.json", foreground: "22c55e" },
            { token: "string.value.json", foreground: "22c55e" },
            
            // Numbers (amber)
            { token: "number", foreground: "f59e0b" },
            { token: "number.ts", foreground: "f59e0b" },
            { token: "constant.numeric", foreground: "f59e0b" },
            
            // Types (cyan)
            { token: "type", foreground: "06b6d4" },
            { token: "type.identifier", foreground: "06b6d4" },
            { token: "type.identifier.ts", foreground: "06b6d4" },
            { token: "entity.name.type", foreground: "06b6d4" },
            { token: "support.type", foreground: "06b6d4" },
            
            // Classes (amber)
            { token: "class", foreground: "f59e0b" },
            { token: "entity.name.class", foreground: "f59e0b" },
            
            // Functions (blue)
            { token: "function", foreground: "3b82f6" },
            { token: "entity.name.function", foreground: "3b82f6" },
            { token: "support.function", foreground: "3b82f6" },
            { token: "meta.function-call", foreground: "3b82f6" },
            
            // Variables
            { token: "variable", foreground: "1f2937" },
            { token: "variable.parameter", foreground: "1f2937" },
            { token: "identifier", foreground: "1f2937" },
            { token: "identifier.ts", foreground: "1f2937" },
            
            // Operators (pink)
            { token: "operator", foreground: "ec4899" },
            { token: "delimiter", foreground: "6b7280" },
            { token: "delimiter.bracket", foreground: "6b7280" },
            
            // JSX/TSX Tags (pink)
            { token: "tag", foreground: "ec4899" },
            { token: "tag.ts", foreground: "ec4899" },
            { token: "tag.tsx", foreground: "ec4899" },
            { token: "metatag", foreground: "ec4899" },
            { token: "metatag.html", foreground: "ec4899" },
            { token: "metatag.tsx", foreground: "ec4899" },
            
            // JSX/HTML attributes (purple)
            { token: "attribute.name", foreground: "a855f7" },
            { token: "attribute.name.tsx", foreground: "a855f7" },
            { token: "attribute.name.html", foreground: "a855f7" },
            
            // Attribute values (green)
            { token: "attribute.value", foreground: "22c55e" },
            { token: "attribute.value.tsx", foreground: "22c55e" },
            { token: "attribute.value.html", foreground: "22c55e" },
            
            // Import/Export
            { token: "keyword.control.import", foreground: "a855f7" },
            { token: "keyword.control.export", foreground: "a855f7" },
            { token: "keyword.control.from", foreground: "a855f7" },
        ],
        colors: {
            "editor.background": "#ffffff",
            "editor.foreground": "#1f2937",
            "editor.lineHighlightBackground": "#f5f3ff",
            "editor.selectionBackground": "#a855f740",
            "editor.inactiveSelectionBackground": "#a855f720",
            "editorLineNumber.foreground": "#9ca3af",
            "editorLineNumber.activeForeground": "#6b7280",
            "editorCursor.foreground": "#a855f7",
            "editorWhitespace.foreground": "#e5e7eb",
            "editorIndentGuide.background": "#e5e7eb",
            "editorIndentGuide.activeBackground": "#c4b5fd",
            "editor.selectionHighlightBackground": "#a855f720",
            "editorBracketMatch.background": "#a855f730",
            "editorBracketMatch.border": "#a855f7",
            "scrollbar.shadow": "#00000010",
            "scrollbarSlider.background": "#d1d5db80",
            "scrollbarSlider.hoverBackground": "#9ca3af80",
            "scrollbarSlider.activeBackground": "#6b728080",
        },
    });
};

// File icon component
function FileIcon({ filename }: { filename: string }) {
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
        case "tsx":
        case "ts":
            return <FileCode className="h-4 w-4 text-blue-400" />;
        case "jsx":
        case "js":
            return <FileCode className="h-4 w-4 text-yellow-400" />;
        case "json":
            return <FileJson className="h-4 w-4 text-amber-400" />;
        case "css":
            return <FileType className="h-4 w-4 text-pink-400" />;
        case "md":
            return <FileText className="h-4 w-4 text-gray-400" />;
        default:
            return <FileText className="h-4 w-4 text-gray-400" />;
    }
}

// Build folder tree structure from flat file list
interface TreeNode {
    name: string;
    path: string;
    type: "file" | "folder";
    children?: TreeNode[];
}

function buildFileTree(files: Array<{ path: string; content: string }>): TreeNode[] {
    const root: TreeNode[] = [];

    files.forEach((file) => {
        const parts = file.path.split("/");
        let currentLevel = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const existingNode = currentLevel.find((n) => n.name === part);

            if (existingNode) {
                if (!isFile && existingNode.children) {
                    currentLevel = existingNode.children;
                }
            } else {
                const newNode: TreeNode = {
                    name: part,
                    path: parts.slice(0, index + 1).join("/"),
                    type: isFile ? "file" : "folder",
                    children: isFile ? undefined : [],
                };
                currentLevel.push(newNode);
                if (!isFile && newNode.children) {
                    currentLevel = newNode.children;
                }
            }
        });
    });

    // Sort: folders first, then files, both alphabetically
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === "folder" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        }).map((node) => ({
            ...node,
            children: node.children ? sortNodes(node.children) : undefined,
        }));
    };

    return sortNodes(root);
}

// Tree node component
function TreeNodeItem({
    node,
    selectedFile,
    onSelect,
    recentlyAdded,
    depth = 0,
}: {
    node: TreeNode;
    selectedFile: string;
    onSelect: (path: string) => void;
    recentlyAdded: Set<string>;
    depth?: number;
}) {
    const [isOpen, setIsOpen] = useState(true);
    const isSelected = node.path === selectedFile;
    const isNew = recentlyAdded.has(node.path);

    if (node.type === "folder") {
        return (
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex w-full items-center gap-1 px-2 py-1 text-sm hover:bg-gray-100 rounded-md transition-colors",
                        "text-gray-600 hover:text-gray-800"
                    )}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {isOpen ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-violet-500" />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0 text-violet-500" />
                    )}
                    <span className="truncate">{node.name}</span>
                </button>
                {isOpen && node.children && (
                    <div>
                        {node.children.map((child) => (
                            <TreeNodeItem
                                key={child.path}
                                node={child}
                                selectedFile={selectedFile}
                                onSelect={onSelect}
                                recentlyAdded={recentlyAdded}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => onSelect(node.path)}
            className={cn(
                "flex w-full items-center gap-2 px-2 py-1 text-sm rounded-md transition-all",
                isSelected
                    ? "bg-violet-100 text-violet-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800",
                isNew && "ring-1 ring-green-500 animate-pulse"
            )}
            style={{ paddingLeft: `${depth * 12 + 24}px` }}
        >
            {isNew ? (
                <Sparkles className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
                <FileIcon filename={node.name} />
            )}
            <span className="truncate">{node.name}</span>
        </button>
    );
}

export default function CodeEditor({
    files,
    projectId,
}: {
    files: Array<{ path: string; content: string }>;
    projectId: string;
}) {
    const [selectedFile, setSelectedFile] = useState(files[0]?.path || "");
    const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
    const [showFileTree, setShowFileTree] = useState(true);
    const [monacoLoaded, setMonacoLoaded] = useState(false);
    const previousFilePaths = useRef<Set<string>>(new Set(files.map((f) => f.path)));

    // Build file tree
    const fileTree = useMemo(() => buildFileTree(files), [files]);

    // Configure Monaco on mount
    useEffect(() => {
        loader.init().then((monaco) => {
            defineJersenTheme(monaco);
            setMonacoLoaded(true);
        });
    }, []);

    // Track file changes and highlight new files
    useEffect(() => {
        const currentPaths = new Set(files.map((f) => f.path));
        const newPaths: string[] = [];

        // Find newly added files
        currentPaths.forEach((path) => {
            if (!previousFilePaths.current.has(path)) {
                newPaths.push(path);
            }
        });

        if (newPaths.length > 0) {
            // Mark as recently added
            setRecentlyAdded((prev) => {
                const updated = new Set(prev);
                newPaths.forEach((p) => updated.add(p));
                return updated;
            });

            // Auto-select the newest file
            setSelectedFile(newPaths[newPaths.length - 1]);

            // Remove highlight after 2 seconds
            setTimeout(() => {
                setRecentlyAdded((prev) => {
                    const updated = new Set(prev);
                    newPaths.forEach((p) => updated.delete(p));
                    return updated;
                });
            }, 2000);
        }

        // Update selected file if current selection was removed
        if (selectedFile && !currentPaths.has(selectedFile) && files.length > 0) {
            setSelectedFile(files[files.length - 1].path);
        }

        // Update the ref for next comparison
        previousFilePaths.current = currentPaths;
    }, [files, selectedFile]);

    const currentFile = files.find((f) => f.path === selectedFile);

    // Determine language based on file extension
    const getLanguage = (path: string) => {
        if (path.endsWith(".tsx")) return "typescript";
        if (path.endsWith(".ts")) return "typescript";
        if (path.endsWith(".jsx")) return "javascript";
        if (path.endsWith(".js")) return "javascript";
        if (path.endsWith(".css")) return "css";
        if (path.endsWith(".json")) return "json";
        if (path.endsWith(".html")) return "html";
        if (path.endsWith(".md")) return "markdown";
        return "typescript";
    };

    return (
        <div className="flex h-full bg-white">
            {files.length > 0 ? (
                <>
                    {/* File Tree Sidebar */}
                    {showFileTree && (
                        <div className="w-56 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
                            {/* Sidebar Header - matches tab height */}
                            <div className="flex items-center justify-between h-10 px-3 border-b border-gray-200">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                    Explorer
                                </span>
                                <button
                                    onClick={() => setShowFileTree(false)}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <PanelLeftClose className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Project name / root - matches breadcrumb height */}
                            <div className="flex items-center h-7 px-3 border-b border-gray-100 bg-white">
                                <Folder className="h-3.5 w-3.5 text-violet-500 mr-2" />
                                <span className="text-xs font-medium text-gray-800">project</span>
                            </div>

                            {/* File Tree */}
                            <div className="flex-1 overflow-y-auto py-1.5 px-1">
                                {fileTree.map((node) => (
                                    <TreeNodeItem
                                        key={node.path}
                                        node={node}
                                        selectedFile={selectedFile}
                                        onSelect={setSelectedFile}
                                        recentlyAdded={recentlyAdded}
                                    />
                                ))}
                            </div>

                            {/* File count */}
                            <div className="shrink-0 px-3 py-2 border-t border-gray-200 text-[11px] text-gray-500">
                                {files.length} file{files.length !== 1 ? "s" : ""}
                            </div>
                        </div>
                    )}

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* File tabs */}
                        <div className="shrink-0 flex items-center h-10 overflow-x-auto border-b border-gray-200 bg-gray-50">
                            {!showFileTree && (
                                <button
                                    onClick={() => setShowFileTree(true)}
                                    className="h-full px-3 flex items-center border-r border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <PanelLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div className="flex items-center h-full">
                                {files.map((file) => {
                                    const fileName = file.path.split("/").pop() || "";
                                    const parentFolder = file.path.split("/").slice(-2, -1)[0];
                                    // Check if there are duplicate filenames
                                    const hasDuplicates = files.filter(f => f.path.split("/").pop() === fileName).length > 1;
                                    
                                    return (
                                        <button
                                            key={file.path}
                                            onClick={() => setSelectedFile(file.path)}
                                            className={cn(
                                                "flex items-center gap-2 h-full px-4 text-sm font-medium transition-all border-r border-gray-100",
                                                selectedFile === file.path
                                                    ? "bg-white text-gray-800 border-b-2 border-b-violet-500"
                                                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-b-2 border-b-transparent",
                                                recentlyAdded.has(file.path) &&
                                                    "animate-pulse ring-1 ring-inset ring-green-500"
                                            )}
                                        >
                                            {recentlyAdded.has(file.path) ? (
                                                <Sparkles className="h-4 w-4 text-green-400 shrink-0" />
                                            ) : (
                                                <FileIcon filename={file.path} />
                                            )}
                                            <span className="flex items-center gap-1">
                                                {hasDuplicates && parentFolder && (
                                                    <span className="text-muted-foreground/60 text-xs">{parentFolder}/</span>
                                                )}
                                                {fileName}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Breadcrumb / Path */}
                        <div className="shrink-0 flex items-center h-7 px-4 text-xs text-gray-500 bg-white border-b border-gray-100">
                            {selectedFile.split("/").map((part, i, arr) => (
                                <span key={i} className="flex items-center">
                                    <span className={cn(
                                        i === arr.length - 1 ? "text-gray-800 font-medium" : "hover:text-gray-700 cursor-pointer"
                                    )}>
                                        {part}
                                    </span>
                                    {i < arr.length - 1 && (
                                        <ChevronRight className="h-3 w-3 mx-1 text-gray-300" />
                                    )}
                                </span>
                            ))}
                        </div>

                        {/* Editor */}
                        <div className="flex-1 min-h-0">
                            <Editor
                                height="100%"
                                defaultLanguage="typescript"
                                language={getLanguage(currentFile?.path || "")}
                                value={currentFile?.content || ""}
                                theme={monacoLoaded ? "jersen-light" : "vs"}
                                options={{
                                    minimap: { enabled: true, scale: 1, showSlider: "mouseover" },
                                    fontSize: 13,
                                    lineNumbers: "on",
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 16, bottom: 16 },
                                    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
                                    fontLigatures: true,
                                    renderLineHighlight: "line",
                                    cursorBlinking: "smooth",
                                    cursorSmoothCaretAnimation: "on",
                                    smoothScrolling: true,
                                    readOnly: true,
                                    bracketPairColorization: { enabled: true },
                                    guides: {
                                        bracketPairs: true,
                                        indentation: true,
                                    },
                                    scrollbar: {
                                        verticalScrollbarSize: 10,
                                        horizontalScrollbarSize: 10,
                                    },
                                }}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex h-full w-full items-center justify-center p-6 bg-white">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 border border-violet-200">
                            <Code2 className="h-8 w-8 text-violet-600" />
                        </div>
                        <p className="text-base font-medium text-gray-800">
                            No files generated yet
                        </p>
                        <p className="mt-2 text-sm text-gray-500 max-w-xs">
                            Start chatting with AI to generate code. Your files will appear here.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
