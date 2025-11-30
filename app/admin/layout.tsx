import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
    LayoutDashboard, 
    FolderKanban, 
    Rocket, 
    Users,
    Settings,
    Shield
} from "lucide-react";

// Add your Clerk user ID here
const SUPER_ADMIN_USER_IDS = [
    // Add your user ID here
    process.env.SUPER_ADMIN_USER_ID || "",
];

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    
    if (!userId || !SUPER_ADMIN_USER_IDS.includes(userId)) {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
                <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
                    <Link href="/admin" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Shield className="h-5 w-5 text-violet-500" />
                        Admin
                    </Link>
                </div>
                <nav className="p-4 space-y-1">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Overview
                    </Link>
                    <Link
                        href="/admin/requests"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <Rocket className="h-4 w-4" />
                        Production Requests
                    </Link>
                    <Link
                        href="/admin/projects"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <FolderKanban className="h-4 w-4" />
                        All Projects
                    </Link>
                    <Link
                        href="/admin/users"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <Users className="h-4 w-4" />
                        Users
                    </Link>
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <Settings className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1">
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-black">
                    <span className="text-sm text-muted-foreground">Super Admin Panel</span>
                </header>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
