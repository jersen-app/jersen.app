import mongoose, { Schema, model, models } from "mongoose";

export interface IProject {
    name: string;
    description?: string;
    status: "planning" | "in-progress" | "completed";
    orgId: string;
    userId: string;
    apiKey?: string;
    apiKeyHash?: string;
    providers: {
        auth: {
            enabled: boolean;
        };
        storage: {
            enabled: boolean;
            quota: number; // in MB
        };
        database: {
            enabled: boolean;
            dbName?: string;
            credentials?: {
                username: string;
                password: string;
            };
        };
    };
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
        apiKey: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        apiKeyHash: {
            type: String,
        },
        providers: {
            type: {
                auth: {
                    enabled: { type: Boolean, default: true },
                },
                storage: {
                    enabled: { type: Boolean, default: true },
                    quota: { type: Number, default: 1024 }, // 1GB default
                },
                database: {
                    enabled: { type: Boolean, default: true },
                    dbName: String,
                    credentials: {
                        username: String,
                        password: String,
                    },
                },
            },
            default: {
                auth: { enabled: true },
                storage: { enabled: true, quota: 1024 },
                database: { enabled: true },
            },
        },
    },
    {
        timestamps: true,
    }
);

const Project = models.Project || model<IProject>("Project", ProjectSchema);

export default Project;
