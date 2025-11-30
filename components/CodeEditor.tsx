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

// Define custom Jersen theme for Monaco
const defineJersenTheme = (monaco: MonacoType) => {
    monaco.editor.defineTheme("jersen-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "6b7280", fontStyle: "italic" },
            { token: "keyword", foreground: "c084fc" }, // purple-400
            { token: "string", foreground: "86efac" }, // green-300
            { token: "number", foreground: "fcd34d" }, // amber-300
            { token: "type", foreground: "67e8f9" }, // cyan-300
            { token: "class", foreground: "fcd34d" }, // amber-300
            { token: "function", foreground: "93c5fd" }, // blue-300
            { token: "variable", foreground: "f9fafb" }, // gray-50
            { token: "operator", foreground: "f472b6" }, // pink-400
            { token: "delimiter", foreground: "9ca3af" }, // gray-400
            { token: "tag", foreground: "f472b6" }, // pink-400
            { token: "attribute.name", foreground: "c084fc" }, // purple-400
            { token: "attribute.value", foreground: "86efac" }, // green-300
        ],
        colors: {
            "editor.background": "#0a0a0a", // near black
            "editor.foreground": "#f9fafb",
            "editor.lineHighlightBackground": "#1f1f1f",
            "editor.selectionBackground": "#7c3aed40", // purple with opacity
            "editor.inactiveSelectionBackground": "#7c3aed20",
            "editorLineNumber.foreground": "#4b5563",
            "editorLineNumber.activeForeground": "#9ca3af",
            "editorCursor.foreground": "#c084fc",
            "editorWhitespace.foreground": "#374151",
            "editorIndentGuide.background": "#1f2937",
            "editorIndentGuide.activeBackground": "#374151",
            "editor.selectionHighlightBackground": "#7c3aed20",
            "editorBracketMatch.background": "#7c3aed30",
            "editorBracketMatch.border": "#7c3aed",
            "scrollbar.shadow": "#00000000",
            "scrollbarSlider.background": "#37415180",
            "scrollbarSlider.hoverBackground": "#4b556380",
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
                        "flex w-full items-center gap-1 px-2 py-1 text-sm hover:bg-muted/50 rounded-md transition-colors",
                        "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {isOpen ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-violet-400" />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0 text-violet-400" />
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
                    ? "bg-violet-500/20 text-violet-300"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                isNew && "ring-1 ring-green-500 animate-pulse"
            )}
            style={{ paddingLeft: `${depth * 12 + 24}px` }}
        >
            {isNew ? (
                <Sparkles className="h-4 w-4 shrink-0 text-green-400" />
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
        <div className="flex h-full bg-[#0a0a0a]">
            {files.length > 0 ? (
                <>
                    {/* File Tree Sidebar */}
                    {showFileTree && (
                        <div className="w-56 shrink-0 border-r border-border/50 flex flex-col bg-[#0f0f0f]">
                            {/* Sidebar Header - matches tab height */}
                            <div className="flex items-center justify-between h-10 px-3 border-b border-border/50">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Explorer
                                </span>
                                <button
                                    onClick={() => setShowFileTree(false)}
                                    className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <PanelLeftClose className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Project name / root - matches breadcrumb height */}
                            <div className="flex items-center h-7 px-3 border-b border-border/20 bg-[#0a0a0a]">
                                <Folder className="h-3.5 w-3.5 text-violet-400 mr-2" />
                                <span className="text-xs font-medium text-foreground">project</span>
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
                            <div className="shrink-0 px-3 py-2 border-t border-border/50 text-[11px] text-muted-foreground">
                                {files.length} file{files.length !== 1 ? "s" : ""}
                            </div>
                        </div>
                    )}

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* File tabs */}
                        <div className="shrink-0 flex items-center h-10 overflow-x-auto border-b border-border/50 bg-[#0f0f0f]">
                            {!showFileTree && (
                                <button
                                    onClick={() => setShowFileTree(true)}
                                    className="h-full px-3 flex items-center border-r border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
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
                                                "flex items-center gap-2 h-full px-4 text-sm font-medium transition-all border-r border-border/30",
                                                selectedFile === file.path
                                                    ? "bg-[#0a0a0a] text-foreground border-b-2 border-b-violet-500"
                                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border-b-2 border-b-transparent",
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
                        <div className="shrink-0 flex items-center h-7 px-4 text-xs text-muted-foreground bg-[#0a0a0a] border-b border-border/20">
                            {selectedFile.split("/").map((part, i, arr) => (
                                <span key={i} className="flex items-center">
                                    <span className={cn(
                                        i === arr.length - 1 ? "text-foreground font-medium" : "hover:text-foreground cursor-pointer"
                                    )}>
                                        {part}
                                    </span>
                                    {i < arr.length - 1 && (
                                        <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/40" />
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
                                theme={monacoLoaded ? "jersen-dark" : "vs-dark"}
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
                <div className="flex h-full w-full items-center justify-center p-6">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
                            <Code2 className="h-8 w-8 text-violet-400" />
                        </div>
                        <p className="text-base font-medium text-foreground">
                            No files generated yet
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                            Start chatting with AI to generate code. Your files will appear here.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
