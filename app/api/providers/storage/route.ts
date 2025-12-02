import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/middleware/validateApiKey";
import { uploadFile, getDownloadUrl, deleteFile } from "@/lib/storage/r2";

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
    return /^https:\/\/3000-[a-z0-9]+\.e2b\.app$/.test(origin);
}

// Check if origin is allowed (production domains or E2B sandboxes)
function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    return ALLOWED_PRODUCTION_ORIGINS.includes(origin) || isValidE2BSandbox(origin);
}

// Get CORS headers for allowed origins (without project context)
function getCorsHeaders(origin: string | null): Record<string, string> {
    const isAllowed = isOriginAllowed(origin);
    return {
        "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key",
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
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key",
        "Access-Control-Allow-Credentials": "true",
    };
}

// OPTIONS handler for CORS preflight - permissive, actual validation in handlers
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
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key",
            "Access-Control-Allow-Credentials": "true",
        }
    });
}

// POST /api/providers/storage/upload
export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    let corsHeaders = getCorsHeaders(origin);

    // Validate API key
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;
    corsHeaders = getCorsHeadersWithProject(origin, project);

    // Check if storage is enabled
    if (!project.providers?.storage?.enabled) {
        return NextResponse.json(
            { error: "Storage provider is not enabled for this project" },
            { status: 403, headers: corsHeaders }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const key = formData.get("key") as string;

        if (!file || !key) {
            return NextResponse.json(
                { error: "Missing required fields: file, key" },
                { status: 400, headers: corsHeaders }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const result = await uploadFile({
            projectId: project._id.toString(),
            key,
            body: buffer,
            contentType: file.type,
        });

        return NextResponse.json({
            success: true,
            key: result.key,
            url: result.url,  // Public gateway URL - use this directly in your app
            size: buffer.length,
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Storage upload error:", error);
        return NextResponse.json(
            { error: error.message || "Upload failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

// GET /api/providers/storage/download?key=xxx
export async function GET(request: NextRequest) {
    const origin = request.headers.get("origin");
    let corsHeaders = getCorsHeaders(origin);

    // Validate API key
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;
    corsHeaders = getCorsHeadersWithProject(origin, project);

    if (!project.providers?.storage?.enabled) {
        return NextResponse.json(
            { error: "Storage provider is not enabled" },
            { status: 403, headers: corsHeaders }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json({ error: "Missing key parameter" }, { status: 400, headers: corsHeaders });
        }

        // Get public gateway URL (no bandwidth cost on Vercel)
        const downloadUrl = getDownloadUrl({
            projectId: project._id.toString(),
            key,
        });

        return NextResponse.json({
            success: true,
            url: downloadUrl,
            // Note: Public gateway URLs don't expire
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Storage download error:", error);
        return NextResponse.json(
            { error: error.message || "Download failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

// DELETE /api/providers/storage?key=xxx
export async function DELETE(request: NextRequest) {
    const origin = request.headers.get("origin");
    let corsHeaders = getCorsHeaders(origin);

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;
    corsHeaders = getCorsHeadersWithProject(origin, project);

    if (!project.providers?.storage?.enabled) {
        return NextResponse.json(
            { error: "Storage provider is not enabled" },
            { status: 403, headers: corsHeaders }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json({ error: "Missing key parameter" }, { status: 400, headers: corsHeaders });
        }

        await deleteFile({
            projectId: project._id.toString(),
            key,
        });

        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Storage delete error:", error);
        return NextResponse.json(
            { error: error.message || "Delete failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}
