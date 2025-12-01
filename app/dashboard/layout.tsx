import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CreditDisplay from "@/components/CreditDisplay";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
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
            <main className="flex-1 md:ml-64 overflow-x-hidden">
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 pl-16 md:pl-6 dark:border-gray-800 dark:bg-black">
                    <CreditDisplay variant="compact" />
                    <UserButton />
                </header>
                <div className="p-6 max-w-5xl mx-auto">{children}</div>
            </main>
        </div>
    );
}
