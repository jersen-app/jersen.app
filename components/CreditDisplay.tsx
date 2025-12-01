"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Clock, TrendingUp, RefreshCw, Crown, Sparkles, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SubscriptionInfo {
    plan: "free" | "pro" | "enterprise";
    credits: {
        used: number;
        monthly: number;
        bonus: number;
        remaining: number;
        total: number;
    };
    rateLimit: {
        hourlyUsed: number;
        hourlyLimit: number;
        hourlyRemaining: number;
    };
    billingCycle: {
        start: string;
        end: string;
    };
}

const planConfig = {
    free: {
        icon: Sparkles,
        label: "Free",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
    },
    pro: {
        icon: Crown,
        label: "Pro",
        color: "text-violet-600",
        bgColor: "bg-violet-100",
    },
    enterprise: {
        icon: Rocket,
        label: "Enterprise",
        color: "text-amber-600",
        bgColor: "bg-amber-100",
    },
};

export function CreditDisplay({ variant = "full" }: { variant?: "full" | "compact" | "minimal" }) {
    const [data, setData] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchData = useCallback(async (isRetry = false) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch("/api/subscription", {
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 400) {
                    // No organization selected
                    setError("no-org");
                    setLoading(false);
                    return;
                }
                if (response.status === 401 || response.status === 403) {
                    // Auth issue - don't retry
                    setError("auth");
                    setLoading(false);
                    return;
                }
                // For other errors, don't throw - just set error state
                console.warn(`CreditDisplay: API returned ${response.status}`);
                setError("fetch-error");
                setLoading(false);
                return;
            }
            
            const result = await response.json();
            setData(result);
            setError(null);
            setRetryCount(0);
        } catch (err: any) {
            // Handle abort/timeout
            if (err.name === 'AbortError') {
                console.warn("CreditDisplay: Request timed out");
            } else {
                console.warn("CreditDisplay: Fetch error", err.message);
            }
            
            // Only set error if we don't have cached data
            if (!data) {
                setError("fetch-error");
            }
            
            // Auto-retry up to 3 times with exponential backoff (only on initial load)
            if (!isRetry && retryCount < 3 && !data) {
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    fetchData(true);
                }, delay);
            }
        } finally {
            setLoading(false);
        }
    }, [data, retryCount]);

    useEffect(() => {
        fetchData();
        // Refresh every 30 seconds
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleManualRefresh = () => {
        setLoading(true);
        setRetryCount(0);
        fetchData();
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
            </div>
        );
    }

    if (error === "no-org") {
        return null; // Don't show anything if no org is selected
    }

    if (error || !data) {
        return null;
    }

    const config = planConfig[data.plan];
    const PlanIcon = config.icon;
    const creditPercent = Math.round((data.credits.remaining / data.credits.total) * 100);
    const hourlyPercent = Math.round((data.rateLimit.hourlyRemaining / data.rateLimit.hourlyLimit) * 100);

    if (variant === "minimal") {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-sm cursor-help">
                            <Zap className={cn("h-3.5 w-3.5", creditPercent < 20 ? "text-red-500" : config.color)} />
                            <span className={cn("font-medium", creditPercent < 20 && "text-red-500")}>
                                {data.credits.remaining}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="w-64">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Monthly Credits</span>
                                <span className="text-sm font-medium">
                                    {data.credits.remaining} / {data.credits.total}
                                </span>
                            </div>
                            <Progress value={creditPercent} className="h-1.5" />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Hourly Rate</span>
                                <span className="text-sm font-medium">
                                    {data.rateLimit.hourlyRemaining} / {data.rateLimit.hourlyLimit}
                                </span>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (variant === "compact") {
        return (
            <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("gap-1", config.bgColor, config.color)}>
                        <PlanIcon className="h-3 w-3" />
                        {config.label}
                    </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1.5 cursor-help">
                                <Zap className={cn("h-3.5 w-3.5", creditPercent < 20 ? "text-red-500" : "text-muted-foreground")} />
                                <span className={cn(creditPercent < 20 && "text-red-500 font-medium")}>
                                    {data.credits.remaining} / {data.credits.total}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Monthly credits remaining</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1.5 cursor-help">
                                <Clock className={cn("h-3.5 w-3.5", hourlyPercent < 20 ? "text-amber-500" : "text-muted-foreground")} />
                                <span className={cn(hourlyPercent < 20 && "text-amber-500 font-medium")}>
                                    {data.rateLimit.hourlyRemaining} / {data.rateLimit.hourlyLimit}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Requests remaining this hour</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        );
    }

    // Full variant
    return (
        <div className="p-4 border rounded-lg bg-card space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("gap-1.5", config.bgColor, config.color)}>
                        <PlanIcon className="h-3.5 w-3.5" />
                        {config.label} Plan
                    </Badge>
                    {data.credits.bonus > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            +{data.credits.bonus} bonus
                        </Badge>
                    )}
                </div>
                <Button variant="ghost" size="icon" onClick={handleManualRefresh} className="h-8 w-8">
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="space-y-3">
                {/* Monthly Credits */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Zap className="h-3.5 w-3.5" />
                            Monthly Credits
                        </span>
                        <span className={cn("font-medium", creditPercent < 20 && "text-red-500")}>
                            {data.credits.remaining} / {data.credits.total}
                        </span>
                    </div>
                    <Progress 
                        value={creditPercent} 
                        className={cn("h-2", creditPercent < 20 && "[&>div]:bg-red-500")}
                    />
                </div>

                {/* Hourly Rate Limit */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            Hourly Rate
                        </span>
                        <span className={cn("font-medium", hourlyPercent < 20 && "text-amber-500")}>
                            {data.rateLimit.hourlyRemaining} / {data.rateLimit.hourlyLimit}
                        </span>
                    </div>
                    <Progress 
                        value={hourlyPercent} 
                        className={cn("h-2", hourlyPercent < 20 && "[&>div]:bg-amber-500")}
                    />
                </div>
            </div>

            {/* Billing Cycle */}
            <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                    Billing cycle resets {new Date(data.billingCycle.end).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
}

export default CreditDisplay;
