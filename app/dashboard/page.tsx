import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const { userId, orgId } = await auth();

    if (!userId) {
        redirect("/");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Welcome back to your organization workspace.
                </p>
            </div>

            {!orgId ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                    <h3 className="text-lg font-medium">No Organization Selected</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Please select or create an organization from the sidebar to get started.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Projects</h3>
                        <p className="mt-2 text-3xl font-bold">0</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Team Members</h3>
                        <p className="mt-2 text-3xl font-bold">1</p>
                    </div>
                </div>
            )}
        </div>
    );
}
