"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function CreateProjectDialog() {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [newApiKey, setNewApiKey] = useState("");
    const [projectId, setProjectId] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const data = new FormData();
        data.append("name", formData.name);
        data.append("description", formData.description);
        data.append("status", "planning");

        try {
            const response = await fetch("/api/projects/create", {
                method: "POST",
                body: data,
            });

            if (!response.ok) {
                throw new Error("Failed to create project");
            }

            const result = await response.json();
            setNewApiKey(result.apiKey);
            setProjectId(result.projectId);
            setShowApiKey(true);
            setFormData({ name: "", description: "" });
        } catch (error) {
            alert("Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    }

    function closeModal() {
        setShowApiKey(false);
        setOpen(false);
        router.refresh();
    }

    function goToBuilder() {
        router.push(`/dashboard/projects/${projectId}/builder`);
        setOpen(false);
    }

    function goToSettings() {
        router.push(`/dashboard/projects/${projectId}/settings`);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {!showApiKey ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-violet-500" />
                                Create New Project
                            </DialogTitle>
                            <DialogDescription>
                                Start building your next idea with AI-powered development.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Mobile App MVP"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Brief description of your project..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create Project"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                🎉 Project Created!
                            </DialogTitle>
                            <DialogDescription>
                                Your API key has been generated. Copy it now - you won't be able to see it again!
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-lg bg-muted p-3">
                            <code className="break-all text-sm font-mono">{newApiKey}</code>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => {
                                    navigator.clipboard.writeText(newApiKey);
                                    alert("API key copied!");
                                }}
                                variant="outline"
                            >
                                Copy API Key
                            </Button>
                            <Button onClick={goToBuilder} className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Start Building
                            </Button>
                        </div>
                        <DialogFooter className="flex-row gap-2 sm:justify-between">
                            <Button variant="ghost" onClick={goToSettings} className="text-sm">
                                Go to Settings
                            </Button>
                            <Button variant="ghost" onClick={closeModal} className="text-sm">
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
