import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import ProjectMemory from "@/models/ProjectMemory";
import { generateSummary } from "@/lib/ai/memory";

// GET project memory
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    try {
        await connectToDatabase();
        
        const memory = await ProjectMemory.findOne({ projectId }).lean();
        
        if (!memory) {
            return NextResponse.json({
                summary: "",
                decisions: [],
                techStack: [],
                context: [],
            });
        }

        return NextResponse.json({
            summary: memory.summary,
            decisions: memory.decisions,
            techStack: memory.techStack,
            context: memory.context,
            lastSummarizedAt: memory.lastSummarizedAt,
        });
    } catch (error) {
        console.error("Failed to get project memory:", error);
        return NextResponse.json(
            { error: "Failed to get memory" },
            { status: 500 }
        );
    }
}

// POST - Generate new summary
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    try {
        const summary = await generateSummary(projectId, orgId);
        
        return NextResponse.json({ summary });
    } catch (error) {
        console.error("Failed to generate summary:", error);
        return NextResponse.json(
            { error: "Failed to generate summary" },
            { status: 500 }
        );
    }
}

// DELETE - Clear memory
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    try {
        await connectToDatabase();
        
        await ProjectMemory.deleteOne({ projectId });
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to clear memory:", error);
        return NextResponse.json(
            { error: "Failed to clear memory" },
            { status: 500 }
        );
    }
}
