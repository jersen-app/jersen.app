import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import OrganizationSubscription, { PLAN_LIMITS, SubscriptionPlan } from "@/models/OrganizationSubscription";
import AIUsageLog from "@/models/AIUsageLog";

const SUPER_ADMIN_USER_IDS = [process.env.SUPER_ADMIN_USER_ID || ""];

async function isSuperAdmin(userId: string): Promise<boolean> {
    return SUPER_ADMIN_USER_IDS.includes(userId);
}

// GET all organizations with their subscriptions
export async function GET(request: NextRequest) {
    const { userId } = await auth();

    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectToDatabase();

        // Get all organizations from Clerk
        const client = await clerkClient();
        const { data: organizations } = await client.organizations.getOrganizationList({
            limit: 100,
        });

        // Get all subscriptions from DB
        const subscriptions = await OrganizationSubscription.find();
        const subscriptionMap = new Map(
            subscriptions.map((sub) => [sub.orgId, sub])
        );

        // Combine org data with subscription data
        const result = await Promise.all(
            organizations.map(async (org) => {
                let subscription = subscriptionMap.get(org.id);

                // If no subscription exists, create a default one
                if (!subscription) {
                    subscription = await OrganizationSubscription.create({
                        orgId: org.id,
                        plan: "free",
                        monthlyCredits: PLAN_LIMITS.free.monthlyCredits,
                        hourlyLimit: PLAN_LIMITS.free.hourlyLimit,
                    });
                }

                // Get hourly usage
                const hourlyUsage = await AIUsageLog.getHourlyUsage(org.id);

                // Calculate remaining credits
                const remainingCredits = Math.max(
                    0,
                    subscription.monthlyCredits + subscription.bonusCredits - subscription.usedCredits
                );

                return {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    imageUrl: org.imageUrl,
                    membersCount: org.membersCount,
                    createdAt: org.createdAt,
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
                };
            })
        );

        return NextResponse.json({
            organizations: result,
            planLimits: PLAN_LIMITS,
        });
    } catch (error) {
        console.error("Failed to fetch organizations:", error);
        return NextResponse.json(
            { error: "Failed to fetch organizations" },
            { status: 500 }
        );
    }
}
