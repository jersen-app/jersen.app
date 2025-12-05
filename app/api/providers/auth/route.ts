import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/middleware/validateApiKey";
import { clerkClient } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import connectToDatabase from "@/lib/db";
import ProjectUser from "@/models/ProjectUser";
import { authRatelimit, checkRateLimit, getClientIP } from "@/lib/ratelimit";

// Production domains that are always allowed
const ALLOWED_PRODUCTION_ORIGINS = [
    "https://jersen.app",
    "https://www.jersen.app",
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

// Check if origin is a valid Vercel Sandbox URL
function isValidVercelSandbox(origin: string | null): boolean {
    if (!origin) return false;
    // Vercel Sandbox URLs follow patterns like:
    // https://{sandboxId}-{port}.vercel.run
    return /^https:\/\/[a-z0-9-]+-\d+\.vercel\.run$/i.test(origin) ||
           origin.includes('.vercel.run');
}

// Check if origin is allowed (production domains, E2B or Vercel sandboxes)
function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    return ALLOWED_PRODUCTION_ORIGINS.includes(origin) || 
           isValidE2BSandbox(origin) ||
           isValidVercelSandbox(origin);
}

// Get CORS headers for allowed origins (without project context)
function getCorsHeaders(origin: string | null): Record<string, string> {
    const isAllowed = isOriginAllowed(origin);
    return {
        "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key, x-user-id",
        "Access-Control-Allow-Credentials": "true",
    };
}

// Get CORS headers with project-specific allowed origins
function getCorsHeadersWithProject(origin: string | null, project: { sandboxUrl?: string; allowedOrigins?: string[] } | null): Record<string, string> {
    const isAllowed = origin && (
        isOriginAllowed(origin) ||
        origin === project?.sandboxUrl ||
        (project?.allowedOrigins || []).includes(origin)
    );
    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key, x-user-id",
        "Access-Control-Allow-Credentials": "true",
    };
}

// OPTIONS handler for CORS preflight
// Be permissive for preflight - actual validation happens in POST/GET handlers
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get("origin");
    const isAllowed = origin && (
        isOriginAllowed(origin) ||
        origin.startsWith("https://")
    );
    
    return new NextResponse(null, { 
        status: 204, 
        headers: {
            "Access-Control-Allow-Origin": isAllowed ? origin : "null",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key, x-user-id",
            "Access-Control-Allow-Credentials": "true",
        }
    });
}

// POST /api/providers/auth/signup
export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    let corsHeaders = getCorsHeaders(origin);

    // Rate limit by IP for auth endpoints (no user ID yet)
    const ip = getClientIP(request);
    const rateLimited = await checkRateLimit(authRatelimit, `ip:${ip}`);
    if (rateLimited) {
        const headers = new Headers(rateLimited.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(rateLimited.body, { status: rateLimited.status, headers });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "signup";

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;
    
    // Update CORS headers with project-specific allowed origins
    corsHeaders = getCorsHeadersWithProject(origin, project);

    if (!project.providers?.auth?.enabled) {
        return NextResponse.json(
            { error: "Auth provider is not enabled for this project" },
            { status: 403, headers: corsHeaders }
        );
    }

    if (action === "signup") {
        return handleSignup(request, project, corsHeaders);
    } else if (action === "signin") {
        return handleSignin(request, project, corsHeaders);
    } else if (action === "me") {
        return handleGetUser(request, project, corsHeaders);
    } else if (action === "signout") {
        return handleSignout(request, project, corsHeaders);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: corsHeaders });
}

// GET /api/providers/auth/me
export async function GET(request: NextRequest) {
    const origin = request.headers.get("origin");
    let corsHeaders = getCorsHeaders(origin);

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;
    
    // Update CORS headers with project-specific allowed origins
    corsHeaders = getCorsHeadersWithProject(origin, project);

    if (!project.providers?.auth?.enabled) {
        return NextResponse.json(
            { error: "Auth provider is not enabled" },
            { status: 403, headers: corsHeaders }
        );
    }

    return handleGetUser(request, project, corsHeaders);
}

async function handleSignup(request: NextRequest, project: any, corsHeaders: Record<string, string>) {
    try {
        const body = await request.json();
        const { email, password, metadata } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400, headers: corsHeaders }
            );
        }

        await connectToDatabase();

        // Check if user already exists for this project
        const existing = await ProjectUser.findOne({
            projectId: project._id.toString(),
            email,
        });

        if (existing) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 409, headers: corsHeaders }
            );
        }

        // Create user in Clerk with project metadata
        const client = await clerkClient();
        const clerkUser = await client.users.createUser({
            emailAddress: [email],
            password,
            publicMetadata: {
                projectId: project._id.toString(),
                projectName: project.name,
                ...metadata,
            },
        });

        // Generate customer-facing user ID
        const projectUserId = `user_${nanoid(16)}`;

        // Map to ProjectUser
        const projectUser = await ProjectUser.create({
            projectId: project._id.toString(),
            projectUserId,
            clerkUserId: clerkUser.id,
            email,
            metadata,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: projectUserId,
                email: projectUser.email,
                metadata: projectUser.metadata,
            },
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Auth signup error:", error);
        return NextResponse.json(
            { error: error.message || "Signup failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

async function handleSignin(request: NextRequest, project: any, corsHeaders: Record<string, string>) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400, headers: corsHeaders }
            );
        }

        await connectToDatabase();

        // Find project user
        const projectUser = await ProjectUser.findOne({
            projectId: project._id.toString(),
            email,
        });

        if (!projectUser) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Verify password with Clerk (we'll use Clerk's session management)
        // Note: In production, you'd create a proper session token
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(projectUser.clerkUserId);

        if (!clerkUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        // For now, return user info (in production, generate JWT/session)
        return NextResponse.json({
            success: true,
            user: {
                id: projectUser.projectUserId,
                email: projectUser.email,
                metadata: projectUser.metadata,
            },
            // TODO: Generate proper session token
            sessionToken: `session_${nanoid(32)}`,
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Auth signin error:", error);
        return NextResponse.json(
            { error: error.message || "Signin failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

async function handleGetUser(request: NextRequest, project: any, corsHeaders: Record<string, string>) {
    try {
        // Get user ID from request (header or query)
        const userId = request.headers.get("x-user-id") || request.nextUrl.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400, headers: corsHeaders });
        }

        await connectToDatabase();

        const projectUser = await ProjectUser.findOne({
            projectId: project._id.toString(),
            projectUserId: userId,
        });

        if (!projectUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404, headers: corsHeaders });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: projectUser.projectUserId,
                email: projectUser.email,
                metadata: projectUser.metadata,
            },
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Auth get user error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get user" },
            { status: 500, headers: corsHeaders }
        );
    }
}

async function handleSignout(request: NextRequest, project: any, corsHeaders: Record<string, string>) {
    // In a full implementation, this would invalidate the session token
    return NextResponse.json({ success: true, message: "Signed out" }, { headers: corsHeaders });
}
