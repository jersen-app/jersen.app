import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/actions/api-keys";
import connectToDatabase from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import BuilderClient from "./BuilderClient";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const project = await getProjectById(id);

    if (!project) {
        notFound();
    }

    // Get latest assistant message with files
    await connectToDatabase();
    const messages = await ChatMessage.find({
        projectId: id,
        role: "assistant",
        files: { $exists: true, $ne: {} }
    }).sort({ createdAt: -1 }).limit(1);

    const latestFiles = messages[0]?.files || {};
    const initialFiles = Object.entries(latestFiles).map(([path, content]) => ({
        path,
        content: content as string,
    }));

    return (
        <BuilderClient
            projectId={id}
            projectName={project.name}
            initialFiles={initialFiles}
        />
    );
}
