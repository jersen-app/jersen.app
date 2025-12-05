import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";

/**
 * POST /api/integrations/vercel/sandbox-token
 * Save the user's Vercel sandbox access token
 */
export async function POST(request: NextRequest) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { token } = await request.json();

        if (!token || typeof token !== "string") {
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 }
            );
        }

        // Basic validation - Vercel tokens are typically long strings
        if (token.length < 20) {
            return NextResponse.json(
                { error: "Invalid token format" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Check if user has Vercel connected
        const integration = await VercelIntegration.findOne({
            userId,
            orgId: orgId || null,
        });

        if (!integration) {
            return NextResponse.json(
                { error: "Please connect your Vercel account first" },
                { status: 400 }
            );
        }

        // Validate the token by making a test API call
        const testRes = await fetch("https://api.vercel.com/v2/user", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!testRes.ok) {
            return NextResponse.json(
                { error: "Invalid token. Please check and try again." },
                { status: 400 }
            );
        }

        // Save the sandbox token
        await VercelIntegration.updateOne(
            { _id: integration._id },
            { $set: { sandboxAccessToken: token } }
        );

        return NextResponse.json({
            success: true,
            message: "Sandbox token saved successfully",
        });
    } catch (error) {
        console.error("Failed to save sandbox token:", error);
        return NextResponse.json(
            { error: "Failed to save token" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/integrations/vercel/sandbox-token
 * Remove the user's Vercel sandbox access token
 */
export async function DELETE() {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    await VercelIntegration.updateOne(
        { userId, orgId: orgId || null },
        { $unset: { sandboxAccessToken: 1 } }
    );

    return NextResponse.json({
        success: true,
        message: "Sandbox token removed",
    });
}
