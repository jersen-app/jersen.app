import mongoose, { Schema, model, models } from "mongoose";

export const AI_MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast and efficient" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Most capable, slower" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", description: "Latest but not stable" },
] as const;

export type AIModelId = typeof AI_MODELS[number]["id"];

// Sandbox provider options
export type SandboxProvider = "e2b" | "vercel" | "both";

export const SANDBOX_PROVIDERS = [
    { 
        id: "e2b" as const, 
        name: "E2B Only", 
        description: "Use E2B sandbox for all users (platform cost)" 
    },
    { 
        id: "vercel" as const, 
        name: "Vercel Sandbox Only", 
        description: "Require users to connect Vercel account for preview" 
    },
    { 
        id: "both" as const, 
        name: "Both (Recommended)", 
        description: "Vercel if connected, E2B as fallback" 
    },
] as const;

export interface IPlatformSettings {
    _id: string;
    aiModel: AIModelId;
    // Sandbox provider settings
    sandboxProvider: SandboxProvider; // Which sandbox provider to use
    vercelSandboxTimeout: number; // Vercel sandbox timeout in minutes (max 45 for hobby, 300 for pro)
    // Sandbox settings (E2B)
    e2bTemplateId: string; // E2B template ID to use for sandboxes
    maxSandboxesPerOrg: number; // Max concurrent sandboxes per organization (default: 1)
    sandboxTimeoutMinutes: number; // Sandbox auto-kill timeout in minutes (default: 10)
    autoPreviewEnabled: boolean; // Whether to auto-start preview after AI generates files
    // User & Organization access control
    allowPublicSignup: boolean; // If false, users land on waitlist after signup
    allowPublicOrgCreation: boolean; // If true, anyone can create orgs without approval
    requireOrgApproval: boolean; // If true, new orgs created by users need admin approval
    maxOrgsPerUser: number; // Max orgs a user can create (default: 1), can join unlimited
    // Security settings
    disableDevTools: boolean; // If true, attempts to open DevTools will refresh the page
    // Storage settings
    storageMaxImageSizeMB: number; // Max size for image uploads in MB
    storageMaxVideoSizeMB: number; // Max size for video uploads in MB
    storageDefaultProjectQuotaMB: number; // Default storage quota per project in MB
    createdAt: Date;
    updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
    {
        _id: {
            type: String,
            default: "platform_settings",
        },
        aiModel: {
            type: String,
            enum: AI_MODELS.map(m => m.id),
            default: "gemini-2.5-flash",
        },
        // Sandbox provider
        sandboxProvider: {
            type: String,
            enum: ["e2b", "vercel", "both"],
            default: "e2b",
        },
        vercelSandboxTimeout: {
            type: Number,
            default: 10,
            min: 5,
            max: 10, // Keep short for preview (5-10 min)
        },
        e2bTemplateId: {
            type: String,
            default: "nextjs-developer-song-dev",
        },
        maxSandboxesPerOrg: {
            type: Number,
            default: 1,
            min: 1,
            max: 10,
        },
        sandboxTimeoutMinutes: {
            type: Number,
            default: 10,
            min: 1,
            max: 60,
        },
        autoPreviewEnabled: {
            type: Boolean,
            default: true,
        },
        // User & Organization access control
        allowPublicSignup: {
            type: Boolean,
            default: false, // By default, users land on waitlist
        },
        allowPublicOrgCreation: {
            type: Boolean,
            default: false, // By default, users need approval to create orgs
        },
        requireOrgApproval: {
            type: Boolean,
            default: true, // By default, new orgs need admin approval
        },
        maxOrgsPerUser: {
            type: Number,
            default: 1,
            min: 1,
            max: 10,
        },
        // Security settings
        disableDevTools: {
            type: Boolean,
            default: false, // Disabled by default
        },
        // Storage settings
        storageMaxImageSizeMB: {
            type: Number,
            default: 5,
        },
        storageMaxVideoSizeMB: {
            type: Number,
            default: 20,
        },
        storageDefaultProjectQuotaMB: {
            type: Number,
            default: 100,
        },
    },
    {
        timestamps: true,
    }
);

const PlatformSettings =
    models.PlatformSettings ||
    model<IPlatformSettings>("PlatformSettings", PlatformSettingsSchema);

export default PlatformSettings;

// Helper to get current settings
export async function getPlatformSettings(): Promise<IPlatformSettings> {
    const settings = await PlatformSettings.findById("platform_settings").lean();
    if (settings) {
        return settings as IPlatformSettings;
    }
    
    // Create default settings if not exists
    const defaultSettings = await PlatformSettings.create({
        _id: "platform_settings",
        aiModel: "gemini-2.5-flash",
        sandboxProvider: "e2b",
        vercelSandboxTimeout: 10,
        e2bTemplateId: "nextjs-developer-song-dev",
        maxSandboxesPerOrg: 1,
        sandboxTimeoutMinutes: 10,
        autoPreviewEnabled: true,
        allowPublicSignup: false,
        allowPublicOrgCreation: false,
        requireOrgApproval: true,
        maxOrgsPerUser: 1,
        disableDevTools: false,
    });
    
    return defaultSettings.toObject();
}
