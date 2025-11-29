import mongoose, { Schema, model, models } from "mongoose";

export interface IProjectUser {
    projectId: string;
    projectUserId: string; // Customer-facing user ID
    clerkUserId: string; // Internal Jersen Clerk user ID
    email: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectUserSchema = new Schema<IProjectUser>(
    {
        projectId: {
            type: String,
            required: [true, "Project ID is required"],
            index: true,
        },
        projectUserId: {
            type: String,
            required: [true, "Project User ID is required"],
            index: true,
        },
        clerkUserId: {
            type: String,
            required: [true, "Clerk User ID is required"],
            index: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for project + email uniqueness
ProjectUserSchema.index({ projectId: 1, email: 1 }, { unique: true });

const ProjectUser = models.ProjectUser || model<IProjectUser>("ProjectUser", ProjectUserSchema);

export default ProjectUser;
