import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Settings, Users, FolderKanban } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1">
                <header className="flex h-16 items-center justify-end border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-black">
                    <UserButton />
                </header>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
