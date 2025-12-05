import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import ChatMessage from "@/models/ChatMessage";
import ProjectMemory from "@/models/ProjectMemory";
import { deleteProjectFiles } from "@/lib/storage/r2";

// PATCH - Update project settings (e.g., name)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { orgId, userId } = await auth();
        const { id: projectId } = await params;

        if (!orgId || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({ error: "Name must be less than 100 characters" }, { status: 400 });
        }

        await connectToDatabase();

        // Find and update the project
        const project = await Project.findOneAndUpdate(
            { _id: projectId, orgId },
            { name: name.trim() },
            { new: true }
        );

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            project: { 
                id: project._id, 
                name: project.name 
            } 
        });
    } catch (error) {
        console.error("Update project error:", error);
        return NextResponse.json(
            { error: "Failed to update project" },
            { status: 500 }
        );
    }
}

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
            // Delete project files from R2
            deleteProjectFiles(projectId),
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
