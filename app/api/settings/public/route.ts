import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getPlatformSettings } from "@/models/PlatformSettings";

// GET public settings (no auth required)
// Only exposes non-sensitive settings needed by the client
export async function GET() {
    try {
        await connectToDatabase();
        const settings = await getPlatformSettings();

        return NextResponse.json({
            disableDevTools: settings.disableDevTools ?? false,
        });
    } catch (error) {
        console.error("Failed to fetch public settings:", error);
        // Return safe defaults on error
        return NextResponse.json({
            disableDevTools: false,
        });
    }
}
