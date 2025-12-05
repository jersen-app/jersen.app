import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import { getPlatformSettings } from "@/models/PlatformSettings";

/**
 * GET /api/platform/settings
 * Get public platform settings for authenticated users
 */
export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await getPlatformSettings();

    // Only return non-sensitive settings that the frontend needs
    return NextResponse.json({
        settings: {
            sandboxProvider: settings.sandboxProvider,
            vercelSandboxTimeout: settings.vercelSandboxTimeout,
            autoPreviewEnabled: settings.autoPreviewEnabled,
        },
    });
}
