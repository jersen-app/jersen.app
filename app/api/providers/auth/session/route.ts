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

// Check if origin is a valid E2B sandbox URL
function isValidE2BSandbox(origin: string | null): boolean {
    if (!origin) return false;
    // E2B sandbox URLs follow the pattern: https://3000-{sandboxId}.e2b.app
    return /^https:\/\/3000-[a-z0-9]+\.e2b\.app$/.test(origin);
}

// Get CORS headers - allow E2B sandboxes and the stored sandbox URL
function getCorsHeaders(origin: string | null, allowedOrigin: string | null): Record<string, string> {
    // Allow if:
    // 1. Origin matches the stored sandbox URL
    // 2. Origin is a valid E2B sandbox URL (for flexibility during sandbox changes)
    const isAllowed = origin && (
        origin === allowedOrigin || 
        isValidE2BSandbox(origin)
    );
    
    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "null",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
        "Access-Control-Allow-Credentials": "true",
    };
}

/**
 * OPTIONS /api/providers/auth/session
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get("origin");
    
    // For preflight from E2B sandboxes, allow it
    const isAllowed = isValidE2BSandbox(origin);
    
    return new NextResponse(null, { 
        status: 204, 
        headers: {
            "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
            "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
            "Access-Control-Allow-Credentials": "true",
        }
    });
}

/**
 * GET /api/providers/auth/session
 * Verify a session token and return user data
 */
export async function GET(request: NextRequest) {
    const origin = request.headers.get("origin");
    
    try {
        const authHeader = request.headers.get("authorization");
        const apiKey = request.headers.get("x-api-key");

        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing API key" },
                { status: 401, headers: getCorsHeaders(origin, null) }
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
                { status: 401, headers: getCorsHeaders(origin, null) }
            );
        }

        // Validate API key and get project (includes sandboxUrl)
        await connectToDatabase();
        const project = await Project.findOne({ apiKey }).lean();

        if (!project) {
            return NextResponse.json(
                { error: "Invalid API key" },
                { status: 401, headers: getCorsHeaders(origin, null) }
            );
        }

        // Get allowed origin from project's sandbox URL
        const allowedOrigin = (project as any).sandboxUrl || null;
        const corsHeaders = getCorsHeaders(origin, allowedOrigin);
        
        // Check if origin is allowed (E2B sandboxes are always allowed)
        if (origin && !isValidE2BSandbox(origin) && allowedOrigin && origin !== allowedOrigin) {
            console.log(`CORS rejected: origin ${origin} is not a valid E2B sandbox and !== allowed ${allowedOrigin}`);
            return NextResponse.json(
                { error: "Origin not allowed" },
                { status: 403, headers: corsHeaders }
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
            { status: 500, headers: getCorsHeaders(origin, null) }
        );
    }
}

/**
 * DELETE /api/providers/auth/session
 * Logout - invalidate session (client should delete the token)
 */
export async function DELETE(request: NextRequest) {
    const origin = request.headers.get("origin");
    
    // For JWT-based auth, the client just needs to delete the token
    // We can optionally track invalidated tokens in a blacklist
    
    return NextResponse.json({
        success: true,
        message: "Session invalidated. Please delete the token from client storage."
    }, { headers: getCorsHeaders(origin, origin) }); // Allow the requesting origin for logout
}
