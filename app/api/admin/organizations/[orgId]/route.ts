import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import OrganizationSubscription, { PLAN_LIMITS, SubscriptionPlan } from "@/models/OrganizationSubscription";
import AIUsageLog from "@/models/AIUsageLog";

const SUPER_ADMIN_USER_IDS = [process.env.SUPER_ADMIN_USER_ID || ""];

async function isSuperAdmin(userId: string): Promise<boolean> {
    return SUPER_ADMIN_USER_IDS.includes(userId);
}

// GET single organization subscription details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { userId } = await auth();

    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    try {
        await connectToDatabase();

        // Get org from Clerk
        const client = await clerkClient();
        const org = await client.organizations.getOrganization({ organizationId: orgId });

        // Get or create subscription
        const subscription = await OrganizationSubscription.getOrCreate(orgId);
        const hourlyUsage = await AIUsageLog.getHourlyUsage(orgId);

        // Get usage stats for current billing cycle
        const usageStats = await AIUsageLog.getUsageStats(
            orgId,
            subscription.billingCycleStart,
            subscription.billingCycleEnd
        );

        // Calculate remaining credits
        const remainingCredits = Math.max(
            0,
            subscription.monthlyCredits + subscription.bonusCredits - subscription.usedCredits
        );

        return NextResponse.json({
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                imageUrl: org.imageUrl,
                membersCount: org.membersCount,
                createdAt: org.createdAt,
            },
            subscription: {
                plan: subscription.plan,
                monthlyCredits: subscription.monthlyCredits,
                usedCredits: subscription.usedCredits,
                bonusCredits: subscription.bonusCredits,
                remainingCredits,
                hourlyLimit: subscription.hourlyLimit,
                hourlyUsage,
                billingCycleStart: subscription.billingCycleStart,
                billingCycleEnd: subscription.billingCycleEnd,
                updatedBy: subscription.updatedBy,
                notes: subscription.notes,
            },
            usageStats,
            planLimits: PLAN_LIMITS,
        });
    } catch (error) {
        console.error("Failed to fetch organization:", error);
        return NextResponse.json(
            { error: "Failed to fetch organization" },
            { status: 500 }
        );
    }
}

// PATCH - Update subscription (plan, bonus credits, notes)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { userId } = await auth();

    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    try {
        const body = await request.json();
        const { plan, addBonusCredits, notes, resetCredits } = body;

        await connectToDatabase();

        // Get current subscription
        let subscription = await OrganizationSubscription.getOrCreate(orgId);

        const updates: Record<string, unknown> = {
            updatedBy: userId,
        };

        // Update plan if provided
        if (plan && Object.keys(PLAN_LIMITS).includes(plan)) {
            const planLimits = PLAN_LIMITS[plan as SubscriptionPlan];
            updates.plan = plan;
            updates.monthlyCredits = planLimits.monthlyCredits;
            updates.hourlyLimit = planLimits.hourlyLimit;
        }

        // Add bonus credits if provided
        if (typeof addBonusCredits === "number" && addBonusCredits !== 0) {
            updates.bonusCredits = subscription.bonusCredits + addBonusCredits;
        }

        // Update notes if provided
        if (notes !== undefined) {
            updates.notes = notes;
        }

        // Reset used credits if requested
        if (resetCredits === true) {
            updates.usedCredits = 0;
            updates.billingCycleStart = new Date();
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            updates.billingCycleEnd = nextMonth;
        }

        // Apply updates
        const updatedSubscription = await OrganizationSubscription.findOneAndUpdate(
            { orgId },
            { $set: updates },
            { new: true }
        );

        if (!updatedSubscription) {
            return NextResponse.json(
                { error: "Subscription not found" },
                { status: 404 }
            );
        }

        const hourlyUsage = await AIUsageLog.getHourlyUsage(orgId);
        const remainingCredits = Math.max(
            0,
            updatedSubscription.monthlyCredits + updatedSubscription.bonusCredits - updatedSubscription.usedCredits
        );

        return NextResponse.json({
            success: true,
            subscription: {
                plan: updatedSubscription.plan,
                monthlyCredits: updatedSubscription.monthlyCredits,
                usedCredits: updatedSubscription.usedCredits,
                bonusCredits: updatedSubscription.bonusCredits,
                remainingCredits,
                hourlyLimit: updatedSubscription.hourlyLimit,
                hourlyUsage,
                billingCycleStart: updatedSubscription.billingCycleStart,
                billingCycleEnd: updatedSubscription.billingCycleEnd,
                updatedBy: updatedSubscription.updatedBy,
                notes: updatedSubscription.notes,
            },
        });
    } catch (error) {
        console.error("Failed to update subscription:", error);
        return NextResponse.json(
            { error: "Failed to update subscription" },
            { status: 500 }
        );
    }
}
