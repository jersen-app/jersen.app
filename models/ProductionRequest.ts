import mongoose, { Schema, model, models } from "mongoose";

export interface IProductionRequest {
    projectId: string;
    projectName: string;
    orgId: string;
    userId: string;
    userEmail: string;
    userName: string;
    description: string;
    budgetRange?: "under_500" | "500_1000" | "1000_2500" | "2500_5000" | "5000_plus" | "need_quote";
    priority: "low" | "medium" | "high" | "urgent";
    status: "pending" | "reviewing" | "quoted" | "accepted" | "in_progress" | "completed" | "rejected";
    quote?: {
        amount: number;
        currency: string;
        description: string;
        estimatedDays: number;
        createdAt: Date;
    };
    adminNotes?: string;
    telegramContact?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProductionRequestSchema = new Schema<IProductionRequest>(
    {
        projectId: {
            type: String,
            required: [true, "Project ID is required"],
            index: true,
        },
        projectName: {
            type: String,
            required: [true, "Project name is required"],
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
        userEmail: {
            type: String,
            required: [true, "User email is required"],
        },
        userName: {
            type: String,
            required: [true, "User name is required"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
        },
        budgetRange: {
            type: String,
            enum: ["under_500", "500_1000", "1000_2500", "2500_5000", "5000_plus", "need_quote"],
            default: "need_quote",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        status: {
            type: String,
            enum: ["pending", "reviewing", "quoted", "accepted", "in_progress", "completed", "rejected"],
            default: "pending",
        },
        quote: {
            type: {
                amount: Number,
                currency: { type: String, default: "USD" },
                description: String,
                estimatedDays: Number,
                createdAt: Date,
            },
            required: false,
        },
        adminNotes: {
            type: String,
        },
        telegramContact: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const ProductionRequest = models.ProductionRequest || model<IProductionRequest>("ProductionRequest", ProductionRequestSchema);

export default ProductionRequest;
