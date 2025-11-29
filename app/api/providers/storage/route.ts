import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/middleware/validateApiKey";
import { uploadFile, getDownloadUrl, deleteFile } from "@/lib/storage/r2";

// POST /api/providers/storage/upload
export async function POST(request: NextRequest) {
    // Validate API key
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        return auth; // Return error response
    }

    const { project } = auth;

    // Check if storage is enabled
    if (!project.providers?.storage?.enabled) {
        return NextResponse.json(
            { error: "Storage provider is not enabled for this project" },
            { status: 403 }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const key = formData.get("key") as string;

        if (!file || !key) {
            return NextResponse.json(
                { error: "Missing required fields: file, key" },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const fullKey = await uploadFile({
            projectId: project._id.toString(),
            key,
            body: buffer,
            contentType: file.type,
        });

        return NextResponse.json({
            success: true,
            key: fullKey,
            size: buffer.length,
        });
    } catch (error: any) {
        console.error("Storage upload error:", error);
        return NextResponse.json(
            { error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}

// GET /api/providers/storage/download?key=xxx
export async function GET(request: NextRequest) {
    // Validate API key
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        return auth;
    }

    const { project } = auth;

    if (!project.providers?.storage?.enabled) {
        return NextResponse.json(
            { error: "Storage provider is not enabled" },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
        }

        // Get download URL
        const downloadUrl = await getDownloadUrl({
            projectId: project._id.toString(),
            key,
        });

        return NextResponse.json({
            success: true,
            url: downloadUrl,
            expiresIn: 3600,
        });
    } catch (error: any) {
        console.error("Storage download error:", error);
        return NextResponse.json(
            { error: error.message || "Download failed" },
            { status: 500 }
        );
    }
}

// DELETE /api/providers/storage?key=xxx
export async function DELETE(request: NextRequest) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        return auth;
    }

    const { project } = auth;

    if (!project.providers?.storage?.enabled) {
        return NextResponse.json(
            { error: "Storage provider is not enabled" },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
        }

        await deleteFile({
            projectId: project._id.toString(),
            key,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Storage delete error:", error);
        return NextResponse.json(
            { error: error.message || "Delete failed" },
            { status: 500 }
        );
    }
}
