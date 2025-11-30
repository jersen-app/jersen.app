import mongoose, { Schema, model, models } from "mongoose";

export interface IActiveSandbox {
    orgId: string;
    projectId: string;
    sandboxId: string;
    url: string;
    userId: string; // User who created the sandbox
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ActiveSandboxSchema = new Schema<IActiveSandbox>(
    {
        orgId: {
            type: String,
            required: true,
            index: true,
        },
        projectId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        sandboxId: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            // Note: TTL index is created below with expireAfterSeconds
        },
    },
    {
        timestamps: true,
    }
);

// TTL index to automatically remove expired sandboxes
ActiveSandboxSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for querying org's active sandboxes
ActiveSandboxSchema.index({ orgId: 1, expiresAt: 1 });

const ActiveSandbox =
    models.ActiveSandbox ||
    model<IActiveSandbox>("ActiveSandbox", ActiveSandboxSchema);

export default ActiveSandbox;

/**
 * Get all active sandboxes for an organization
 */
export async function getOrgActiveSandboxes(orgId: string): Promise<IActiveSandbox[]> {
    return await ActiveSandbox.find({
        orgId,
        expiresAt: { $gt: new Date() },
    }).lean();
}

/**
 * Get active sandbox for a specific project
 */
export async function getProjectSandbox(projectId: string): Promise<IActiveSandbox | null> {
    return await ActiveSandbox.findOne({
        projectId,
        expiresAt: { $gt: new Date() },
    }).lean();
}

/**
 * Register a new active sandbox
 */
export async function registerSandbox(
    orgId: string,
    projectId: string,
    sandboxId: string,
    url: string,
    userId: string,
    timeoutMinutes: number
): Promise<IActiveSandbox> {
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    return await ActiveSandbox.findOneAndUpdate(
        { projectId },
        {
            orgId,
            projectId,
            sandboxId,
            url,
            userId,
            expiresAt,
        },
        { upsert: true, new: true }
    ).lean() as IActiveSandbox;
}

/**
 * Remove a sandbox registration
 */
export async function unregisterSandbox(projectId: string): Promise<void> {
    await ActiveSandbox.deleteOne({ projectId });
}

/**
 * Get the oldest sandbox for an org (to kill when limit exceeded)
 */
export async function getOldestOrgSandbox(orgId: string, excludeProjectId?: string): Promise<IActiveSandbox | null> {
    const query: Record<string, unknown> = {
        orgId,
        expiresAt: { $gt: new Date() },
    };
    
    if (excludeProjectId) {
        query.projectId = { $ne: excludeProjectId };
    }
    
    return await ActiveSandbox.findOne(query)
        .sort({ createdAt: 1 })
        .lean();
}
