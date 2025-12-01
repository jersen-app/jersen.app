import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import UserStatus from "@/models/UserStatus";

// This webhook/API handles when a user is invited to an organization
// It updates the user's status to allow them to bypass the waitlist

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, orgId, orgName } = body;

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "userId and orgId are required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Update or create user status with the org invitation
        const userStatus = await UserStatus.findOneAndUpdate(
            { clerkUserId: userId },
            {
                $addToSet: { invitedToOrgs: orgId },
                $setOnInsert: {
                    clerkUserId: userId,
                    email: "", // Will be populated later
                    status: "waiting",
                    createdOrgsCount: 0,
                },
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            userStatus: userStatus.toObject(),
        });
    } catch (error) {
        console.error("Failed to update user org invitation:", error);
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 }
        );
    }
}

// GET - Check if a user can be invited (for admin UI)
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
        return NextResponse.json(
            { error: "userId is required" },
            { status: 400 }
        );
    }

    try {
        await connectToDatabase();
        
        const userStatus = await UserStatus.findOne({ clerkUserId: targetUserId }).lean();
        
        return NextResponse.json({
            exists: !!userStatus,
            status: userStatus?.status || null,
            invitedToOrgs: userStatus?.invitedToOrgs || [],
        });
    } catch (error) {
        console.error("Failed to check user:", error);
        return NextResponse.json(
            { error: "Failed to check user" },
            { status: 500 }
        );
    }
}
