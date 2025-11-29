"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateProjectForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [newApiKey, setNewApiKey] = useState("");
    const [projectId, setProjectId] = useState("");
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            const response = await fetch("/api/projects/create", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to create project");
            }

            const data = await response.json();
            setNewApiKey(data.apiKey);
            setProjectId(data.projectId);
            setShowApiKey(true);

            // Reset form
            e.currentTarget.reset();
        } catch (error) {
            alert("Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    }

    function closeModal() {
        setShowApiKey(false);
        router.refresh(); // Refresh to show new project
    }

    function goToSettings() {
        router.push(`/dashboard/projects/${projectId}/settings`);
    }

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                <h2 className="mb-4 text-lg font-medium">New Project</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Project Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                placeholder="e.g. Mobile App MVP"
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="status" className="text-sm font-medium">
                                Status
                            </label>
                            <select
                                name="status"
                                id="status"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                            >
                                <option value="planning">Planning</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                            Description
                        </label>
                        <textarea
                            name="description"
                            id="description"
                            rows={3}
                            placeholder="Project details..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white dark:focus:ring-white"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Creating..." : "Create Project"}
                    </button>
                </form>
            </div>

            {/* API Key Modal */}
            {showApiKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="mx-4 max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-black">
                        <h3 className="text-lg font-semibold">Project Created! 🎉</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Your API key has been generated. Copy it now - you won't be able to see it again!
                        </p>
                        <div className="mt-4 rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                            <code className="break-all text-sm font-mono">{newApiKey}</code>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(newApiKey);
                                    alert("API key copied!");
                                }}
                                className="flex-1 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                            >
                                Copy API Key
                            </button>
                            <button
                                onClick={goToSettings}
                                className="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                            >
                                Go to Settings
                            </button>
                        </div>
                        <button
                            onClick={closeModal}
                            className="mt-3 w-full rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
