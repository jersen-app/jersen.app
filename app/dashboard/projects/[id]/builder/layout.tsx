import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function BuilderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    
    if (!userId) {
        redirect("/");
    }

    // Builder has its own full-screen layout without the dashboard sidebar
    return <>{children}</>;
}
