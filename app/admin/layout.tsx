import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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
            <AdminSidebar />

            {/* Main Content */}
            <main className="flex-1 md:ml-64">
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 pl-16 md:pl-6 dark:border-gray-800 dark:bg-black">
                    <span className="text-sm text-muted-foreground">Super Admin Panel</span>
                </header>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
