import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/actions/projects";

export async function POST(request: NextRequest) {
    try {
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
