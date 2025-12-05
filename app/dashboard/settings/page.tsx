"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { 
    ExternalLink, 
    Link2, 
    Link2Off, 
    Loader2, 
    CheckCircle2,
    TriangleIcon,
    Key,
    Eye,
    EyeOff,
    Trash2,
} from "lucide-react";

interface VercelStatus {
    connected: boolean;
    user?: {
        username: string;
        email: string;
        name: string;
    };
    team?: {
        id: string;
        slug: string;
    };
    connectedAt?: string;
    hasSandboxToken?: boolean;
}

export default function SettingsPage() {
    const [vercelStatus, setVercelStatus] = useState<VercelStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    
    // Sandbox token state
    const [sandboxToken, setSandboxToken] = useState("");
    const [showToken, setShowToken] = useState(false);
    const [savingToken, setSavingToken] = useState(false);
    const [removingToken, setRemovingToken] = useState(false);

    useEffect(() => {
        checkVercelStatus();

        // Check for success/error from OAuth redirect
        const params = new URLSearchParams(window.location.search);
        if (params.get("vercel") === "connected") {
            toast.success("Vercel account connected successfully!");
            
            // Check if there's a return URL to redirect to (e.g., from deploy dialog)
            const returnUrl = sessionStorage.getItem("vercel_return_url");
            if (returnUrl) {
                sessionStorage.removeItem("vercel_return_url");
                window.location.href = returnUrl;
                return;
            }
            
            // Clean up URL if staying on settings page
            window.history.replaceState({}, "", "/dashboard/settings");
        } else if (params.get("error")) {
            toast.error("Failed to connect Vercel account");
            // Clear the return URL on error too
            sessionStorage.removeItem("vercel_return_url");
            window.history.replaceState({}, "", "/dashboard/settings");
        }
    }, []);

    const checkVercelStatus = async () => {
        try {
            // Fetch both deploy status and sandbox status
            const [deployRes, sandboxRes] = await Promise.all([
                fetch("/api/integrations/vercel/deploy"),
                fetch("/api/integrations/vercel/status"),
            ]);
            
            const deployData = await deployRes.json();
            const sandboxData = sandboxRes.ok ? await sandboxRes.json() : {};
            
            setVercelStatus({
                ...deployData,
                hasSandboxToken: sandboxData.hasSandboxToken || false,
            });
        } catch (error) {
            console.error("Failed to check Vercel status:", error);
            setVercelStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    };

    const connectVercel = () => {
        window.location.href = "/api/integrations/vercel";
    };

    const disconnectVercel = async () => {
        setDisconnecting(true);
        try {
            const res = await fetch("/api/integrations/vercel/deploy", {
                method: "DELETE",
            });
            if (res.ok) {
                setVercelStatus({ connected: false });
                toast.success("Vercel account disconnected");
            } else {
                toast.error("Failed to disconnect Vercel");
            }
        } catch (error) {
            toast.error("Failed to disconnect Vercel");
        } finally {
            setDisconnecting(false);
        }
    };

    const saveSandboxToken = async () => {
        if (!sandboxToken.trim()) {
            toast.error("Please enter a token");
            return;
        }

        setSavingToken(true);
        try {
            const res = await fetch("/api/integrations/vercel/sandbox-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: sandboxToken.trim() }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Sandbox token saved successfully!");
                setSandboxToken("");
                setVercelStatus(prev => prev ? { ...prev, hasSandboxToken: true } : prev);
            } else {
                toast.error(data.error || "Failed to save token");
            }
        } catch (error) {
            toast.error("Failed to save token");
        } finally {
            setSavingToken(false);
        }
    };

    const removeSandboxToken = async () => {
        setRemovingToken(true);
        try {
            const res = await fetch("/api/integrations/vercel/sandbox-token", {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Sandbox token removed");
                setVercelStatus(prev => prev ? { ...prev, hasSandboxToken: false } : prev);
            } else {
                toast.error("Failed to remove token");
            }
        } catch (error) {
            toast.error("Failed to remove token");
        } finally {
            setRemovingToken(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your account settings and integrations.
                </p>
            </div>

            <Separator />

            {/* Integrations Section */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-medium">Integrations</h2>
                    <p className="text-sm text-muted-foreground">
                        Connect third-party services to enhance your workflow.
                    </p>
                </div>

                {/* Vercel Integration Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black">
                            <TriangleIcon className="h-6 w-6 text-white" fill="white" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                                Vercel
                                {vercelStatus?.connected && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Connected
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Deploy your projects directly to Vercel with one click.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking connection status...
                            </div>
                        ) : vercelStatus?.connected ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border bg-muted/50 p-4">
                                    <div className="grid gap-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Account</span>
                                            <span className="font-medium">
                                                {vercelStatus.user?.username || vercelStatus.user?.email}
                                            </span>
                                        </div>
                                        {vercelStatus.team && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Team</span>
                                                <span className="font-medium">{vercelStatus.team.slug}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Connected</span>
                                            <span className="font-medium">
                                                {vercelStatus.connectedAt
                                                    ? new Date(vercelStatus.connectedAt).toLocaleDateString()
                                                    : "Unknown"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href="https://vercel.com/dashboard"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Open Vercel Dashboard
                                        </a>
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                                                <Link2Off className="mr-2 h-4 w-4" />
                                                Disconnect
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Disconnect Vercel?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove the connection to your Vercel account.
                                                    You won't be able to deploy projects until you reconnect.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={disconnectVercel}
                                                    disabled={disconnecting}
                                                    className="bg-red-500 hover:bg-red-600"
                                                >
                                                    {disconnecting ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Disconnecting...
                                                        </>
                                                    ) : (
                                                        "Disconnect"
                                                    )}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>

                                {/* Sandbox Token Section */}
                                <Separator className="my-4" />
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Key className="h-4 w-4 text-muted-foreground" />
                                        <Label className="font-medium">Sandbox Access Token</Label>
                                        {vercelStatus?.hasSandboxToken && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Configured
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground">
                                        Required for live preview. Create a token at{" "}
                                        <a 
                                            href="https://vercel.com/account/settings/tokens" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            Vercel Token Settings
                                            <ExternalLink className="ml-1 inline h-3 w-3" />
                                        </a>
                                    </p>

                                    {vercelStatus?.hasSandboxToken ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                                                ••••••••••••••••••••
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove Sandbox Token?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            You won't be able to use live preview until you add a new token.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={removeSandboxToken}
                                                            disabled={removingToken}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            {removingToken ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Removing...
                                                                </>
                                                            ) : (
                                                                "Remove"
                                                            )}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    type={showToken ? "text" : "password"}
                                                    placeholder="Enter your Vercel access token"
                                                    value={sandboxToken}
                                                    onChange={(e) => setSandboxToken(e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                                    onClick={() => setShowToken(!showToken)}
                                                >
                                                    {showToken ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            <Button 
                                                onClick={saveSandboxToken} 
                                                disabled={savingToken || !sandboxToken.trim()}
                                            >
                                                {savingToken ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    "Save Token"
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Connect your Vercel account to enable one-click deployments
                                    for all your Jersen projects.
                                </p>
                                <Button onClick={connectVercel}>
                                    <Link2 className="mr-2 h-4 w-4" />
                                    Connect Vercel Account
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
