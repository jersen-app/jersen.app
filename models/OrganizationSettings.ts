import mongoose, { Schema, model, models } from "mongoose";

export interface IOrganizationSettings {
    orgId: string;
    theme?: string;
    billingEmail?: string;
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
    },
    {
        timestamps: true,
    }
);

const OrganizationSettings =
    models.OrganizationSettings ||
    model<IOrganizationSettings>("OrganizationSettings", OrganizationSettingsSchema);

export default OrganizationSettings;
