import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";

// GET - Load project files
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;

        await connectToDatabase();
        const project = await Project.findById(projectId).select("files").lean();

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const files = project.files || [];
        
        return NextResponse.json({ 
            files: files.map((f: { path: string; content: string; updatedAt: Date }) => ({
                path: f.path,
                content: f.content,
            }))
        });
    } catch (error) {
        console.error("Failed to load project files:", error);
        return NextResponse.json(
            { error: "Failed to load files" },
            { status: 500 }
        );
    }
}

// POST - Save project files (merge with existing)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;
        const { files } = await request.json();

        if (!files || !Array.isArray(files)) {
            return NextResponse.json(
                { error: "Files array is required" },
                { status: 400 }
            );
        }

        await connectToDatabase();
        
        // Get current project
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Create a map of existing files
        const fileMap = new Map<string, { path: string; content: string; updatedAt: Date }>();
        for (const file of project.files || []) {
            fileMap.set(file.path, file);
        }

        // Merge new files
        const now = new Date();
        for (const file of files) {
            if (file.path && typeof file.content === "string") {
                fileMap.set(file.path, {
                    path: file.path,
                    content: file.content,
                    updatedAt: now,
                });
            }
        }

        // Update project with merged files
        project.files = Array.from(fileMap.values());
        await project.save();

        return NextResponse.json({ 
            success: true,
            fileCount: project.files.length,
        });
    } catch (error) {
        console.error("Failed to save project files:", error);
        return NextResponse.json(
            { error: "Failed to save files" },
            { status: 500 }
        );
    }
}

// PUT - Replace all project files
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;
        const { files } = await request.json();

        if (!files || !Array.isArray(files)) {
            return NextResponse.json(
                { error: "Files array is required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const now = new Date();
        const projectFiles = files
            .filter((f: { path?: string; content?: string }) => f.path && typeof f.content === "string")
            .map((f: { path: string; content: string }) => ({
                path: f.path,
                content: f.content,
                updatedAt: now,
            }));

        const result = await Project.findByIdAndUpdate(
            projectId,
            { files: projectFiles },
            { new: true }
        );

        if (!result) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true,
            fileCount: projectFiles.length,
        });
    } catch (error) {
        console.error("Failed to replace project files:", error);
        return NextResponse.json(
            { error: "Failed to replace files" },
            { status: 500 }
        );
    }
}

// DELETE - Delete specific files
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;
        const { paths } = await request.json();

        if (!paths || !Array.isArray(paths)) {
            return NextResponse.json(
                { error: "Paths array is required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const result = await Project.findByIdAndUpdate(
            projectId,
            { $pull: { files: { path: { $in: paths } } } },
            { new: true }
        );

        if (!result) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true,
            remainingFiles: result.files?.length || 0,
        });
    } catch (error) {
        console.error("Failed to delete project files:", error);
        return NextResponse.json(
            { error: "Failed to delete files" },
            { status: 500 }
        );
    }
}
