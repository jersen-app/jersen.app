import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardMain } from "@/components/dashboard/DashboardMain";
import connectToDatabase from "@/lib/db";
import { getPlatformSettings } from "@/models/PlatformSettings";
import UserStatus, { canUserAccessPlatform, createWaitingUser } from "@/models/UserStatus";

// Add your Clerk user ID here
const SUPER_ADMIN_USER_IDS = [
    process.env.SUPER_ADMIN_USER_ID || "",
];

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
        redirect("/");
    }
    
    const isSuperAdmin = SUPER_ADMIN_USER_IDS.includes(userId);
    
    // Super admins bypass waitlist
    if (!isSuperAdmin) {
        await connectToDatabase();
        
        const platformSettings = await getPlatformSettings();
        
        // If public signup is NOT enabled, check user status
        if (!platformSettings.allowPublicSignup) {
            // Check if user exists in our system
            let userStatus = await UserStatus.findOne({ clerkUserId: userId });
            
            if (!userStatus) {
                // First time - add to waitlist
                const email = user.emailAddresses[0]?.emailAddress || "";
                userStatus = await UserStatus.create({
                    clerkUserId: userId,
                    email,
                    status: "waiting",
                    createdOrgsCount: 0,
                });
            }
            
            // Check access
            const accessCheck = await canUserAccessPlatform(userId);
            if (!accessCheck.canAccess) {
                redirect("/waitlist");
            }
        }
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            {/* Sidebar */}
            <DashboardSidebar isSuperAdmin={isSuperAdmin} />

            {/* Main Content */}
            <DashboardMain>{children}</DashboardMain>
        </div>
    );
}
