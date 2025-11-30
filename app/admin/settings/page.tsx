"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, Settings2, Box, Play } from "lucide-react";
import { toast } from "sonner";

interface AIModel {
    id: string;
    name: string;
    description: string;
}

interface PlatformSettings {
    aiModel: string;
    maxSandboxesPerOrg: number;
    sandboxTimeoutMinutes: number;
    autoPreviewEnabled: boolean;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [maxSandboxes, setMaxSandboxes] = useState<number>(1);
    const [sandboxTimeout, setSandboxTimeout] = useState<number>(10);
    const [autoPreview, setAutoPreview] = useState<boolean>(true);

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
            setSelectedModel(data.settings.aiModel);
            setMaxSandboxes(data.settings.maxSandboxesPerOrg ?? 1);
            setSandboxTimeout(data.settings.sandboxTimeoutMinutes ?? 10);
            setAutoPreview(data.settings.autoPreviewEnabled ?? true);
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
                    maxSandboxesPerOrg: maxSandboxes,
                    sandboxTimeoutMinutes: sandboxTimeout,
                    autoPreviewEnabled: autoPreview,
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
        settings?.maxSandboxesPerOrg !== maxSandboxes ||
        settings?.sandboxTimeoutMinutes !== sandboxTimeout ||
        settings?.autoPreviewEnabled !== autoPreview;

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

            {/* Sandbox Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5" />
                        Sandbox Settings
                    </CardTitle>
                    <CardDescription>
                        Configure E2B sandbox defaults for all organizations. These can be overridden per-organization.
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
        </div>
    );
}
