import mongoose, { Schema, model, models } from "mongoose";

export interface IAIUsageLog {
    orgId: string;
    userId: string;
    projectId: string;
    
    // Request details
    requestType: "chat" | "transcribe" | "other";
    creditsUsed: number;
    
    // For rate limiting queries
    timestamp: Date;
    
    // Optional metadata
    metadata?: {
        messageLength?: number;
        hasAttachments?: boolean;
        model?: string;
    };
    
    createdAt: Date;
}

const AIUsageLogSchema = new Schema<IAIUsageLog>(
    {
        orgId: {
            type: String,
            required: [true, "Organization ID is required"],
            index: true,
        },
        userId: {
            type: String,
            required: [true, "User ID is required"],
            index: true,
        },
        projectId: {
            type: String,
            required: [true, "Project ID is required"],
        },
        requestType: {
            type: String,
            enum: ["chat", "transcribe", "other"],
            default: "chat",
        },
        creditsUsed: {
            type: Number,
            default: 1,
        },
        timestamp: {
            type: Date,
            default: () => new Date(),
            index: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient rate limit queries
AIUsageLogSchema.index({ orgId: 1, timestamp: -1 });
AIUsageLogSchema.index({ orgId: 1, userId: 1, timestamp: -1 });

// Static method to count requests in the last hour for an org
AIUsageLogSchema.statics.getHourlyUsage = async function(orgId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await this.aggregate([
        {
            $match: {
                orgId,
                timestamp: { $gte: oneHourAgo },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$creditsUsed" },
            },
        },
    ]);
    
    return result[0]?.total || 0;
};

// Static method to get usage stats for an org
AIUsageLogSchema.statics.getUsageStats = async function(
    orgId: string,
    startDate: Date,
    endDate: Date
): Promise<{ total: number; byUser: Record<string, number>; byDay: Record<string, number> }> {
    const result = await this.aggregate([
        {
            $match: {
                orgId,
                timestamp: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $facet: {
                total: [
                    { $group: { _id: null, sum: { $sum: "$creditsUsed" } } },
                ],
                byUser: [
                    { $group: { _id: "$userId", sum: { $sum: "$creditsUsed" } } },
                ],
                byDay: [
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                            },
                            sum: { $sum: "$creditsUsed" },
                        },
                    },
                ],
            },
        },
    ]);
    
    const data = result[0];
    
    return {
        total: data.total[0]?.sum || 0,
        byUser: Object.fromEntries(data.byUser.map((u: { _id: string; sum: number }) => [u._id, u.sum])),
        byDay: Object.fromEntries(data.byDay.map((d: { _id: string; sum: number }) => [d._id, d.sum])),
    };
};

// Create interface for the model with statics
interface AIUsageLogModel extends mongoose.Model<IAIUsageLog> {
    getHourlyUsage(orgId: string): Promise<number>;
    getUsageStats(
        orgId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{ total: number; byUser: Record<string, number>; byDay: Record<string, number> }>;
}

const AIUsageLog =
    (models.AIUsageLog as AIUsageLogModel) ||
    model<IAIUsageLog, AIUsageLogModel>("AIUsageLog", AIUsageLogSchema);

export default AIUsageLog;
