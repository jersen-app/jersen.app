import mongoose, { Schema, model, models } from "mongoose";

export interface IProject {
    name: string;
    description?: string;
    status: "planning" | "in-progress" | "completed";
    orgId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
    {
        name: {
            type: String,
            required: [true, "Project name is required"],
            trim: true,
        },
        description: {
            type: String,
        },
        status: {
            type: String,
            enum: ["planning", "in-progress", "completed"],
            default: "planning",
        },
        orgId: {
            type: String,
            required: [true, "Organization ID is required"],
            index: true,
        },
        userId: {
            type: String,
            required: [true, "User ID is required"],
        },
    },
    {
        timestamps: true,
    }
);

const Project = models.Project || model<IProject>("Project", ProjectSchema);

export default Project;
