import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/allowed-origins
 * Get the list of allowed origins for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();

        const project = await Project.findOne({
            _id: id,
            ...(orgId ? { orgId } : { userId }),
        }).lean();

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({
            sandboxUrl: (project as any).sandboxUrl || null,
            allowedOrigins: (project as any).allowedOrigins || [],
        });
    } catch (error) {
        console.error("Error getting allowed origins:", error);
        return NextResponse.json(
            { error: "Failed to get allowed origins" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[id]/allowed-origins
 * Add a new allowed origin to the project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { origin } = body;

        if (!origin) {
            return NextResponse.json({ error: "Origin is required" }, { status: 400 });
        }

        // Validate origin format (must be a valid URL origin)
        try {
            const url = new URL(origin);
            // Origin should be protocol + hostname (+ port if non-standard)
            const normalizedOrigin = url.origin;
            if (normalizedOrigin !== origin) {
                return NextResponse.json(
                    { error: `Invalid origin format. Did you mean: ${normalizedOrigin}?` },
                    { status: 400 }
                );
            }
        } catch {
            return NextResponse.json(
                { error: "Invalid origin format. Must be a valid URL origin (e.g., https://example.com)" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const project = await Project.findOneAndUpdate(
            {
                _id: id,
                ...(orgId ? { orgId } : { userId }),
            },
            {
                $addToSet: { allowedOrigins: origin },
            },
            { new: true }
        );

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            allowedOrigins: project.allowedOrigins || [],
        });
    } catch (error) {
        console.error("Error adding allowed origin:", error);
        return NextResponse.json(
            { error: "Failed to add allowed origin" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[id]/allowed-origins
 * Remove an allowed origin from the project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const origin = searchParams.get("origin");

        if (!origin) {
            return NextResponse.json({ error: "Origin query parameter is required" }, { status: 400 });
        }

        await connectToDatabase();

        const project = await Project.findOneAndUpdate(
            {
                _id: id,
                ...(orgId ? { orgId } : { userId }),
            },
            {
                $pull: { allowedOrigins: origin },
            },
            { new: true }
        );

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            allowedOrigins: project.allowedOrigins || [],
        });
    } catch (error) {
        console.error("Error removing allowed origin:", error);
        return NextResponse.json(
            { error: "Failed to remove allowed origin" },
            { status: 500 }
        );
    }
}
