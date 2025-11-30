import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSubscriptionInfo } from "@/lib/subscription";

// GET current organization's subscription info
export async function GET() {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
        return NextResponse.json(
            { error: "No organization selected" },
            { status: 400 }
        );
    }

    try {
        const info = await getSubscriptionInfo(orgId);

        return NextResponse.json({
            plan: info.subscription.plan,
            credits: {
                used: info.subscription.usedCredits,
                monthly: info.subscription.monthlyCredits,
                bonus: info.subscription.bonusCredits,
                remaining: info.remainingCredits,
                total: info.subscription.monthlyCredits + info.subscription.bonusCredits,
            },
            rateLimit: {
                hourlyUsed: info.hourlyUsage,
                hourlyLimit: info.subscription.hourlyLimit,
                hourlyRemaining: info.hourlyRemaining,
            },
            billingCycle: {
                start: info.subscription.billingCycleStart,
                end: info.subscription.billingCycleEnd,
            },
        });
    } catch (error) {
        console.error("Failed to get subscription info:", error);
        return NextResponse.json(
            { error: "Failed to get subscription info" },
            { status: 500 }
        );
    }
}
