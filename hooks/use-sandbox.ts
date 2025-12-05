"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SandboxState {
    sandboxId: string | null;
    url: string | null;
    status: "idle" | "creating" | "running" | "updating" | "error";
    error: string | null;
    expiresAt: number | null;
    warning: string | null;
    provider: "e2b" | "vercel" | null;
}

interface SandboxSettings {
    maxSandboxesPerOrg: number;
    sandboxTimeoutMinutes: number;
    autoPreviewEnabled: boolean;
}

interface SandboxProviderConfig {
    sandboxProvider: "e2b" | "vercel" | "both";
    hasVercelConnected: boolean;
    hasSandboxToken: boolean;
    requiresVercelConnection: boolean;
    activeProvider: "e2b" | "vercel";
}

interface UseSandboxOptions {
    projectId: string;
    autoCreate?: boolean;
}

export function useSandbox({ projectId, autoCreate = false }: UseSandboxOptions) {
    const [state, setState] = useState<SandboxState>({
        sandboxId: null,
        url: null,
        status: "idle",
        error: null,
        expiresAt: null,
        warning: null,
        provider: null,
    });

    const [settings, setSettings] = useState<SandboxSettings>({
        maxSandboxesPerOrg: 1,
        sandboxTimeoutMinutes: 10,
        autoPreviewEnabled: true,
    });

    const [providerConfig, setProviderConfig] = useState<SandboxProviderConfig>({
        sandboxProvider: "e2b",
        hasVercelConnected: false,
        hasSandboxToken: false,
        requiresVercelConnection: false,
        activeProvider: "e2b",
    });

    // Track if config has been loaded to prevent race conditions
    const [configLoaded, setConfigLoaded] = useState(false);

    const filesRef = useRef<Record<string, string>>({});

    // Fetch sandbox settings
    const fetchSettings = useCallback(async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/sandbox`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get-settings" }),
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data.settings);
            }
        } catch {
            // Use defaults
        }
    }, [projectId]);

    // Fetch provider config (platform settings + user's Vercel status)
    const fetchProviderConfig = useCallback(async () => {
        try {
            const [platformRes, vercelRes] = await Promise.all([
                fetch("/api/platform/settings"),
                fetch("/api/integrations/vercel/status"),
            ]);

            let sandboxProvider: "e2b" | "vercel" | "both" = "e2b";
            let hasVercelConnected = false;
            let hasSandboxToken = false;

            if (platformRes.ok) {
                const { settings } = await platformRes.json();
                sandboxProvider = settings?.sandboxProvider || "e2b";
            }

            if (vercelRes.ok) {
                const data = await vercelRes.json();
                hasVercelConnected = data.connected;
                hasSandboxToken = data.hasSandboxToken || false;
            }

            // Determine active provider and if connection is required
            let activeProvider: "e2b" | "vercel" = "e2b";
            let requiresVercelConnection = false;

            if (sandboxProvider === "vercel") {
                // For Vercel-only mode, need both OAuth connection AND sandbox token
                if (hasVercelConnected && hasSandboxToken) {
                    activeProvider = "vercel";
                } else {
                    requiresVercelConnection = true;
                }
            } else if (sandboxProvider === "both") {
                // For "both" mode, prefer Vercel if fully configured, fallback to E2B
                activeProvider = (hasVercelConnected && hasSandboxToken) ? "vercel" : "e2b";
            }

            setProviderConfig({
                sandboxProvider,
                hasVercelConnected,
                hasSandboxToken,
                requiresVercelConnection,
                activeProvider,
            });
        } catch {
            // Use defaults on error
        } finally {
            // Mark config as loaded even if there was an error
            setConfigLoaded(true);
        }
    }, []);

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
        fetchProviderConfig();
    }, [fetchSettings, fetchProviderConfig]);

    // Create sandbox
    const create = useCallback(
        async (files?: Record<string, string>) => {
            // Wait for config to be loaded before proceeding
            if (!configLoaded) {
                setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: "Loading configuration...",
                }));
                return null;
            }

            // Check if Vercel connection is required but not connected
            if (providerConfig.requiresVercelConnection) {
                setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: "Vercel connection required. Please connect your Vercel account to preview projects.",
                }));
                return null;
            }

            setState((prev) => ({ ...prev, status: "creating", error: null }));

            try {
                const response = await fetch(`/api/projects/${projectId}/sandbox`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        action: "create", 
                        files,
                        provider: providerConfig.activeProvider,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to create sandbox");
                }

                const data = await response.json();
                
                if (files) {
                    filesRef.current = files;
                }

                setState({
                    sandboxId: data.sandboxId,
                    url: data.url,
                    status: "running",
                    error: null,
                    expiresAt: Date.now() + settings.sandboxTimeoutMinutes * 60 * 1000,
                    warning: data.warning || null,
                    provider: data.provider || providerConfig.activeProvider,
                });

                return data;
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to create sandbox";
                setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: message,
                }));
                throw error;
            }
        },
        [projectId, settings.sandboxTimeoutMinutes, providerConfig, configLoaded]
    );

    // Update files in sandbox
    const update = useCallback(
        async (files: Record<string, string>) => {
            if (state.status !== "running") {
                // Create new sandbox if not running
                return create(files);
            }

            setState((prev) => ({ ...prev, status: "updating" }));

            try {
                const response = await fetch(`/api/projects/${projectId}/sandbox`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        action: "update", 
                        files,
                        provider: state.provider || providerConfig.activeProvider,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    // If sandbox expired, create new one
                    if (response.status === 404) {
                        return create(files);
                    }
                    throw new Error(data.error || "Failed to update sandbox");
                }

                const data = await response.json();
                filesRef.current = { ...filesRef.current, ...files };

                setState((prev) => ({
                    ...prev,
                    url: data.url,
                    status: "running",
                }));

                return data;
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to update sandbox";
                setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: message,
                }));
                throw error;
            }
        },
        [projectId, state.status, state.provider, create, providerConfig.activeProvider]
    );

    // Create or update sandbox (auto-preview helper)
    const createOrUpdate = useCallback(
        async (files: Record<string, string>) => {
            if (state.status === "running") {
                return update(files);
            } else {
                return create(files);
            }
        },
        [state.status, create, update]
    );

    // Destroy sandbox
    const destroy = useCallback(async () => {
        try {
            await fetch(`/api/projects/${projectId}/sandbox`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    action: "destroy",
                    provider: state.provider || providerConfig.activeProvider,
                }),
            });

            setState({
                sandboxId: null,
                url: null,
                status: "idle",
                error: null,
                expiresAt: null,
                warning: null,
                provider: null,
            });

            filesRef.current = {};
        } catch (error) {
            console.error("Failed to destroy sandbox:", error);
        }
    }, [projectId, state.provider, providerConfig.activeProvider]);

    // Get current URL
    const getUrl = useCallback(async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/sandbox`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get-url" }),
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            setState((prev) => ({
                ...prev,
                sandboxId: data.sandboxId,
                url: data.url,
                status: "running",
                expiresAt: data.expiresAt,
            }));

            return data.url;
        } catch {
            return null;
        }
    }, [projectId]);

    // Auto-create sandbox on mount if requested
    useEffect(() => {
        if (autoCreate && state.status === "idle") {
            getUrl().then((url) => {
                if (!url) {
                    // No existing sandbox, could auto-create here
                }
            });
        }
    }, [autoCreate, state.status, getUrl]);

    return {
        ...state,
        settings,
        providerConfig,
        configLoaded,
        create,
        update,
        createOrUpdate,
        destroy,
        getUrl,
        isLoading: state.status === "creating" || state.status === "updating",
        autoPreviewEnabled: settings.autoPreviewEnabled,
        requiresVercelConnection: providerConfig.requiresVercelConnection,
        hasVercelConnected: providerConfig.hasVercelConnected,
        hasSandboxToken: providerConfig.hasSandboxToken,
        activeProvider: providerConfig.activeProvider,
    };
}
