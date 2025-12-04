"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Rocket,
    Loader2,
    CheckCircle2,
    ExternalLink,
    AlertCircle,
    Link2,
    TriangleIcon,
} from "lucide-react";

interface DeployDialogProps {
    projectId: string;
    projectName: string;
    hasFiles: boolean;
    vercelDeploymentUrl?: string;
    lastDeployedAt?: string;
}

interface DeploymentResult {
    id: string;
    projectId?: string;
    url: string;
    inspectorUrl?: string;
    state: string;
    createdAt: number;
}

type DeployState = 
    | "idle" 
    | "checking" 
    | "deploying" 
    | "success" 
    | "error";

export function DeployDialog({ 
    projectId, 
    projectName, 
    hasFiles,
    vercelDeploymentUrl,
    lastDeployedAt,
}: DeployDialogProps) {
    const isAlreadyDeployed = !!vercelDeploymentUrl;
    const [open, setOpen] = useState(false);
    const [vercelConnected, setVercelConnected] = useState<boolean | null>(null);
    const [deployState, setDeployState] = useState<DeployState>("idle");
    const [deployment, setDeployment] = useState<DeploymentResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Check Vercel connection when dialog opens
    useEffect(() => {
        if (open) {
            checkVercelStatus();
        }
    }, [open]);

    const checkVercelStatus = async () => {
        setDeployState("checking");
        try {
            const res = await fetch("/api/integrations/vercel/deploy");
            const data = await res.json();
            setVercelConnected(data.connected);
            setDeployState("idle");
        } catch (error) {
            setVercelConnected(false);
            setDeployState("idle");
        }
    };

    const connectVercel = () => {
        // Save current URL to return after OAuth
        sessionStorage.setItem("vercel_return_url", window.location.href);
        window.location.href = "/api/integrations/vercel";
    };

    const handleDeploy = async () => {
        setDeployState("deploying");
        setError(null);

        try {
            const res = await fetch("/api/integrations/vercel/deploy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    projectName: projectName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === "NOT_CONNECTED") {
                    setVercelConnected(false);
                    setDeployState("idle");
                    return;
                }
                
                throw new Error(data.details || data.error || "Deployment failed");
            }

            setDeployment(data.deployment);
            setDeployState("success");
            toast.success("Deployed to Vercel!", {
                action: {
                    label: "View",
                    onClick: () => window.open(data.deployment.url, "_blank"),
                },
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to deploy";
            setError(errorMessage);
            setDeployState("error");
        }
    };

    const resetState = () => {
        setDeployState("idle");
        setDeployment(null);
        setError(null);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetState();
        }}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={!hasFiles}
                    className="gap-1.5"
                >
                    <Rocket className="h-3.5 w-3.5" />
                    {isAlreadyDeployed ? "Redeploy" : "Deploy"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-black">
                            <TriangleIcon className="h-4 w-4 text-white" fill="white" />
                        </div>
                        Deploy to Vercel
                    </DialogTitle>
                    <DialogDescription>
                        Deploy your project directly to Vercel's edge network.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* Checking connection */}
                    {deployState === "checking" && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Not connected - show connect button */}
                    {deployState === "idle" && vercelConnected === false && (
                        <div className="space-y-4 text-center py-4">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Link2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">Connect your Vercel account</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    You need to connect your Vercel account to deploy projects.
                                </p>
                            </div>
                            <Button onClick={connectVercel} className="w-full">
                                <TriangleIcon className="mr-2 h-4 w-4" fill="currentColor" />
                                Connect Vercel
                            </Button>
                        </div>
                    )}

                    {/* Connected - ready to deploy */}
                    {deployState === "idle" && vercelConnected === true && (
                        <div className="space-y-4">
                            {/* Show existing deployment info */}
                            {isAlreadyDeployed && (
                                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="font-medium text-green-700 dark:text-green-300">Currently Deployed</span>
                                    </div>
                                    <div className="grid gap-1 text-sm">
                                        <a
                                            href={vercelDeploymentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            {new URL(vercelDeploymentUrl!).hostname}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                        {lastDeployedAt && (
                                            <span className="text-muted-foreground text-xs">
                                                Last deployed: {new Date(lastDeployedAt).toLocaleDateString()} at {new Date(lastDeployedAt).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="rounded-lg border bg-muted/50 p-4">
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Project</span>
                                        <span className="font-medium">{projectName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{isAlreadyDeployed ? "Action" : "Deploy URL"}</span>
                                        <span className="font-mono text-xs">
                                            {isAlreadyDeployed 
                                                ? "Update existing deployment" 
                                                : `${projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.vercel.app`
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => handleDeploy()} className="w-full">
                                <Rocket className="mr-2 h-4 w-4" />
                                {isAlreadyDeployed ? "Redeploy to Vercel" : "Deploy to Vercel"}
                            </Button>
                        </div>
                    )}

                    {/* Deploying */}
                    {deployState === "deploying" && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="text-center">
                                <p className="font-medium">Deploying to Vercel...</p>
                                <p className="text-sm text-muted-foreground">
                                    This may take a moment.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {deployState === "success" && deployment && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center py-4 space-y-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">Deployment Successful!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your project is now live on Vercel.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-muted/50 p-4">
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">URL</span>
                                        <a
                                            href={deployment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 font-medium text-primary hover:underline"
                                        >
                                            {new URL(deployment.url).hostname}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className="font-medium capitalize">{deployment.state}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button asChild className="flex-1">
                                    <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Site
                                    </a>
                                </Button>
                                <Button variant="outline" onClick={resetState}>
                                    Deploy Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {deployState === "error" && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center py-4 space-y-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">Deployment Failed</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {error || "An error occurred during deployment."}
                                    </p>
                                </div>
                            </div>

                            <Button variant="outline" onClick={resetState} className="w-full">
                                Try Again
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
