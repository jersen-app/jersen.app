"use client";

import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface EditProjectNameProps {
    projectId: string;
    initialName: string;
}

export function EditProjectName({ projectId, initialName }: EditProjectNameProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const [savedName, setSavedName] = useState(initialName);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim() || name.trim() === savedName) {
            setName(savedName);
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update project name");
            }

            setSavedName(data.project.name);
            setName(data.project.name);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setName(savedName);
        setError(null);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-2xl font-semibold tracking-tight bg-transparent border-b-2 border-primary focus:outline-none px-1 py-0.5 w-full max-w-md"
                        autoFocus
                        disabled={isLoading}
                        maxLength={100}
                    />
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 disabled:opacity-50"
                        title="Save"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Check className="h-5 w-5" />
                        )}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50"
                        title="Cancel"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group">
            <h1 className="text-2xl font-semibold tracking-tight">{savedName}</h1>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-opacity"
                title="Edit project name"
            >
                <Pencil className="h-4 w-4" />
            </button>
        </div>
    );
}
