import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, Settings, Users, FolderKanban, Shield } from "lucide-react";
import Link from "next/link";
import CreditDisplay from "@/components/CreditDisplay";
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
            <aside className="fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
                <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
                    <Link href="/dashboard" className="text-xl font-bold tracking-tight">
                        Jersen
                    </Link>
                </div>
                <div className="p-4">
                    <div className="mb-6">
                        <OrganizationSwitcher
                            hidePersonal
                            afterCreateOrganizationUrl="/dashboard"
                            afterSelectOrganizationUrl="/dashboard"
                            afterLeaveOrganizationUrl="/dashboard"
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    organizationSwitcherTrigger: "w-full justify-between border border-gray-200 dark:border-gray-800 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-900",
                                },
                            }}
                        />
                    </div>
                    <nav className="space-y-1">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Overview
                        </Link>
                        <Link
                            href="/dashboard/projects"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <FolderKanban className="h-4 w-4" />
                            Projects
                        </Link>
                        <Link
                            href="/dashboard/team"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <Users className="h-4 w-4" />
                            Team
                        </Link>
                        <Link
                            href="/dashboard/settings/roles"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <Settings className="h-4 w-4" />
                            Roles & Settings
                        </Link>
                        {isSuperAdmin && (
                            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                                >
                                    <Shield className="h-4 w-4" />
                                    Super Admin
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 overflow-x-hidden">
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-black">
                    <CreditDisplay variant="compact" />
                    <UserButton />
                </header>
                <div className="p-6 max-w-5xl mx-auto">{children}</div>
            </main>
        </div>
    );
}
