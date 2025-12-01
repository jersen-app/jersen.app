import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user cancellation or errors
    if (error) {
        console.error("Vercel OAuth error:", error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=vercel_auth_failed`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=missing_params`
        );
    }

    try {
        // Decode state to get user info
        const { userId, orgId } = JSON.parse(
            Buffer.from(state, "base64").toString("utf-8")
        );

        if (!userId) {
            throw new Error("Invalid state: missing userId");
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
            console.error("Token exchange failed:", errorData);
            throw new Error("Failed to exchange code for token");
        }

        const tokenData = await tokenResponse.json();
        const {
            access_token,
            user_id: vercelUserId,
            team_id: vercelTeamId,
        } = tokenData;

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

        // Redirect back to settings with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?vercel=connected`
        );
    } catch (error) {
        console.error("Vercel callback error:", error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=vercel_callback_failed`
        );
    }
}
