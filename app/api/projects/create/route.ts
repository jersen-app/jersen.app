import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createProject } from "@/lib/actions/projects";
import { projectCreationRatelimit, checkRateLimit, getRateLimitIdentifier } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting - 10 projects per hour
        const rateLimitId = getRateLimitIdentifier(userId, request);
        const rateLimited = await checkRateLimit(projectCreationRatelimit, rateLimitId);
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const result = await createProject(formData);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to create project" },
            { status: 500 }
        );
    }
}
