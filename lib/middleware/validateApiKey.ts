import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { verifyApiKey } from "@/lib/crypto";

export async function validateApiKey(
    request: NextRequest
): Promise<{ project: any } | NextResponse> {
    // Get API key from header
    const apiKey = request.headers.get("x-jersen-api-key");

    if (!apiKey) {
        return NextResponse.json(
            { error: "Missing API key. Provide x-jersen-api-key header." },
            { status: 401 }
        );
    }

    // Validate format
    if (!apiKey.startsWith("jersen_proj_")) {
        return NextResponse.json(
            { error: "Invalid API key format" },
            { status: 401 }
        );
    }

    try {
        await connectToDatabase();

        // Find project by API key prefix (indexed search)
        const project = await Project.findOne({ apiKey });

        if (!project || !project.apiKeyHash) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
        }

        // Verify the key
        const isValid = await verifyApiKey(apiKey, project.apiKeyHash);

        if (!isValid) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
        }

        // Return the project (caller can use this)
        return { project: JSON.parse(JSON.stringify(project)) };
    } catch (error) {
        console.error("API key validation error:", error);
        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 500 }
        );
    }
}
