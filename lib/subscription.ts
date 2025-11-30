import connectToDatabase from "@/lib/db";
import OrganizationSubscription, { 
    IOrganizationSubscription, 
    PLAN_LIMITS, 
    SubscriptionPlan 
} from "@/models/OrganizationSubscription";
import AIUsageLog from "@/models/AIUsageLog";

export interface CreditCheckResult {
    allowed: boolean;
    reason?: string;
    remainingCredits: number;
    hourlyRemaining: number;
    subscription: {
        plan: SubscriptionPlan;
        monthlyCredits: number;
        usedCredits: number;
        bonusCredits: number;
        hourlyLimit: number;
    };
}

/**
 * Check if an organization can make an AI request
 * Returns whether allowed and remaining credits
 */
export async function checkCredits(orgId: string): Promise<CreditCheckResult> {
    await connectToDatabase();
    
    // Get or create subscription
    const subscription = await OrganizationSubscription.getOrCreate(orgId);
    
    // Check monthly credits
    const remainingCredits = Math.max(
        0,
        subscription.monthlyCredits + subscription.bonusCredits - subscription.usedCredits
    );
    
    if (remainingCredits <= 0) {
        return {
            allowed: false,
            reason: "Monthly credit limit reached. Please upgrade your plan or contact support.",
            remainingCredits: 0,
            hourlyRemaining: 0,
            subscription: {
                plan: subscription.plan,
                monthlyCredits: subscription.monthlyCredits,
                usedCredits: subscription.usedCredits,
                bonusCredits: subscription.bonusCredits,
                hourlyLimit: subscription.hourlyLimit,
            },
        };
    }
    
    // Check hourly rate limit
    const hourlyUsage = await AIUsageLog.getHourlyUsage(orgId);
    const hourlyRemaining = Math.max(0, subscription.hourlyLimit - hourlyUsage);
    
    if (hourlyRemaining <= 0) {
        return {
            allowed: false,
            reason: `Hourly rate limit reached (${subscription.hourlyLimit} requests/hour). Please wait before making more requests.`,
            remainingCredits,
            hourlyRemaining: 0,
            subscription: {
                plan: subscription.plan,
                monthlyCredits: subscription.monthlyCredits,
                usedCredits: subscription.usedCredits,
                bonusCredits: subscription.bonusCredits,
                hourlyLimit: subscription.hourlyLimit,
            },
        };
    }
    
    return {
        allowed: true,
        remainingCredits,
        hourlyRemaining,
        subscription: {
            plan: subscription.plan,
            monthlyCredits: subscription.monthlyCredits,
            usedCredits: subscription.usedCredits,
            bonusCredits: subscription.bonusCredits,
            hourlyLimit: subscription.hourlyLimit,
        },
    };
}

/**
 * Consume a credit after a successful AI request
 */
export async function consumeCredit(
    orgId: string,
    userId: string,
    projectId: string,
    requestType: "chat" | "transcribe" | "other" = "chat",
    credits: number = 1,
    metadata?: Record<string, unknown>
): Promise<void> {
    await connectToDatabase();
    
    // Log the usage
    await AIUsageLog.create({
        orgId,
        userId,
        projectId,
        requestType,
        creditsUsed: credits,
        timestamp: new Date(),
        metadata,
    });
    
    // Increment used credits on subscription
    await OrganizationSubscription.updateOne(
        { orgId },
        { $inc: { usedCredits: credits } }
    );
}

/**
 * Get subscription and usage info for an organization
 */
export async function getSubscriptionInfo(orgId: string): Promise<{
    subscription: IOrganizationSubscription;
    hourlyUsage: number;
    remainingCredits: number;
    hourlyRemaining: number;
}> {
    await connectToDatabase();
    
    const subscription = await OrganizationSubscription.getOrCreate(orgId);
    const hourlyUsage = await AIUsageLog.getHourlyUsage(orgId);
    
    const remainingCredits = Math.max(
        0,
        subscription.monthlyCredits + subscription.bonusCredits - subscription.usedCredits
    );
    const hourlyRemaining = Math.max(0, subscription.hourlyLimit - hourlyUsage);
    
    return {
        subscription,
        hourlyUsage,
        remainingCredits,
        hourlyRemaining,
    };
}

/**
 * Update organization subscription plan (admin only)
 */
export async function updateSubscriptionPlan(
    orgId: string,
    plan: SubscriptionPlan,
    adminUserId: string
): Promise<IOrganizationSubscription> {
    await connectToDatabase();
    
    const limits = PLAN_LIMITS[plan];
    
    const subscription = await OrganizationSubscription.findOneAndUpdate(
        { orgId },
        {
            $set: {
                plan,
                monthlyCredits: limits.monthlyCredits,
                hourlyLimit: limits.hourlyLimit,
                updatedBy: adminUserId,
            },
        },
        { new: true, upsert: true }
    );
    
    return subscription!;
}

/**
 * Add bonus credits to an organization (admin only)
 */
export async function addBonusCredits(
    orgId: string,
    credits: number,
    adminUserId: string,
    notes?: string
): Promise<IOrganizationSubscription> {
    await connectToDatabase();
    
    const subscription = await OrganizationSubscription.findOneAndUpdate(
        { orgId },
        {
            $inc: { bonusCredits: credits },
            $set: {
                updatedBy: adminUserId,
                ...(notes && { notes }),
            },
        },
        { new: true, upsert: true }
    );
    
    return subscription!;
}

/**
 * Reset monthly credits (usually called at billing cycle reset)
 */
export async function resetMonthlyCredits(orgId: string): Promise<void> {
    await connectToDatabase();
    
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    await OrganizationSubscription.updateOne(
        { orgId },
        {
            $set: {
                usedCredits: 0,
                billingCycleStart: now,
                billingCycleEnd: nextMonth,
            },
        }
    );
}

/**
 * Get all subscriptions with usage data (admin only)
 */
export async function getAllSubscriptions(): Promise<Array<IOrganizationSubscription & { 
    hourlyUsage: number;
    remainingCredits: number;
}>> {
    await connectToDatabase();
    
    const subscriptions = await OrganizationSubscription.find().sort({ updatedAt: -1 });
    
    // Get hourly usage for each org
    const result = await Promise.all(
        subscriptions.map(async (sub) => {
            const hourlyUsage = await AIUsageLog.getHourlyUsage(sub.orgId);
            const remainingCredits = Math.max(
                0,
                sub.monthlyCredits + sub.bonusCredits - sub.usedCredits
            );
            
            return {
                ...sub.toObject(),
                hourlyUsage,
                remainingCredits,
            };
        })
    );
    
    return result;
}
