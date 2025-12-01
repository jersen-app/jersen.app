import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Redirect user to Vercel OAuth
export async function GET(request: NextRequest) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.VCEL_CLIENT_ID;
    const redirectUri = process.env.VCEL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/vercel/callback`;

    if (!clientId) {
        return NextResponse.json(
            { error: "Vercel integration not configured" },
            { status: 500 }
        );
    }

    // State contains user info to link back after OAuth
    const state = Buffer.from(
        JSON.stringify({ userId, orgId: orgId || null })
    ).toString("base64");

    // Vercel OAuth URL
    // Scopes: https://vercel.com/docs/rest-api#introduction/api-basics/oauth2
    const vercelAuthUrl = new URL("https://vercel.com/oauth/authorize");
    vercelAuthUrl.searchParams.set("client_id", clientId);
    vercelAuthUrl.searchParams.set("redirect_uri", redirectUri);
    vercelAuthUrl.searchParams.set("response_type", "code");
    vercelAuthUrl.searchParams.set("state", state);
    // Request scope for deployments
    vercelAuthUrl.searchParams.set("scope", "user:read deployments:write projects:write");

    return NextResponse.redirect(vercelAuthUrl.toString());
}
