import mongoose, { Schema, model, models } from "mongoose";

export interface IProjectMemory {
    projectId: string;
    orgId: string;
    
    // Summary of the conversation/project
    summary: string;
    
    // Key decisions made
    decisions: Array<{
        decision: string;
        reason: string;
        timestamp: Date;
    }>;
    
    // Technologies/patterns being used
    techStack: string[];
    
    // Important context to remember
    context: Array<{
        key: string;
        value: string;
    }>;
    
    // Last updated message count (to know when to re-summarize)
    lastSummarizedAt: Date;
    messageCountAtSummary: number;
    
    createdAt: Date;
    updatedAt: Date;
}

const ProjectMemorySchema = new Schema<IProjectMemory>(
    {
        projectId: {
            type: String,
            required: [true, "Project ID is required"],
            unique: true,
            index: true,
        },
        orgId: {
            type: String,
            required: [true, "Organization ID is required"],
            index: true,
        },
        summary: {
            type: String,
            default: "",
        },
        decisions: [{
            decision: String,
            reason: String,
            timestamp: { type: Date, default: Date.now },
        }],
        techStack: [{
            type: String,
        }],
        context: [{
            key: String,
            value: String,
        }],
        lastSummarizedAt: {
            type: Date,
            default: Date.now,
        },
        messageCountAtSummary: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const ProjectMemory = models.ProjectMemory || model<IProjectMemory>("ProjectMemory", ProjectMemorySchema);

export default ProjectMemory;
