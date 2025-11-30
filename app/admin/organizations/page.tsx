"use client";

import { useState, useEffect } from "react";
import { 
    Building2, 
    Users, 
    Zap, 
    CreditCard,
    TrendingUp,
    Clock,
    RefreshCw,
    ChevronDown,
    Plus,
    Minus,
    Save,
    Sparkles,
    Crown,
    Rocket,
    Box,
    Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subscription {
    plan: "free" | "pro" | "enterprise";
    monthlyCredits: number;
    usedCredits: number;
    bonusCredits: number;
    remainingCredits: number;
    hourlyLimit: number;
    hourlyUsage: number;
    billingCycleStart: string;
    billingCycleEnd: string;
    updatedBy?: string;
    notes?: string;
}

interface SandboxSettings {
    maxSandboxesPerOrg: number | null;
    sandboxTimeoutMinutes: number | null;
    autoPreviewEnabled: boolean | null;
}

interface PlatformDefaults {
    maxSandboxesPerOrg: number;
    sandboxTimeoutMinutes: number;
    autoPreviewEnabled: boolean;
}

interface Organization {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    membersCount: number;
    createdAt: number;
    subscription: Subscription;
    sandboxSettings?: SandboxSettings;
    platformDefaults?: PlatformDefaults;
}

interface PlanLimits {
    free: { monthlyCredits: number; hourlyLimit: number; price: number };
    pro: { monthlyCredits: number; hourlyLimit: number; price: number };
    enterprise: { monthlyCredits: number; hourlyLimit: number; price: number };
}

const planIcons = {
    free: Sparkles,
    pro: Crown,
    enterprise: Rocket,
};

const planColors = {
    free: "bg-gray-100 text-gray-700 border-gray-200",
    pro: "bg-violet-100 text-violet-700 border-violet-200",
    enterprise: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    
    // Edit form state
    const [editPlan, setEditPlan] = useState<"free" | "pro" | "enterprise">("free");
    const [bonusCreditsToAdd, setBonusCreditsToAdd] = useState(0);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Sandbox settings state
    const [useCustomSandbox, setUseCustomSandbox] = useState(false);
    const [maxSandboxes, setMaxSandboxes] = useState<number | null>(null);
    const [sandboxTimeout, setSandboxTimeout] = useState<number | null>(null);
    const [autoPreview, setAutoPreview] = useState<boolean | null>(null);
    const [platformDefaults, setPlatformDefaults] = useState<PlatformDefaults | null>(null);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/organizations");
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            setOrganizations(data.organizations);
            setPlanLimits(data.planLimits);
        } catch (error) {
            toast.error("Failed to load organizations");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const openEditDialog = async (org: Organization) => {
        setSelectedOrg(org);
        setEditPlan(org.subscription.plan);
        setBonusCreditsToAdd(0);
        setNotes(org.subscription.notes || "");
        
        // Fetch org details to get sandbox settings
        try {
            const res = await fetch(`/api/admin/organizations/${org.id}`);
            if (res.ok) {
                const data = await res.json();
                const settings = data.sandboxSettings || {};
                const defaults = data.platformDefaults || { maxSandboxesPerOrg: 1, sandboxTimeoutMinutes: 10, autoPreviewEnabled: true };
                
                setPlatformDefaults(defaults);
                setMaxSandboxes(settings.maxSandboxesPerOrg);
                setSandboxTimeout(settings.sandboxTimeoutMinutes);
                setAutoPreview(settings.autoPreviewEnabled);
                setUseCustomSandbox(
                    settings.maxSandboxesPerOrg !== null || 
                    settings.sandboxTimeoutMinutes !== null || 
                    settings.autoPreviewEnabled !== null
                );
            }
        } catch (error) {
            console.error("Failed to fetch org details:", error);
        }
        
        setEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedOrg) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/admin/organizations/${selectedOrg.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: editPlan,
                    addBonusCredits: bonusCreditsToAdd,
                    notes,
                    // Sandbox settings (null = use platform default)
                    maxSandboxesPerOrg: useCustomSandbox ? maxSandboxes : null,
                    sandboxTimeoutMinutes: useCustomSandbox ? sandboxTimeout : null,
                    autoPreviewEnabled: useCustomSandbox ? autoPreview : null,
                }),
            });

            if (!response.ok) throw new Error("Failed to update");

            const data = await response.json();
            
            // Update local state
            setOrganizations((prev) =>
                prev.map((org) =>
                    org.id === selectedOrg.id
                        ? { ...org, subscription: data.subscription }
                        : org
                )
            );

            toast.success("Organization updated successfully");
            setEditDialogOpen(false);
        } catch (error) {
            toast.error("Failed to update organization");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleResetCredits = async () => {
        if (!selectedOrg) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/admin/organizations/${selectedOrg.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resetCredits: true,
                }),
            });

            if (!response.ok) throw new Error("Failed to reset");

            const data = await response.json();
            
            setOrganizations((prev) =>
                prev.map((org) =>
                    org.id === selectedOrg.id
                        ? { ...org, subscription: data.subscription }
                        : org
                )
            );

            toast.success("Credits reset successfully");
            setEditDialogOpen(false);
        } catch (error) {
            toast.error("Failed to reset credits");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const getUsagePercentage = (used: number, total: number) => {
        if (total === 0) return 0;
        return Math.min(100, Math.round((used / total) * 100));
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    const totalOrgs = organizations.length;
    const proOrgs = organizations.filter((o) => o.subscription.plan === "pro").length;
    const enterpriseOrgs = organizations.filter((o) => o.subscription.plan === "enterprise").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground">
                        Manage organization subscriptions and credits
                    </p>
                </div>
                <Button variant="outline" onClick={fetchOrganizations}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrgs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Free Plan</CardTitle>
                        <Sparkles className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrgs - proOrgs - enterpriseOrgs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pro Plan</CardTitle>
                        <Crown className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{proOrgs}</div>
                        <p className="text-xs text-muted-foreground">
                            ${proOrgs * 20}/month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Enterprise Plan</CardTitle>
                        <Rocket className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{enterpriseOrgs}</div>
                        <p className="text-xs text-muted-foreground">
                            ${enterpriseOrgs * 100}/month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Organizations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>
                        Click on an organization to manage their subscription
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Monthly Credits</TableHead>
                                <TableHead>Hourly Limit</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.map((org) => {
                                const PlanIcon = planIcons[org.subscription.plan];
                                const usagePercent = getUsagePercentage(
                                    org.subscription.usedCredits,
                                    org.subscription.monthlyCredits + org.subscription.bonusCredits
                                );

                                return (
                                    <TableRow key={org.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {org.imageUrl ? (
                                                    <img
                                                        src={org.imageUrl}
                                                        alt={org.name}
                                                        className="h-8 w-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                                                        <Building2 className="h-4 w-4 text-violet-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{org.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {org.slug}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "capitalize",
                                                    planColors[org.subscription.plan]
                                                )}
                                            >
                                                <PlanIcon className="mr-1 h-3 w-3" />
                                                {org.subscription.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">
                                                        {org.subscription.remainingCredits}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        / {org.subscription.monthlyCredits + org.subscription.bonusCredits}
                                                    </span>
                                                    {org.subscription.bonusCredits > 0 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{org.subscription.bonusCredits} bonus
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            usagePercent > 90
                                                                ? "bg-red-500"
                                                                : usagePercent > 70
                                                                ? "bg-amber-500"
                                                                : "bg-green-500"
                                                        )}
                                                        style={{ width: `${100 - usagePercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {org.subscription.hourlyUsage} / {org.subscription.hourlyLimit}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                {org.membersCount}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(org)}
                                            >
                                                Manage
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedOrg?.imageUrl ? (
                                <img
                                    src={selectedOrg.imageUrl}
                                    alt={selectedOrg.name}
                                    className="h-6 w-6 rounded-full"
                                />
                            ) : (
                                <Building2 className="h-5 w-5" />
                            )}
                            {selectedOrg?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Manage subscription, credits, and sandbox settings
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrg && (
                        <Tabs defaultValue="subscription" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                                <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="subscription" className="space-y-6 py-4">
                                {/* Current Usage */}
                                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                    <h4 className="text-sm font-medium">Current Usage</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Monthly:</span>
                                            <span className="ml-2 font-medium">
                                                {selectedOrg.subscription.usedCredits} / {selectedOrg.subscription.monthlyCredits + selectedOrg.subscription.bonusCredits}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Hourly:</span>
                                            <span className="ml-2 font-medium">
                                                {selectedOrg.subscription.hourlyUsage} / {selectedOrg.subscription.hourlyLimit}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Plan Selection */}
                                <div className="space-y-2">
                                    <Label>Subscription Plan</Label>
                                    <Select value={editPlan} onValueChange={(v) => setEditPlan(v as typeof editPlan)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="free">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4" />
                                                    <span>Free</span>
                                                    <span className="text-muted-foreground">
                                                        - 100 credits/mo, 10/hr
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pro">
                                                <div className="flex items-center gap-2">
                                                    <Crown className="h-4 w-4 text-violet-500" />
                                                    <span>Pro</span>
                                                    <span className="text-muted-foreground">
                                                        - 1,000 credits/mo, 100/hr ($20/mo)
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="enterprise">
                                                <div className="flex items-center gap-2">
                                                    <Rocket className="h-4 w-4 text-amber-500" />
                                                    <span>Enterprise</span>
                                                    <span className="text-muted-foreground">
                                                        - 10,000 credits/mo, 1,000/hr ($100/mo)
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Bonus Credits */}
                                <div className="space-y-2">
                                    <Label>Add Bonus Credits</Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setBonusCreditsToAdd(Math.max(-1000, bonusCreditsToAdd - 100))}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={bonusCreditsToAdd}
                                            onChange={(e) => setBonusCreditsToAdd(parseInt(e.target.value) || 0)}
                                            className="text-center"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setBonusCreditsToAdd(bonusCreditsToAdd + 100)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Current bonus: {selectedOrg.subscription.bonusCredits} credits
                                        {bonusCreditsToAdd !== 0 && (
                                            <span className={bonusCreditsToAdd > 0 ? "text-green-600" : "text-red-600"}>
                                                {" → "}
                                                {selectedOrg.subscription.bonusCredits + bonusCreditsToAdd} credits
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label>Admin Notes</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Internal notes about this subscription..."
                                        rows={3}
                                    />
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="sandbox" className="space-y-6 py-4">
                                {/* Custom Sandbox Settings Toggle */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Box className="h-4 w-4 text-muted-foreground" />
                                            <Label className="font-medium">
                                                Custom Sandbox Settings
                                            </Label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Override platform defaults for this organization
                                        </p>
                                    </div>
                                    <Switch
                                        checked={useCustomSandbox}
                                        onCheckedChange={(checked) => {
                                            setUseCustomSandbox(checked);
                                            if (!checked) {
                                                // Reset to defaults
                                                setMaxSandboxes(null);
                                                setSandboxTimeout(null);
                                                setAutoPreview(null);
                                            } else {
                                                // Set to platform defaults
                                                setMaxSandboxes(platformDefaults?.maxSandboxesPerOrg ?? 1);
                                                setSandboxTimeout(platformDefaults?.sandboxTimeoutMinutes ?? 10);
                                                setAutoPreview(platformDefaults?.autoPreviewEnabled ?? true);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Platform Defaults Info */}
                                {!useCustomSandbox && platformDefaults && (
                                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                        <h4 className="text-sm font-medium">Using Platform Defaults</h4>
                                        <div className="space-y-1 text-sm text-muted-foreground">
                                            <p>Max sandboxes: {platformDefaults.maxSandboxesPerOrg}</p>
                                            <p>Timeout: {platformDefaults.sandboxTimeoutMinutes} minutes</p>
                                            <p>Auto preview: {platformDefaults.autoPreviewEnabled ? "Enabled" : "Disabled"}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Custom Settings */}
                                {useCustomSandbox && (
                                    <>
                                        {/* Max Sandboxes */}
                                        <div className="space-y-2">
                                            <Label htmlFor="max-sandboxes">Max Sandboxes</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="max-sandboxes"
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    value={maxSandboxes ?? 1}
                                                    onChange={(e) => setMaxSandboxes(parseInt(e.target.value) || 1)}
                                                    className="w-24"
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    concurrent sandboxes
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sandbox Timeout */}
                                        <div className="space-y-2">
                                            <Label htmlFor="sandbox-timeout">Sandbox Timeout</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="sandbox-timeout"
                                                    type="number"
                                                    min={1}
                                                    max={60}
                                                    value={sandboxTimeout ?? 10}
                                                    onChange={(e) => setSandboxTimeout(parseInt(e.target.value) || 10)}
                                                    className="w-24"
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    minutes
                                                </span>
                                            </div>
                                        </div>

                                        {/* Auto Preview */}
                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Play className="h-4 w-4 text-muted-foreground" />
                                                    <Label className="font-medium">
                                                        Auto Preview
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Auto-start preview when AI generates files
                                                </p>
                                            </div>
                                            <Switch
                                                checked={autoPreview ?? true}
                                                onCheckedChange={setAutoPreview}
                                            />
                                        </div>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={handleResetCredits}
                            disabled={saving}
                            className="text-amber-600 hover:text-amber-700"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset Cycle
                        </Button>
                        <div className="flex-1" />
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
