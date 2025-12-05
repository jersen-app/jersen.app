import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import ProjectSnapshot from "@/models/ProjectSnapshot";
import AdmZip from "adm-zip";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: projectId } = await params;
    await connectToDatabase();

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
        return new Response("Project not found", { status: 404 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new Response("No file uploaded", { status: 400 });
        }

        // Create a backup snapshot before importing
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
            name: `Backup before import ${new Date().toLocaleString()}`,
            files: project.files,
        });

        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();

        const newFiles: Array<{ path: string; content: string }> = [];
        // Reset dependencies - we will rebuild from package.json
        const newDependencies: Set<string> = new Set();
        let foundPackageJson = false;

        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;

            const path = entry.entryName;

            // Ignore specific directories and files
            if (
                path.includes("node_modules/") ||
                path.includes(".next/") ||
                path.includes(".git/") ||
                path.includes(".vercel/") ||
                path.includes(".DS_Store") ||
                path.endsWith(".lock") ||
                path.endsWith("-lock.json") ||
                path.endsWith(".log")
            ) {
                continue;
            }

            const content = entry.getData().toString("utf8");
            
            // If package.json, parse dependencies
            if (path === "package.json") {
                foundPackageJson = true;
                try {
                    const pkg = JSON.parse(content);
                    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                    
                    // Add new dependencies to the set
                    for (const [name, version] of Object.entries(deps)) {
                        // Skip standard Next.js deps that are always included
                        if (["next", "react", "react-dom", "typescript", "@types/node", "@types/react", "@types/react-dom", "lucide-react", "tailwindcss", "postcss", "autoprefixer", "eslint", "eslint-config-next"].includes(name)) {
                            continue;
                        }
                        
                        // Store as name@version to preserve versioning
                        if (typeof version === 'string') {
                            newDependencies.add(`${name}@${version}`);
                        } else {
                            newDependencies.add(name);
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse imported package.json", e);
                }
            }

            newFiles.push({
                path: path.startsWith("/") ? path.slice(1) : path,
                content,
            });
        }

        // Update project files
        // We replace ALL files with the imported ones (since we made a backup)
        // Or should we merge? "Import" usually implies replacing the state.
        // The user said "it will become the new snapshot", implying full state replacement.
        
        // Map to IProjectFile format
        const projectFiles = newFiles.map(f => ({
            path: f.path,
            content: f.content,
            updatedAt: new Date(),
        }));

        project.files = projectFiles;
        
        // Only update dependencies if we found a package.json
        if (foundPackageJson) {
            project.dependencies = Array.from(newDependencies);
        }
        
        await project.save();

        // Create a snapshot of the NEW state
        await ProjectSnapshot.create({
            projectId,
            name: `Imported from ZIP ${new Date().toLocaleString()}`,
            files: projectFiles,
        });

        return NextResponse.json({ success: true, fileCount: newFiles.length });

    } catch (error) {
        console.error("Import failed:", error);
        return new Response("Import failed", { status: 500 });
    }
}
