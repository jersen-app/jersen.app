import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";

// State is valid for 30 minutes (same as Vercel's code validity)
const STATE_VALIDITY_MS = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle user cancellation or errors
    if (error) {
        console.error("Vercel OAuth error:", error, errorDescription);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=vercel_auth_failed&message=${encodeURIComponent(errorDescription || error)}`
        );
    }

    if (!code || !state) {
        console.error("Missing code or state in Vercel callback");
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=missing_params`
        );
    }

    try {
        // Decode state to get user info
        let userId: string;
        let orgId: string | null;
        let timestamp: number | undefined;

        try {
            const stateData = JSON.parse(
                Buffer.from(state, "base64").toString("utf-8")
            );
            userId = stateData.userId;
            orgId = stateData.orgId;
            timestamp = stateData.timestamp;
        } catch (parseError) {
            console.error("Failed to parse state:", parseError);
            throw new Error("Invalid state format");
        }

        if (!userId) {
            throw new Error("Invalid state: missing userId");
        }

        // Validate state timestamp if present (for security)
        if (timestamp && Date.now() - timestamp > STATE_VALIDITY_MS) {
            console.error("State expired:", { timestamp, now: Date.now() });
            throw new Error("OAuth session expired. Please try again.");
        }

        // Exchange code for access token
        const tokenResponse = await fetch(
            "https://api.vercel.com/v2/oauth/access_token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.VCEL_CLIENT_ID!,
                    client_secret: process.env.VCEL_CLIENT_SECRET!,
                    redirect_uri:
                        process.env.VCEL_REDIRECT_URI ||
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/vercel/callback`,
                }),
            }
        );

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error("Token exchange failed:", tokenResponse.status, errorData);
            throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const {
            access_token,
            user_id: vercelUserId,
            team_id: vercelTeamId,
        } = tokenData;

        if (!access_token) {
            console.error("No access token in response:", tokenData);
            throw new Error("No access token received from Vercel");
        }

        // Get Vercel user/team info for display
        let vercelTeamSlug: string | undefined;
        if (vercelTeamId) {
            try {
                const teamResponse = await fetch(
                    `https://api.vercel.com/v2/teams/${vercelTeamId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${access_token}`,
                        },
                    }
                );
                if (teamResponse.ok) {
                    const teamData = await teamResponse.json();
                    vercelTeamSlug = teamData.slug;
                }
            } catch (e) {
                console.warn("Failed to fetch team info:", e);
            }
        }

        // Save to database
        await connectToDatabase();

        await VercelIntegration.findOneAndUpdate(
            { userId, orgId: orgId || null },
            {
                userId,
                orgId: orgId || null,
                accessToken: access_token,
                vercelUserId,
                vercelTeamId: vercelTeamId || null,
                vercelTeamSlug: vercelTeamSlug || null,
                connectedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        console.log("Vercel integration connected successfully for user:", userId);

        // Redirect back to settings with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?vercel=connected`
        );
    } catch (error) {
        console.error("Vercel callback error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=vercel_callback_failed&message=${encodeURIComponent(message)}`
        );
    }
}
