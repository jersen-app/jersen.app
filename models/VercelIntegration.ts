import mongoose, { Schema, model, models } from "mongoose";

export interface IVercelIntegration {
    userId: string; // Clerk user ID
    orgId?: string; // Optional organization ID
    accessToken: string;
    refreshToken?: string;
    vercelUserId: string;
    vercelTeamId?: string;
    vercelTeamSlug?: string;
    sandboxProjectId?: string; // Vercel project ID used for sandboxes
    tokenExpiresAt?: Date;
    connectedAt: Date;
    updatedAt: Date;
}

const VercelIntegrationSchema = new Schema<IVercelIntegration>(
    {
        userId: {
            type: String,
            required: [true, "User ID is required"],
            index: true,
        },
        orgId: {
            type: String,
            index: true,
        },
        accessToken: {
            type: String,
            required: [true, "Access token is required"],
        },
        refreshToken: {
            type: String,
        },
        vercelUserId: {
            type: String,
            required: true,
        },
        vercelTeamId: {
            type: String,
        },
        vercelTeamSlug: {
            type: String,
        },
        sandboxProjectId: {
            type: String,
        },
        tokenExpiresAt: {
            type: Date,
        },
        connectedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure one integration per user (or per user+org combo)
VercelIntegrationSchema.index({ userId: 1, orgId: 1 }, { unique: true });

const VercelIntegration =
    models.VercelIntegration ||
    model<IVercelIntegration>("VercelIntegration", VercelIntegrationSchema);

export default VercelIntegration;
