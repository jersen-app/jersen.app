import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import UserStatus, { canUserCreateOrg } from "@/models/UserStatus";
import { getPlatformSettings } from "@/models/PlatformSettings";

// GET - Check if current user can create an organization
export async function GET() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectToDatabase();
        
        const platformSettings = await getPlatformSettings();
        
        // Get user status
        let userStatus = await UserStatus.findOne({ clerkUserId: userId });
        
        if (!userStatus) {
            // User doesn't have a status yet - create one
            const email = user.emailAddresses[0]?.emailAddress || "";
            userStatus = await UserStatus.create({
                clerkUserId: userId,
                email,
                status: platformSettings.allowPublicSignup ? "approved" : "waiting",
                createdOrgsCount: 0,
            });
        }

        // Check if user can create org
        const canCreate = await canUserCreateOrg(userId, platformSettings.maxOrgsPerUser);

        return NextResponse.json({
            canCreate: canCreate.canCreate,
            reason: canCreate.reason,
            createdOrgsCount: userStatus.createdOrgsCount,
            maxOrgsPerUser: platformSettings.maxOrgsPerUser,
            allowPublicOrgCreation: platformSettings.allowPublicOrgCreation,
            requireOrgApproval: platformSettings.requireOrgApproval,
            pendingOrgName: userStatus.pendingOrgName,
        });
    } catch (error) {
        console.error("Failed to check org creation eligibility:", error);
        return NextResponse.json(
            { error: "Failed to check eligibility" },
            { status: 500 }
        );
    }
}

// POST - Record that a user created an organization (or wants to)
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { orgId, orgName, action } = body;

        await connectToDatabase();
        
        const platformSettings = await getPlatformSettings();
        const email = user.emailAddresses[0]?.emailAddress || "";

        // Get or create user status
        let userStatus = await UserStatus.findOne({ clerkUserId: userId });
        
        if (!userStatus) {
            userStatus = await UserStatus.create({
                clerkUserId: userId,
                email,
                status: platformSettings.allowPublicSignup ? "approved" : "waiting",
                createdOrgsCount: 0,
            });
        }

        // Check limits
        const canCreate = await canUserCreateOrg(userId, platformSettings.maxOrgsPerUser);
        if (!canCreate.canCreate) {
            return NextResponse.json(
                { error: canCreate.reason, canCreate: false },
                { status: 400 }
            );
        }

        if (action === "request") {
            // User is requesting to create an org (needs approval)
            if (!platformSettings.allowPublicOrgCreation || platformSettings.requireOrgApproval) {
                userStatus.pendingOrgName = orgName;
                await userStatus.save();
                
                return NextResponse.json({
                    success: true,
                    status: "pending_approval",
                    message: "Your organization request is pending admin approval",
                });
            }
        }

        if (action === "created") {
            // User has created an org (either auto-approved or after admin approval)
            userStatus.createdOrgsCount += 1;
            userStatus.pendingOrgId = undefined;
            userStatus.pendingOrgName = undefined;
            await userStatus.save();
            
            return NextResponse.json({
                success: true,
                createdOrgsCount: userStatus.createdOrgsCount,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to record org creation:", error);
        return NextResponse.json(
            { error: "Failed to record org creation" },
            { status: 500 }
        );
    }
}
