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
    });
    
    return defaultSettings.toObject();
}
