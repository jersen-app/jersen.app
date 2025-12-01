import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import UserStatus from "@/models/UserStatus";

const SUPER_ADMIN_USER_IDS = [process.env.SUPER_ADMIN_USER_ID || ""];

async function isSuperAdmin(userId: string): Promise<boolean> {
    return SUPER_ADMIN_USER_IDS.includes(userId);
}

// POST - Bulk actions on users
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, userIds, reason } = body;

        if (!action || !["approve", "reject"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be 'approve' or 'reject'" },
                { status: 400 }
            );
        }

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: "userIds array is required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const updateData: Record<string, unknown> = {};
        
        if (action === "approve") {
            updateData.status = "approved";
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
            updateData.rejectedBy = undefined;
            updateData.rejectedAt = undefined;
            updateData.rejectionReason = undefined;
        } else if (action === "reject") {
            updateData.status = "rejected";
            updateData.rejectedBy = userId;
            updateData.rejectedAt = new Date();
            updateData.rejectionReason = reason || "Bulk rejection";
            updateData.pendingOrgId = undefined;
            updateData.pendingOrgName = undefined;
        }

        const result = await UserStatus.updateMany(
            { clerkUserId: { $in: userIds } },
            { $set: updateData }
        );

        return NextResponse.json({
            success: true,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Failed to perform bulk action:", error);
        return NextResponse.json(
            { error: "Failed to perform bulk action" },
            { status: 500 }
        );
    }
}
