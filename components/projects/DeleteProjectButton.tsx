"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteProjectButtonProps {
    projectId: string;
    projectName: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== projectName) {
            toast.error("Project name doesn't match");
            return;
        }

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete project");
            }

            toast.success("Project deleted successfully");
            router.push("/dashboard/projects");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete project");
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            This action cannot be undone. This will permanently delete the project
                            <span className="font-semibold text-foreground"> {projectName}</span> and all
                            associated data including:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                            <li>All project files and code</li>
                            <li>Chat history and AI conversations</li>
                            <li>Project memory and context</li>
                            <li>API keys and configurations</li>
                        </ul>
                        <p className="pt-2">
                            Type <span className="font-mono font-semibold text-foreground">{projectName}</span> to confirm:
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Enter project name to confirm"
                    className="mt-2"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmText("")}>
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={confirmText !== projectName || isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Project"
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
