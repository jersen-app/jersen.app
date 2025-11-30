"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface AIModel {
    id: string;
    name: string;
    description: string;
}

interface PlatformSettings {
    aiModel: string;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>("");

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
                body: JSON.stringify({ aiModel: selectedModel }),
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

    const hasChanges = settings?.aiModel !== selectedModel;

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

                    <div className="flex items-center gap-3 pt-4">
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
                </CardContent>
            </Card>

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
