import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import UserStatus, { createWaitingUser, canUserAccessPlatform } from "@/models/UserStatus";
import { getPlatformSettings } from "@/models/PlatformSettings";

// GET - Check current user's status
export async function GET() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectToDatabase();
        
        const platformSettings = await getPlatformSettings();
        
        // If public signup is allowed, everyone can access
        if (platformSettings.allowPublicSignup) {
            return NextResponse.json({
                canAccess: true,
                status: "approved",
                publicSignupEnabled: true,
            });
        }

        const accessCheck = await canUserAccessPlatform(userId);
        const userStatus = await UserStatus.findOne({ clerkUserId: userId }).lean();

        return NextResponse.json({
            canAccess: accessCheck.canAccess,
            status: accessCheck.status,
            reason: accessCheck.reason,
            userStatus: userStatus ? {
                pendingOrgName: userStatus.pendingOrgName,
                invitedToOrgs: userStatus.invitedToOrgs,
                createdAt: userStatus.createdAt,
            } : null,
            settings: {
                allowPublicOrgCreation: platformSettings.allowPublicOrgCreation,
                maxOrgsPerUser: platformSettings.maxOrgsPerUser,
            },
        });
    } catch (error) {
        console.error("Failed to check user status:", error);
        return NextResponse.json(
            { error: "Failed to check status" },
            { status: 500 }
        );
    }
}

// POST - Register user for waitlist (called after signup)
export async function POST() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectToDatabase();
        
        const platformSettings = await getPlatformSettings();
        const email = user.emailAddresses[0]?.emailAddress || "";

        // Check if user already exists
        let userStatus = await UserStatus.findOne({ clerkUserId: userId });

        if (userStatus) {
            return NextResponse.json({
                success: true,
                status: userStatus.status,
                alreadyRegistered: true,
            });
        }

        // If public signup is allowed, auto-approve
        if (platformSettings.allowPublicSignup) {
            userStatus = await UserStatus.create({
                clerkUserId: userId,
                email,
                status: "approved",
                approvedAt: new Date(),
                createdOrgsCount: 0,
            });

            return NextResponse.json({
                success: true,
                status: "approved",
                autoApproved: true,
            });
        }

        // Otherwise, add to waitlist
        userStatus = await createWaitingUser(userId, email);

        return NextResponse.json({
            success: true,
            status: "waiting",
        });
    } catch (error) {
        console.error("Failed to register user:", error);
        return NextResponse.json(
            { error: "Failed to register" },
            { status: 500 }
        );
    }
}
