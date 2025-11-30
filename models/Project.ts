import mongoose, { Schema, model, models } from "mongoose";

export interface IProjectFile {
    path: string;
    content: string;
    updatedAt: Date;
}

export interface IProject {
    name: string;
    description?: string;
    status: "planning" | "in-progress" | "completed";
    productionStatus?: "none" | "requested" | "quoted" | "in_production" | "deployed";
    orgId: string;
    userId: string;
    apiKey?: string;
    apiKeyHash?: string;
    // Current sandbox URL for CORS whitelist
    sandboxUrl?: string;
    // Store project files directly in the document
    files: IProjectFile[];
    // NPM dependencies to install in sandbox
    dependencies: string[];
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

const ProjectFileSchema = new Schema<IProjectFile>(
    {
        path: { type: String, required: true },
        content: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

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
        productionStatus: {
            type: String,
            enum: ["none", "requested", "quoted", "in_production", "deployed"],
            default: "none",
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
        sandboxUrl: {
            type: String,
        },
        files: {
            type: [ProjectFileSchema],
            default: [],
        },
        dependencies: {
            type: [String],
            default: [],
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
