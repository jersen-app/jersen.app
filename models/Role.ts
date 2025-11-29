import mongoose, { Schema, model, models } from "mongoose";

export interface IRole {
    name: string;
    permissions: string[];
    orgId: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: [true, "Role name is required"],
            trim: true,
        },
        permissions: {
            type: [String],
            default: [],
        },
        orgId: {
            type: String,
            required: [true, "Organization ID is required"],
            index: true,
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent model recompilation error in development
const Role = models.Role || model<IRole>("Role", RoleSchema);

export default Role;
