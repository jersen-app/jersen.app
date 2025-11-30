import mongoose, { Schema, model, models } from "mongoose";

export interface IOrganizationSettings {
    orgId: string;
    theme?: string;
    billingEmail?: string;
    // Sandbox settings (override platform defaults)
    maxSandboxesPerOrg?: number; // null = use platform default
    sandboxTimeoutMinutes?: number; // null = use platform default
    autoPreviewEnabled?: boolean; // null = use platform default
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSettingsSchema = new Schema<IOrganizationSettings>(
    {
        orgId: {
            type: String,
            required: [true, "Organization ID is required"],
            unique: true,
            index: true,
        },
        theme: {
            type: String,
            default: "light",
        },
        billingEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        maxSandboxesPerOrg: {
            type: Number,
            min: 1,
            max: 10,
            default: undefined, // Use platform default
        },
        sandboxTimeoutMinutes: {
            type: Number,
            min: 1,
            max: 60,
            default: undefined, // Use platform default
        },
        autoPreviewEnabled: {
            type: Boolean,
            default: undefined, // Use platform default
        },
    },
    {
        timestamps: true,
    }
);

const OrganizationSettings =
    models.OrganizationSettings ||
    model<IOrganizationSettings>("OrganizationSettings", OrganizationSettingsSchema);

export default OrganizationSettings;
