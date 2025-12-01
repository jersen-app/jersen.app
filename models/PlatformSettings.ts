import mongoose, { Schema, model, models } from "mongoose";

export const AI_MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast and efficient" },
    { id: "gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro Preview", description: "Most capable, slower" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", description: "Latest but not stable" },
] as const;

export type AIModelId = typeof AI_MODELS[number]["id"];

export interface IPlatformSettings {
    _id: string;
    aiModel: AIModelId;
    // Sandbox settings
    maxSandboxesPerOrg: number; // Max concurrent sandboxes per organization (default: 1)
    sandboxTimeoutMinutes: number; // Sandbox auto-kill timeout in minutes (default: 10)
    autoPreviewEnabled: boolean; // Whether to auto-start preview after AI generates files
    // User & Organization access control
    allowPublicSignup: boolean; // If false, users land on waitlist after signup
    allowPublicOrgCreation: boolean; // If true, anyone can create orgs without approval
    requireOrgApproval: boolean; // If true, new orgs created by users need admin approval
    maxOrgsPerUser: number; // Max orgs a user can create (default: 1), can join unlimited
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
        maxSandboxesPerOrg: 1,
        sandboxTimeoutMinutes: 10,
        autoPreviewEnabled: true,
        allowPublicSignup: false,
        allowPublicOrgCreation: false,
        requireOrgApproval: true,
        maxOrgsPerUser: 1,
    });
    
    return defaultSettings.toObject();
}
