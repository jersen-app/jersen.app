"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SandboxState {
    sandboxId: string | null;
    url: string | null;
    status: "idle" | "creating" | "running" | "updating" | "error";
    error: string | null;
    expiresAt: number | null;
    warning: string | null;
}

interface SandboxSettings {
    maxSandboxesPerOrg: number;
    sandboxTimeoutMinutes: number;
    autoPreviewEnabled: boolean;
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
    });

    const [settings, setSettings] = useState<SandboxSettings>({
        maxSandboxesPerOrg: 1,
        sandboxTimeoutMinutes: 10,
        autoPreviewEnabled: true,
    });

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

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Create sandbox
    const create = useCallback(
        async (files?: Record<string, string>) => {
            setState((prev) => ({ ...prev, status: "creating", error: null }));

            try {
                const response = await fetch(`/api/projects/${projectId}/sandbox`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "create", files }),
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
        [projectId, settings.sandboxTimeoutMinutes]
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
                    body: JSON.stringify({ action: "update", files }),
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
        [projectId, state.status, create]
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
                body: JSON.stringify({ action: "destroy" }),
            });

            setState({
                sandboxId: null,
                url: null,
                status: "idle",
                error: null,
                expiresAt: null,
            });

            filesRef.current = {};
        } catch (error) {
            console.error("Failed to destroy sandbox:", error);
        }
    }, [projectId]);

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
        create,
        update,
        createOrUpdate,
        destroy,
        getUrl,
        isLoading: state.status === "creating" || state.status === "updating",
        autoPreviewEnabled: settings.autoPreviewEnabled,
    };
}
