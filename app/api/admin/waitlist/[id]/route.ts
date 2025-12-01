import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import UserStatus from "@/models/UserStatus";

const SUPER_ADMIN_USER_IDS = [process.env.SUPER_ADMIN_USER_ID || ""];

async function isSuperAdmin(userId: string): Promise<boolean> {
    return SUPER_ADMIN_USER_IDS.includes(userId);
}

// GET single user status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await connectToDatabase();

        const userStatus = await UserStatus.findOne({ clerkUserId: id }).lean();
        if (!userStatus) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get Clerk user details
        const client = await clerkClient();
        let clerkDetails = null;
        try {
            const clerkUser = await client.users.getUser(id);
            clerkDetails = {
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                imageUrl: clerkUser.imageUrl,
                emailAddresses: clerkUser.emailAddresses,
                createdAt: clerkUser.createdAt,
                lastActiveAt: clerkUser.lastActiveAt,
            };
        } catch {
            // User might have been deleted
        }

        // Get user's organization memberships
        let organizations: { id: string; name: string; role: string }[] = [];
        try {
            const memberships = await client.users.getOrganizationMembershipList({ userId: id });
            organizations = memberships.data.map(m => ({
                id: m.organization.id,
                name: m.organization.name,
                role: m.role,
            }));
        } catch {
            // Ignore errors
        }

        return NextResponse.json({
            userStatus,
            clerkDetails,
            organizations,
        });
    } catch (error) {
        console.error("Failed to fetch user:", error);
        return NextResponse.json(
            { error: "Failed to fetch user" },
            { status: 500 }
        );
    }
}

// PATCH - Update user status (approve/reject)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { action, reason, adminNotes, allowOrgCreation } = body;

        if (!action || !["approve", "reject", "reset"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be 'approve', 'reject', or 'reset'" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const userStatus = await UserStatus.findOne({ clerkUserId: id });
        if (!userStatus) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (action === "approve") {
            userStatus.status = "approved";
            userStatus.approvedBy = userId;
            userStatus.approvedAt = new Date();
            userStatus.rejectedBy = undefined;
            userStatus.rejectedAt = undefined;
            userStatus.rejectionReason = undefined;
            
            // If allowOrgCreation is true and user had a pending org, approve it
            if (allowOrgCreation && userStatus.pendingOrgId) {
                // The org creation would be handled by Clerk webhook
                // Here we just mark user as able to create orgs
                userStatus.createdOrgsCount = 0; // Reset so they can create
            }
        } else if (action === "reject") {
            userStatus.status = "rejected";
            userStatus.rejectedBy = userId;
            userStatus.rejectedAt = new Date();
            userStatus.rejectionReason = reason || "Application rejected";
            // Clear pending org if rejected
            userStatus.pendingOrgId = undefined;
            userStatus.pendingOrgName = undefined;
        } else if (action === "reset") {
            userStatus.status = "waiting";
            userStatus.approvedBy = undefined;
            userStatus.approvedAt = undefined;
            userStatus.rejectedBy = undefined;
            userStatus.rejectedAt = undefined;
            userStatus.rejectionReason = undefined;
        }

        if (adminNotes !== undefined) {
            userStatus.adminNotes = adminNotes;
        }

        await userStatus.save();

        return NextResponse.json({
            success: true,
            userStatus: userStatus.toObject(),
        });
    } catch (error) {
        console.error("Failed to update user status:", error);
        return NextResponse.json(
            { error: "Failed to update user status" },
            { status: 500 }
        );
    }
}

// DELETE - Remove user from waitlist (and optionally delete from Clerk)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const { searchParams } = new URL(request.url);
        const deleteFromClerk = searchParams.get("deleteFromClerk") === "true";

        await connectToDatabase();

        await UserStatus.findOneAndDelete({ clerkUserId: id });

        if (deleteFromClerk) {
            try {
                const client = await clerkClient();
                await client.users.deleteUser(id);
            } catch (error) {
                console.error("Failed to delete user from Clerk:", error);
                // Continue anyway
            }
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("Failed to delete user:", error);
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
