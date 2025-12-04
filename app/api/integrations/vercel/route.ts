import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";

// Redirect user to Vercel OAuth
export async function GET(request: NextRequest) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure DB connection
    await connectToDatabase();

    const clientId = process.env.VCEL_CLIENT_ID;
    const integrationSlug = process.env.VCEL_INTEGRATION_SLUG || "jersen";
    const redirectUri = process.env.VCEL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/vercel/callback`;

    if (!clientId) {
        return NextResponse.json(
            { error: "Vercel integration not configured" },
            { status: 500 }
        );
    }

    // State contains user info to link back after OAuth
    // Include timestamp for validation (state is valid for 30 minutes like the code)
    const state = Buffer.from(
        JSON.stringify({ 
            userId, 
            orgId: orgId || null,
            timestamp: Date.now()
        })
    ).toString("base64");

    // Vercel Integration OAuth URL
    // For Vercel Integrations, use the integration installation URL
    // The integration must be created in Vercel's Integration Console first
    // Scopes are configured in the Integration Console, not in the URL
    // See: https://vercel.com/docs/integrations/create-integration
    const vercelAuthUrl = new URL(`https://vercel.com/integrations/${integrationSlug}/new`);
    vercelAuthUrl.searchParams.set("state", state);

    return NextResponse.redirect(vercelAuthUrl.toString());
}
