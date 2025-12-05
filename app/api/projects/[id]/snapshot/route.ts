import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import ProjectSnapshot from "@/models/ProjectSnapshot";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: projectId } = await params;
    await connectToDatabase();

    const snapshots = await ProjectSnapshot.find({ projectId })
        .sort({ createdAt: -1 })
        .select("name createdAt") // Don't fetch files to save bandwidth
        .limit(20);

    return NextResponse.json({ snapshots });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: projectId } = await params;
    const { action, snapshotId, name } = await request.json();

    await connectToDatabase();

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
        return new Response("Project not found", { status: 404 });
    }

    if (action === "create") {
        // Limit snapshots to 10 per project
        const snapshotCount = await ProjectSnapshot.countDocuments({ projectId });
        if (snapshotCount >= 10) {
            const oldestSnapshots = await ProjectSnapshot.find({ projectId })
                .sort({ createdAt: 1 })
                .limit(snapshotCount - 9) // Keep 9, so we can add 1
                .select("_id");
            
            if (oldestSnapshots.length > 0) {
                await ProjectSnapshot.deleteMany({
                    _id: { $in: oldestSnapshots.map(s => s._id) }
                });
            }
        }

        // Create a new snapshot
        const snapshot = await ProjectSnapshot.create({
            projectId,
            name: name || `Snapshot ${new Date().toLocaleString()}`,
            files: project.files,
        });

        return NextResponse.json({ 
            success: true, 
            snapshot: {
                _id: snapshot._id,
                name: snapshot.name,
                createdAt: snapshot.createdAt
            }
        });
    } else if (action === "restore") {
        if (!snapshotId) {
            return new Response("Snapshot ID required", { status: 400 });
        }

        const snapshot = await ProjectSnapshot.findById(snapshotId);
        if (!snapshot) {
            return new Response("Snapshot not found", { status: 404 });
        }

        // Create a backup of current state before restoring
        // Limit snapshots to 10 per project
        const snapshotCount = await ProjectSnapshot.countDocuments({ projectId });
        if (snapshotCount >= 10) {
            const oldestSnapshots = await ProjectSnapshot.find({ projectId })
                .sort({ createdAt: 1 })
                .limit(snapshotCount - 9)
                .select("_id");
            
            if (oldestSnapshots.length > 0) {
                await ProjectSnapshot.deleteMany({
                    _id: { $in: oldestSnapshots.map(s => s._id) }
                });
            }
        }

        await ProjectSnapshot.create({
            projectId,
            name: `Auto-backup before restore ${new Date().toLocaleString()}`,
            files: project.files,
        });

        // Restore files
        project.files = snapshot.files;
        await project.save();

        return NextResponse.json({ success: true, message: "Project restored successfully" });
    }

    return new Response("Invalid action", { status: 400 });
}
