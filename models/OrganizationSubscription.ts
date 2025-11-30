import mongoose, { Schema, model, models } from "mongoose";

export type SubscriptionPlan = "free" | "pro" | "enterprise";

export interface IOrganizationSubscription {
    orgId: string;
    plan: SubscriptionPlan;
    
    // Credit system
    monthlyCredits: number;        // Total credits per month based on plan
    usedCredits: number;           // Credits used this month
    bonusCredits: number;          // Extra credits added by admin
    
    // Rate limiting
    hourlyLimit: number;           // Max requests per hour based on plan
    
    // Billing cycle
    billingCycleStart: Date;       // Start of current billing cycle
    billingCycleEnd: Date;         // End of current billing cycle
    
    // Metadata
    updatedBy?: string;            // Admin who last updated
    notes?: string;                // Admin notes
    
    createdAt: Date;
    updatedAt: Date;
}

// Plan configurations
export const PLAN_LIMITS: Record<SubscriptionPlan, { monthlyCredits: number; hourlyLimit: number; price: number }> = {
    free: {
        monthlyCredits: 100,
        hourlyLimit: 10,
        price: 0,
    },
    pro: {
        monthlyCredits: 1000,
        hourlyLimit: 100,
        price: 20,
    },
    enterprise: {
        monthlyCredits: 10000,
        hourlyLimit: 1000,
        price: 100,
    },
};

const OrganizationSubscriptionSchema = new Schema<IOrganizationSubscription>(
    {
        orgId: {
            type: String,
            required: [true, "Organization ID is required"],
            unique: true,
            index: true,
        },
        plan: {
            type: String,
            enum: ["free", "pro", "enterprise"],
            default: "free",
        },
        monthlyCredits: {
            type: Number,
            default: PLAN_LIMITS.free.monthlyCredits,
        },
        usedCredits: {
            type: Number,
            default: 0,
        },
        bonusCredits: {
            type: Number,
            default: 0,
        },
        hourlyLimit: {
            type: Number,
            default: PLAN_LIMITS.free.hourlyLimit,
        },
        billingCycleStart: {
            type: Date,
            default: () => new Date(),
        },
        billingCycleEnd: {
            type: Date,
            default: () => {
                const date = new Date();
                date.setMonth(date.getMonth() + 1);
                return date;
            },
        },
        updatedBy: {
            type: String,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Helper methods
OrganizationSubscriptionSchema.methods.getRemainingCredits = function(): number {
    return Math.max(0, this.monthlyCredits + this.bonusCredits - this.usedCredits);
};

OrganizationSubscriptionSchema.methods.canUseCredit = function(): boolean {
    return this.getRemainingCredits() > 0;
};

// Static method to get or create subscription for an org
OrganizationSubscriptionSchema.statics.getOrCreate = async function(orgId: string): Promise<IOrganizationSubscription> {
    let subscription = await this.findOne({ orgId });
    
    if (!subscription) {
        subscription = await this.create({
            orgId,
            plan: "free",
            monthlyCredits: PLAN_LIMITS.free.monthlyCredits,
            hourlyLimit: PLAN_LIMITS.free.hourlyLimit,
        });
    }
    
    // Check if billing cycle needs to be reset
    const now = new Date();
    if (now > subscription.billingCycleEnd) {
        // Reset the cycle
        subscription.billingCycleStart = now;
        subscription.billingCycleEnd = new Date(now);
        subscription.billingCycleEnd.setMonth(subscription.billingCycleEnd.getMonth() + 1);
        subscription.usedCredits = 0;
        await subscription.save();
    }
    
    return subscription;
};

// Create interface for the model with statics
interface OrganizationSubscriptionModel extends mongoose.Model<IOrganizationSubscription> {
    getOrCreate(orgId: string): Promise<IOrganizationSubscription & mongoose.Document>;
}

const OrganizationSubscription =
    (models.OrganizationSubscription as OrganizationSubscriptionModel) ||
    model<IOrganizationSubscription, OrganizationSubscriptionModel>("OrganizationSubscription", OrganizationSubscriptionSchema);

export default OrganizationSubscription;
