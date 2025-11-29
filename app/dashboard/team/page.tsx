import { OrganizationProfile } from "@clerk/nextjs";

export default function TeamPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Team Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage your organization members and settings.
                    </p>
                </div>
            </div>

            <div className="flex justify-center">
                <OrganizationProfile
                    appearance={{
                        elements: {
                            rootBox: "w-full shadow-none",
                            card: "w-full shadow-none border border-gray-200 dark:border-gray-800 dark:bg-black",
                            navbar: "hidden",
                            navbarMobileMenuButton: "hidden",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                        }
                    }}
                />
            </div>
        </div>
    );
}
