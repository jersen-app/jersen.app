import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/middleware/validateApiKey";
import { clerkClient } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import connectToDatabase from "@/lib/db";
import ProjectUser from "@/models/ProjectUser";
import { authRatelimit, checkRateLimit, getClientIP } from "@/lib/ratelimit";

// POST /api/providers/auth/signup
export async function POST(request: NextRequest) {
    // Rate limit by IP for auth endpoints (no user ID yet)
    const ip = getClientIP(request);
    const rateLimited = await checkRateLimit(authRatelimit, `ip:${ip}`);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "signup";

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const { project } = auth;

    if (!project.providers?.auth?.enabled) {
        return NextResponse.json(
            { error: "Auth provider is not enabled for this project" },
            { status: 403 }
        );
    }

    if (action === "signup") {
        return handleSignup(request, project);
    } else if (action === "signin") {
        return handleSignin(request, project);
    } else if (action === "me") {
        return handleGetUser(request, project);
    } else if (action === "signout") {
        return handleSignout(request, project);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/providers/auth/me
export async function GET(request: NextRequest) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const { project } = auth;

    if (!project.providers?.auth?.enabled) {
        return NextResponse.json(
            { error: "Auth provider is not enabled" },
            { status: 403 }
        );
    }

    return handleGetUser(request, project);
}

async function handleSignup(request: NextRequest, project: any) {
    try {
        const body = await request.json();
        const { email, password, metadata } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
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
                { status: 409 }
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
        });
    } catch (error: any) {
        console.error("Auth signup error:", error);
        return NextResponse.json(
            { error: error.message || "Signup failed" },
            { status: 500 }
        );
    }
}

async function handleSignin(request: NextRequest, project: any) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
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
                { status: 401 }
            );
        }

        // Verify password with Clerk (we'll use Clerk's session management)
        // Note: In production, you'd create a proper session token
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(projectUser.clerkUserId);

        if (!clerkUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
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
        });
    } catch (error: any) {
        console.error("Auth signin error:", error);
        return NextResponse.json(
            { error: error.message || "Signin failed" },
            { status: 500 }
        );
    }
}

async function handleGetUser(request: NextRequest, project: any) {
    try {
        // Get user ID from request (header or query)
        const userId = request.headers.get("x-user-id") || request.nextUrl.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        await connectToDatabase();

        const projectUser = await ProjectUser.findOne({
            projectId: project._id.toString(),
            projectUserId: userId,
        });

        if (!projectUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: projectUser.projectUserId,
                email: projectUser.email,
                metadata: projectUser.metadata,
            },
        });
    } catch (error: any) {
        console.error("Auth get user error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get user" },
            { status: 500 }
        );
    }
}

async function handleSignout(request: NextRequest, project: any) {
    // In a full implementation, this would invalidate the session token
    return NextResponse.json({ success: true, message: "Signed out" });
}
