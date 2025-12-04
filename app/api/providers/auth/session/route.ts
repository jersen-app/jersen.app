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

// Production domains that are always allowed
const ALLOWED_PRODUCTION_ORIGINS = [
    "https://jersen.app",
    "https://www.jersen.app",
    "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean);

// Check if origin is a valid E2B sandbox URL
function isValidE2BSandbox(origin: string | null): boolean {
    if (!origin) return false;
    // E2B sandbox URLs follow the pattern: https://3000-{sandboxId}.e2b.app
    // Also allow any port number and alphanumeric sandbox IDs
    return /^https:\/\/\d+-[a-z0-9]+\.e2b\.app$/i.test(origin) || 
           origin.includes('.e2b.app');
}

// Check if origin is allowed (production domains or E2B sandboxes)
function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    return ALLOWED_PRODUCTION_ORIGINS.includes(origin) || isValidE2BSandbox(origin);
}

// Get CORS headers - allow E2B sandboxes, production domains, and project's allowed origins
function getCorsHeaders(origin: string | null, project: { sandboxUrl?: string; allowedOrigins?: string[] } | null): Record<string, string> {
    // Allow if:
    // 1. Origin is a production domain
    // 2. Origin matches the stored sandbox URL
    // 3. Origin is a valid E2B sandbox URL (for flexibility during sandbox changes)
    // 4. Origin is in the project's allowedOrigins array
    const isAllowed = origin && (
        isOriginAllowed(origin) ||
        origin === project?.sandboxUrl ||
        (project?.allowedOrigins || []).includes(origin)
    );
    
    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "null",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-jersen-api-key",
        "Access-Control-Allow-Credentials": "true",
    };
}

/**
 * OPTIONS /api/providers/auth/session
 * Handle CORS preflight
 * 
 * Note: We allow any origin for preflight because we can't access the API key
 * from preflight requests (browsers don't send custom headers in preflight).
 * The actual CORS check happens in the GET/DELETE handlers where we validate
 * the API key and check the project's allowedOrigins.
 */
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get("origin");
    
    // For preflight, be permissive - allow production domains, E2B sandboxes,
    // and any https origin (actual validation happens in GET/DELETE)
    // This is safe because the actual request will validate the API key
    const isAllowed = origin && (
        isOriginAllowed(origin) ||
        origin.startsWith("https://")
    );
    
    return new NextResponse(null, { 
        status: 204, 
        headers: {
            "Access-Control-Allow-Origin": isAllowed ? origin : "null",
            "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-jersen-api-key",
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
        const apiKey = request.headers.get("x-jersen-api-key");

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

        // Validate API key and get project (includes sandboxUrl and allowedOrigins)
        await connectToDatabase();
        const project = await Project.findOne({ apiKey }).lean() as { 
            _id: any; 
            sandboxUrl?: string; 
            allowedOrigins?: string[] 
        } | null;

        if (!project) {
            return NextResponse.json(
                { error: "Invalid API key" },
                { status: 401, headers: getCorsHeaders(origin, null) }
            );
        }

        // Get CORS headers using project's allowed origins
        const corsHeaders = getCorsHeaders(origin, project);
        
        // Check if origin is allowed (production domains, E2B sandboxes, stored sandbox URL, or allowedOrigins)
        const allowedOrigins = project.allowedOrigins || [];
        if (origin && !isOriginAllowed(origin) && origin !== project.sandboxUrl && !allowedOrigins.includes(origin)) {
            console.log(`CORS rejected: origin ${origin} is not allowed. sandboxUrl=${project.sandboxUrl}, allowedOrigins=${allowedOrigins.join(',')}`);
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
    // For logout, we allow any origin that looks valid (E2B sandbox pattern or production)
    const isAllowed = isOriginAllowed(origin);
    
    return NextResponse.json({
        success: true,
        message: "Session invalidated. Please delete the token from client storage."
    }, { 
        headers: {
            "Access-Control-Allow-Origin": isAllowed && origin ? origin : "*",
            "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-jersen-api-key",
            "Access-Control-Allow-Credentials": "true",
        }
    });
}
