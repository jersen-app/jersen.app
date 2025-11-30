import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import ChatMessage from "@/models/ChatMessage";
import ProjectMemory from "@/models/ProjectMemory";

// DELETE - Delete a project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { orgId, userId } = await auth();
        const { id: projectId } = await params;

        if (!orgId || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Find the project and verify ownership
        const project = await Project.findOne({ _id: projectId, orgId });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Delete related data
        await Promise.all([
            // Delete chat messages
            ChatMessage.deleteMany({ projectId }),
            // Delete project memory
            ProjectMemory.deleteOne({ projectId }),
        ]);

        // Delete the project
        await Project.deleteOne({ _id: projectId });

        return NextResponse.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        console.error("Delete project error:", error);
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        );
    }
}
