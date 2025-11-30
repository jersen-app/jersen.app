import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import ProjectUserModel from "@/models/ProjectUser";
import { verifySecureToken } from "@/lib/crypto";

interface SessionPayload {
    userId: string;
    projectId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    exp: number;
}

// CORS headers for cross-origin requests from sandboxes
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

/**
 * OPTIONS /api/providers/auth/session
 * Handle CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/providers/auth/session
 * Verify a session token and return user data
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        const apiKey = request.headers.get("x-api-key");

        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing API key" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Get session token from Authorization header
        let sessionToken: string | null = null;
        if (authHeader?.startsWith("Bearer ")) {
            sessionToken = authHeader.slice(7);
        }

        // Or from query param
        if (!sessionToken) {
            sessionToken = request.nextUrl.searchParams.get("token");
        }

        if (!sessionToken) {
            return NextResponse.json(
                { error: "Missing session token" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Validate API key
        await connectToDatabase();
        const project = await Project.findOne({ apiKey }).lean();

        if (!project) {
            return NextResponse.json(
                { error: "Invalid API key" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Verify session token
        const payload = await verifySecureToken<SessionPayload>(sessionToken);

        if (!payload) {
            return NextResponse.json(
                { error: "Invalid or expired session token" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Verify the token belongs to this project
        if (payload.projectId !== project._id.toString()) {
            return NextResponse.json(
                { error: "Session token does not belong to this project" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Get user from database
        const user = await ProjectUserModel.findById(payload.userId).lean();

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
                metadata: user.metadata,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
            },
            expiresAt: new Date(payload.exp * 1000).toISOString(),
        }, { headers: corsHeaders });
    } catch (error) {
        console.error("Session verification error:", error);
        return NextResponse.json(
            { error: "Failed to verify session" },
            { status: 500, headers: corsHeaders }
        );
    }
}

/**
 * DELETE /api/providers/auth/session
 * Logout - invalidate session (client should delete the token)
 */
export async function DELETE() {
    // For JWT-based auth, the client just needs to delete the token
    // We can optionally track invalidated tokens in a blacklist
    
    return NextResponse.json({
        success: true,
        message: "Session invalidated. Please delete the token from client storage."
    }, { headers: corsHeaders });
}
