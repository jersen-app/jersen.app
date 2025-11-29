import mongoose, { Schema, model, models } from "mongoose";

export interface IChatMessage {
    projectId: string;
    role: "user" | "assistant" | "system";
    content: string;
    files?: Record<string, string>; // Generated files if AI created code
    metadata?: {
        toolCalls?: Array<{
            name: string;
            args: Record<string, unknown>;
        }>;
        fileChanges?: Array<{
            path: string;
            content: string;
            changeType: "created" | "modified" | "deleted";
            description: string;
        }>;
        todos?: Array<{
            id: number;
            title: string;
            status: "not-started" | "in-progress" | "completed";
            description?: string;
        }>;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
    {
        projectId: {
            type: String,
            required: [true, "Project ID is required"],
            index: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant", "system"],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        files: {
            type: Schema.Types.Mixed,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
ChatMessageSchema.index({ projectId: 1, createdAt: 1 });

const ChatMessage = models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessage;
