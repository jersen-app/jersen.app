import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import BuilderClient from "./BuilderClient";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    await connectToDatabase();
    const project = await Project.findById(id).lean();

    if (!project) {
        notFound();
    }

    // Load files from project
    const initialFiles = (project.files || []).map((file: { path: string; content: string }) => ({
        path: file.path,
        content: file.content,
    }));

    return (
        <BuilderClient
            projectId={id}
            projectName={project.name}
            initialFiles={initialFiles}
            vercelDeploymentUrl={project.vercelDeploymentUrl}
            lastDeployedAt={project.lastDeployedAt?.toISOString()}
        />
    );
}
