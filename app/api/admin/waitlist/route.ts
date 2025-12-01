import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import UserStatus from "@/models/UserStatus";
import { getPlatformSettings } from "@/models/PlatformSettings";

const SUPER_ADMIN_USER_IDS = [process.env.SUPER_ADMIN_USER_ID || ""];

async function isSuperAdmin(userId: string): Promise<boolean> {
    return SUPER_ADMIN_USER_IDS.includes(userId);
}

// GET all users in waitlist or by status
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId || !(await isSuperAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectToDatabase();
        
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // waiting, approved, rejected, or null for all
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = {};
        if (status) {
            query.status = status;
        }

        const [users, total] = await Promise.all([
            UserStatus.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            UserStatus.countDocuments(query),
        ]);

        // Get Clerk user details for each user
        const client = await clerkClient();
        const usersWithDetails = await Promise.all(
            users.map(async (user) => {
                try {
                    const clerkUser = await client.users.getUser(user.clerkUserId);
                    return {
                        ...user,
                        clerkDetails: {
                            firstName: clerkUser.firstName,
                            lastName: clerkUser.lastName,
                            imageUrl: clerkUser.imageUrl,
                            createdAt: clerkUser.createdAt,
                            lastActiveAt: clerkUser.lastActiveAt,
                        },
                    };
                } catch {
                    // User might have been deleted from Clerk
                    return {
                        ...user,
                        clerkDetails: null,
                    };
                }
            })
        );

        // Get stats
        const stats = await UserStatus.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const statsMap = stats.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {} as Record<string, number>);

        const platformSettings = await getPlatformSettings();

        return NextResponse.json({
            users: usersWithDetails,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            stats: {
                waiting: statsMap.waiting || 0,
                approved: statsMap.approved || 0,
                rejected: statsMap.rejected || 0,
                total: (statsMap.waiting || 0) + (statsMap.approved || 0) + (statsMap.rejected || 0),
            },
            platformSettings: {
                allowPublicSignup: platformSettings.allowPublicSignup,
                allowPublicOrgCreation: platformSettings.allowPublicOrgCreation,
                requireOrgApproval: platformSettings.requireOrgApproval,
                maxOrgsPerUser: platformSettings.maxOrgsPerUser,
            },
        });
    } catch (error) {
        console.error("Failed to fetch waitlist:", error);
        return NextResponse.json(
            { error: "Failed to fetch waitlist" },
            { status: 500 }
        );
    }
}
