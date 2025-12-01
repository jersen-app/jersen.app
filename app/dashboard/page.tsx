import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
    const { userId, orgId } = await auth();

    if (!userId) {
        redirect("/");
    }

    if (!orgId) {
        return (
            <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Organization Selected</h3>
                    <p className="text-muted-foreground mb-6">
                        Please select or create an organization from the sidebar to start building with AI.
                    </p>
                </div>
            </div>
        );
    }

    return <DashboardClient />;
}
