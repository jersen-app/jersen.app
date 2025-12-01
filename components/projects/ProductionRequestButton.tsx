"use client";

import { useState } from "react";
import { Rocket, MessageCircle, DollarSign, Clock, Send, Eye, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BUDGET_OPTIONS = [
    { value: "under_500", label: "Under $500", description: "Small fixes & tweaks" },
    { value: "500_1000", label: "$500 - $1,000", description: "Feature additions" },
    { value: "1000_2500", label: "$1,000 - $2,500", description: "Major features" },
    { value: "2500_5000", label: "$2,500 - $5,000", description: "Full implementation" },
    { value: "5000_plus", label: "$5,000+", description: "Complete project" },
    { value: "need_quote", label: "Need a Quote", description: "Let us review first" },
] as const;

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low", color: "bg-gray-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
] as const;

const TELEGRAM_LINK = "https://t.me/jersenteam";

// Status button configurations
const statusButtonConfig: Record<string, { 
    label: string; 
    icon: React.ComponentType<any>; 
    variant: "default" | "outline" | "ghost" | "secondary";
    className: string;
}> = {
    none: { 
        label: "Request", 
        icon: Rocket, 
        variant: "outline",
        className: "text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-300 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950"
    },
    requested: { 
        label: "Pending", 
        icon: Clock, 
        variant: "secondary",
        className: "text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950 dark:hover:bg-amber-900"
    },
    quoted: { 
        label: "Quoted", 
        icon: DollarSign, 
        variant: "secondary",
        className: "text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-950 dark:hover:bg-green-900"
    },
    in_production: { 
        label: "Building", 
        icon: Loader2, 
        variant: "secondary",
        className: "text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-950 dark:hover:bg-blue-900"
    },
    deployed: { 
        label: "Deployed", 
        icon: CheckCircle, 
        variant: "secondary",
        className: "text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-950 dark:hover:bg-green-900"
    },
};

interface ProductionRequestButtonProps {
    projectId: string;
    projectName: string;
    productionStatus?: string;
}

export default function ProductionRequestButton({ 
    projectId, 
    projectName, 
    productionStatus = "none" 
}: ProductionRequestButtonProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        description: "",
        budgetRange: "need_quote" as string,
        priority: "medium" as string,
    });
    const router = useRouter();

    const config = statusButtonConfig[productionStatus] || statusButtonConfig.none;
    const IconComponent = config.icon;
    const hasExistingRequest = productionStatus !== "none";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!formData.description.trim()) {
            toast.error("Please describe what you need help with");
            return;
        }
        
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/production-requests/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    projectName,
                    ...formData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit request");
            }

            setSubmitted(true);
            toast.success("Request submitted successfully!");
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.message || "Failed to submit request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function closeModal() {
        setOpen(false);
        setSubmitted(false);
        setFormData({ description: "", budgetRange: "need_quote", priority: "medium" });
        router.refresh();
    }

    // If there's an existing request, show a button that links to tracking
    if (hasExistingRequest) {
        return (
            <Button 
                variant={config.variant} 
                size="sm" 
                className={cn("gap-1.5 h-8 text-xs", config.className)}
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/projects/${projectId}/tracking`);
                }}
            >
                <IconComponent className={cn("h-3.5 w-3.5", productionStatus === "in_production" && "animate-spin")} />
                {config.label}
            </Button>
        );
    }

    // No existing request - show the request dialog
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant={config.variant} 
                    size="sm" 
                    className={cn("gap-1.5 h-8 text-xs", config.className)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <IconComponent className="h-3.5 w-3.5" />
                    {config.label}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                {!submitted ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-violet-500" />
                                Request Production Help
                            </DialogTitle>
                            <DialogDescription>
                                Let the Jersen team help you finish <span className="font-medium text-foreground">{projectName}</span> and deploy it to production.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="description">What do you need help with?</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe what features you need completed, any bugs to fix, or what you want deployed..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    Budget Range
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {BUDGET_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, budgetRange: option.value })}
                                            className={cn(
                                                "flex flex-col items-start rounded-lg border p-3 text-left transition-all",
                                                formData.budgetRange === option.value
                                                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950"
                                                    : "border-border hover:border-muted-foreground/50"
                                            )}
                                        >
                                            <span className="text-sm font-medium">{option.label}</span>
                                            <span className="text-xs text-muted-foreground">{option.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    Priority
                                </Label>
                                <div className="flex gap-2">
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: option.value })}
                                            className={cn(
                                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                                                formData.priority === option.value
                                                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950"
                                                    : "border-border hover:border-muted-foreground/50"
                                            )}
                                        >
                                            <div className={cn("h-2 w-2 rounded-full", option.color)} />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="gap-2">
                                    <Send className="h-4 w-4" />
                                    {isSubmitting ? "Submitting..." : "Submit Request"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                ✅ Request Submitted!
                            </DialogTitle>
                            <DialogDescription>
                                We've received your request and will review your project shortly.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge variant="secondary">Pending Review</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Expected Response</span>
                                    <span className="text-sm font-medium">Within 24 hours</span>
                                </div>
                            </div>
                            
                            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
                                <p className="text-sm mb-3">
                                    <strong>Need faster response?</strong> Message us directly on Telegram for real-time communication.
                                </p>
                                <Button asChild variant="outline" className="w-full gap-2">
                                    <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="h-4 w-4" />
                                        Chat on Telegram
                                    </a>
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button 
                                variant="outline" 
                                className="w-full sm:w-auto"
                                onClick={() => {
                                    closeModal();
                                    router.push(`/dashboard/projects/${projectId}/tracking`);
                                }}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                View Tracking
                            </Button>
                            <Button onClick={closeModal} className="w-full sm:w-auto">
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
