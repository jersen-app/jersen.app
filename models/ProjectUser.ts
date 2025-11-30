import mongoose, { Schema, model, models } from "mongoose";

export interface IProjectUser {
    projectId: string;
    projectUserId?: string; // Customer-facing user ID (optional, auto-generated)
    clerkUserId?: string; // Internal Jersen Clerk user ID (optional for OAuth)
    email: string;
    name?: string;
    avatarUrl?: string;
    provider?: string; // OAuth provider: google, facebook, tiktok, etc.
    providerId?: string; // OAuth provider user ID
    passwordHash?: string; // For email/password auth
    lastLoginAt?: Date;
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
            index: true,
        },
        clerkUserId: {
            type: String,
            index: true,
            sparse: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        avatarUrl: {
            type: String,
        },
        provider: {
            type: String,
            default: "email",
        },
        providerId: {
            type: String,
            sparse: true,
        },
        passwordHash: {
            type: String,
        },
        lastLoginAt: {
            type: Date,
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

// Generate projectUserId before save if not set
ProjectUserSchema.pre("save", function () {
    if (!this.projectUserId) {
        this.projectUserId = new mongoose.Types.ObjectId().toString();
    }
});

export const ProjectUserModel = models.ProjectUser || model<IProjectUser>("ProjectUser", ProjectUserSchema);

export default ProjectUserModel;
