import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import PlatformSettings, { AI_MODELS, getPlatformSettings } from "@/models/PlatformSettings";

const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID;

// GET current settings
export async function GET() {
    const { userId } = await auth();

    if (!userId || userId !== SUPER_ADMIN_USER_ID) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await getPlatformSettings();

    return NextResponse.json({
        settings,
        availableModels: AI_MODELS,
    });
}

// PATCH update settings
export async function PATCH(request: NextRequest) {
    const { userId } = await auth();

    if (!userId || userId !== SUPER_ADMIN_USER_ID) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { aiModel } = body;

        // Validate model
        if (aiModel && !AI_MODELS.some(m => m.id === aiModel)) {
            return NextResponse.json(
                { error: "Invalid AI model" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const settings = await PlatformSettings.findByIdAndUpdate(
            "platform_settings",
            { $set: { aiModel } },
            { new: true, upsert: true }
        );

        return NextResponse.json({
            success: true,
            settings,
        });
    } catch (error) {
        console.error("Failed to update platform settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
