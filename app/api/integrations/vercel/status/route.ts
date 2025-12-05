import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";

/**
 * GET /api/integrations/vercel/status
 * Check if the current user has Vercel connected
 */
export async function GET() {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const integration = await VercelIntegration.findOne({
        userId,
        orgId: orgId || null,
    });

    if (!integration) {
        return NextResponse.json({
            connected: false,
            teamId: null,
            teamSlug: null,
        });
    }

    // Check if token might be expired
    const isExpired = integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date();

    return NextResponse.json({
        connected: true,
        teamId: integration.vercelTeamId || null,
        teamSlug: integration.vercelTeamSlug || null,
        tokenExpired: isExpired,
        connectedAt: integration.connectedAt,
        hasSandboxToken: !!integration.sandboxAccessToken,
    });
}
