"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, Settings2, Box, Play, Users, Building2, Shield, Bug, Cloud, Server } from "lucide-react";
import { toast } from "sonner";

interface AIModel {
    id: string;
    name: string;
    description: string;
}

interface SandboxProviderOption {
    id: string;
    name: string;
    description: string;
}

interface PlatformSettings {
    aiModel: string;
    sandboxProvider: string;
    vercelSandboxTimeout: number;
    maxSandboxesPerOrg: number;
    sandboxTimeoutMinutes: number;
    autoPreviewEnabled: boolean;
    allowPublicSignup: boolean;
    allowPublicOrgCreation: boolean;
    requireOrgApproval: boolean;
    maxOrgsPerUser: number;
    disableDevTools: boolean;
    storageMaxImageSizeMB: number;
    storageMaxVideoSizeMB: number;
    storageDefaultProjectQuotaMB: number;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [sandboxProviders, setSandboxProviders] = useState<SandboxProviderOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [selectedSandboxProvider, setSelectedSandboxProvider] = useState<string>("e2b");
    const [vercelSandboxTimeout, setVercelSandboxTimeout] = useState<number>(10);
    const [maxSandboxes, setMaxSandboxes] = useState<number>(1);
    const [sandboxTimeout, setSandboxTimeout] = useState<number>(10);
    const [autoPreview, setAutoPreview] = useState<boolean>(true);
    const [allowPublicSignup, setAllowPublicSignup] = useState<boolean>(false);
    const [allowPublicOrgCreation, setAllowPublicOrgCreation] = useState<boolean>(false);
    const [requireOrgApproval, setRequireOrgApproval] = useState<boolean>(true);
    const [maxOrgsPerUser, setMaxOrgsPerUser] = useState<number>(1);
    const [disableDevTools, setDisableDevTools] = useState<boolean>(false);
    const [storageMaxImageSizeMB, setStorageMaxImageSizeMB] = useState<number>(5);
    const [storageMaxVideoSizeMB, setStorageMaxVideoSizeMB] = useState<number>(20);
    const [storageDefaultProjectQuotaMB, setStorageDefaultProjectQuotaMB] = useState<number>(100);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const res = await fetch("/api/admin/settings");
            if (!res.ok) throw new Error("Failed to fetch settings");
            const data = await res.json();
            setSettings(data.settings);
            setAvailableModels(data.availableModels);
            setSandboxProviders(data.sandboxProviders || []);
            setSelectedModel(data.settings.aiModel);
            setSelectedSandboxProvider(data.settings.sandboxProvider || "e2b");
            setVercelSandboxTimeout(data.settings.vercelSandboxTimeout ?? 10);
            setMaxSandboxes(data.settings.maxSandboxesPerOrg ?? 1);
            setSandboxTimeout(data.settings.sandboxTimeoutMinutes ?? 10);
            setAutoPreview(data.settings.autoPreviewEnabled ?? true);
            setAllowPublicSignup(data.settings.allowPublicSignup ?? false);
            setAllowPublicOrgCreation(data.settings.allowPublicOrgCreation ?? false);
            setRequireOrgApproval(data.settings.requireOrgApproval ?? true);
            setMaxOrgsPerUser(data.settings.maxOrgsPerUser ?? 1);
            setDisableDevTools(data.settings.disableDevTools ?? false);
            setStorageMaxImageSizeMB(data.settings.storageMaxImageSizeMB ?? 5);
            setStorageMaxVideoSizeMB(data.settings.storageMaxVideoSizeMB ?? 20);
            setStorageDefaultProjectQuotaMB(data.settings.storageDefaultProjectQuotaMB ?? 100);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    aiModel: selectedModel,
                    sandboxProvider: selectedSandboxProvider,
                    vercelSandboxTimeout,
                    maxSandboxesPerOrg: maxSandboxes,
                    sandboxTimeoutMinutes: sandboxTimeout,
                    autoPreviewEnabled: autoPreview,
                    allowPublicSignup,
                    allowPublicOrgCreation,
                    requireOrgApproval,
                    maxOrgsPerUser,
                    disableDevTools,
                    storageMaxImageSizeMB,
                    storageMaxVideoSizeMB,
                    storageDefaultProjectQuotaMB,
                }),
            });

            if (!res.ok) throw new Error("Failed to save");

            const data = await res.json();
            setSettings(data.settings);
            toast.success("Settings saved successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const hasChanges = settings?.aiModel !== selectedModel || 
        settings?.sandboxProvider !== selectedSandboxProvider ||
        settings?.vercelSandboxTimeout !== vercelSandboxTimeout ||
        settings?.maxSandboxesPerOrg !== maxSandboxes ||
        settings?.sandboxTimeoutMinutes !== sandboxTimeout ||
        settings?.autoPreviewEnabled !== autoPreview ||
        settings?.allowPublicSignup !== allowPublicSignup ||
        settings?.allowPublicOrgCreation !== allowPublicOrgCreation ||
        settings?.requireOrgApproval !== requireOrgApproval ||
        settings?.maxOrgsPerUser !== maxOrgsPerUser ||
        settings?.disableDevTools !== disableDevTools;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Platform Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Configure global platform settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        AI Model Configuration
                    </CardTitle>
                    <CardDescription>
                        Choose which AI model to use for all chat interactions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-model">AI Model</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger id="ai-model" className="w-full max-w-md">
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{model.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {model.description}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Current: <code className="bg-muted px-1 py-0.5 rounded">{settings?.aiModel}</code>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sandbox Provider Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Sandbox Provider
                    </CardTitle>
                    <CardDescription>
                        Choose which sandbox provider to use for project previews.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Provider Selection */}
                    <div className="space-y-3">
                        <Label>Sandbox Provider</Label>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {sandboxProviders.map((provider) => (
                                <button
                                    key={provider.id}
                                    type="button"
                                    onClick={() => setSelectedSandboxProvider(provider.id)}
                                    className={`rounded-lg border p-4 text-left transition-colors ${
                                        selectedSandboxProvider === provider.id
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-950"
                                            : "hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {provider.id === "e2b" && <Server className="h-4 w-4" />}
                                        {provider.id === "vercel" && <Cloud className="h-4 w-4" />}
                                        {provider.id === "both" && (
                                            <div className="flex -space-x-1">
                                                <Cloud className="h-4 w-4" />
                                                <Server className="h-4 w-4" />
                                            </div>
                                        )}
                                        <span className="font-medium">{provider.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {provider.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Current: <code className="bg-muted px-1 py-0.5 rounded">{settings?.sandboxProvider || "e2b"}</code>
                        </p>
                    </div>

                    {/* Vercel Sandbox Timeout (only show if vercel or both is selected) */}
                    {(selectedSandboxProvider === "vercel" || selectedSandboxProvider === "both") && (
                        <div className="space-y-2">
                            <Label htmlFor="vercel-timeout">Vercel Sandbox Timeout</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="vercel-timeout"
                                    type="number"
                                    min={5}
                                    max={10}
                                    value={vercelSandboxTimeout}
                                    onChange={(e) => setVercelSandboxTimeout(parseInt(e.target.value) || 10)}
                                    className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">
                                    minutes
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Preview timeout: 5-10 minutes. Short timeouts encourage efficient development.
                            </p>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 text-sm">
                        <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">How it works:</p>
                        <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                            <li>• <strong>E2B Only:</strong> All previews use E2B sandbox (billed to platform)</li>
                            <li>• <strong>Vercel Only:</strong> Users must connect their Vercel account to preview</li>
                            <li>• <strong>Both:</strong> Uses Vercel if user connected, otherwise falls back to E2B</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Sandbox Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5" />
                        E2B Sandbox Settings
                    </CardTitle>
                    <CardDescription>
                        Configure E2B sandbox defaults. These apply when using E2B as the sandbox provider.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Max Sandboxes Per Org */}
                    <div className="space-y-2">
                        <Label htmlFor="max-sandboxes">Max Sandboxes per Organization</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="max-sandboxes"
                                type="number"
                                min={1}
                                max={10}
                                value={maxSandboxes}
                                onChange={(e) => setMaxSandboxes(parseInt(e.target.value) || 1)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                                sandboxes
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            When this limit is reached, the oldest sandbox will be automatically killed to make room for new ones.
                        </p>
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
                                value={sandboxTimeout}
                                onChange={(e) => setSandboxTimeout(parseInt(e.target.value) || 10)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                                minutes
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sandboxes will automatically be killed after this duration of inactivity.
                        </p>
                    </div>

                    {/* Auto Preview */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="auto-preview" className="font-medium">
                                    Auto Preview
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Automatically start or update sandbox preview when AI generates files.
                            </p>
                        </div>
                        <Switch
                            id="auto-preview"
                            checked={autoPreview}
                            onCheckedChange={setAutoPreview}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* User Access Control Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        User Access Control
                    </CardTitle>
                    <CardDescription>
                        Configure how users sign up and access the platform.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Allow Public Signup */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="public-signup" className="font-medium">
                                    Allow Public Signup
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                When enabled, anyone can sign up and access the platform immediately.
                                When disabled, new users are placed on a waitlist for approval.
                            </p>
                        </div>
                        <Switch
                            id="public-signup"
                            checked={allowPublicSignup}
                            onCheckedChange={setAllowPublicSignup}
                        />
                    </div>

                    {/* Allow Public Org Creation */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="public-org" className="font-medium">
                                    Allow Public Organization Creation
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                When enabled, approved users can create organizations immediately.
                                When disabled, users need admin approval to create organizations.
                            </p>
                        </div>
                        <Switch
                            id="public-org"
                            checked={allowPublicOrgCreation}
                            onCheckedChange={setAllowPublicOrgCreation}
                        />
                    </div>

                    {/* Require Org Approval */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="org-approval" className="font-medium">
                                    Require Organization Approval
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                When enabled, new organizations need admin approval before they become active.
                                This applies even when public org creation is enabled.
                            </p>
                        </div>
                        <Switch
                            id="org-approval"
                            checked={requireOrgApproval}
                            onCheckedChange={setRequireOrgApproval}
                        />
                    </div>

                    {/* Max Orgs Per User */}
                    <div className="space-y-2">
                        <Label htmlFor="max-orgs">Max Organizations per User</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="max-orgs"
                                type="number"
                                min={1}
                                max={10}
                                value={maxOrgsPerUser}
                                onChange={(e) => setMaxOrgsPerUser(parseInt(e.target.value) || 1)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                                organization(s)
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Maximum number of organizations a user can create. They can join unlimited organizations as members.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Storage Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Storage Settings
                    </CardTitle>
                    <CardDescription>
                        Configure storage limits and quotas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Max Image Size */}
                        <div className="space-y-2">
                            <Label htmlFor="max-image-size">Max Image Size (MB)</Label>
                            <Input
                                id="max-image-size"
                                type="number"
                                min="1"
                                value={storageMaxImageSizeMB}
                                onChange={(e) => setStorageMaxImageSizeMB(parseInt(e.target.value) || 5)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum file size for image uploads.
                            </p>
                        </div>

                        {/* Max Video Size */}
                        <div className="space-y-2">
                            <Label htmlFor="max-video-size">Max Video Size (MB)</Label>
                            <Input
                                id="max-video-size"
                                type="number"
                                min="1"
                                value={storageMaxVideoSizeMB}
                                onChange={(e) => setStorageMaxVideoSizeMB(parseInt(e.target.value) || 20)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum file size for video uploads.
                            </p>
                        </div>

                        {/* Default Project Quota */}
                        <div className="space-y-2">
                            <Label htmlFor="default-quota">Default Project Quota (MB)</Label>
                            <Input
                                id="default-quota"
                                type="number"
                                min="1"
                                value={storageDefaultProjectQuotaMB}
                                onChange={(e) => setStorageDefaultProjectQuotaMB(parseInt(e.target.value) || 100)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Default storage quota for new projects.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5" />
                        Security Settings
                    </CardTitle>
                    <CardDescription>
                        Configure security-related platform settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Disable DevTools */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Bug className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="disable-devtools" className="font-medium">
                                    Disable Browser DevTools
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                When enabled, attempts to open browser DevTools (F12, right-click inspect) 
                                will refresh the page. Note: This can be bypassed by advanced users.
                            </p>
                        </div>
                        <Switch
                            id="disable-devtools"
                            checked={disableDevTools}
                            onCheckedChange={setDisableDevTools}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <Button 
                    onClick={handleSave} 
                    disabled={saving || !hasChanges}
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
                {hasChanges && (
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                        Unsaved changes
                    </span>
                )}
            </div>

            {/* Info Card */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="pt-6">
                    <h3 className="font-medium mb-2">Model Comparison</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            <strong>Gemini 2.5 Flash:</strong> Faster response times, good for most tasks. 
                            Lower cost per request.
                        </p>
                        <p>
                            <strong>Gemini 2.5 Pro Preview:</strong> More capable for complex reasoning and 
                            code generation. Higher cost but better quality for difficult tasks.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Waitlist Info Card */}
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                    <h3 className="font-medium mb-2">User Access Flow</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            <strong>Public Signup OFF + Org Approval ON:</strong> Users sign up → Land on waitlist → 
                            Admin approves → User can create/join orgs (orgs may need approval too)
                        </p>
                        <p>
                            <strong>Public Signup ON + Org Approval ON:</strong> Users sign up → Instant access → 
                            User creates org → Admin approves org
                        </p>
                        <p>
                            <strong>Public Signup ON + Org Approval OFF:</strong> Full open access - anyone can 
                            sign up and create organizations immediately.
                        </p>
                        <p className="text-xs pt-2 border-t border-amber-200 dark:border-amber-700">
                            Note: Users invited to an organization by existing members bypass the waitlist. 
                            Each user can create up to {settings?.maxOrgsPerUser || 1} organization(s) but can join unlimited orgs as a member.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
