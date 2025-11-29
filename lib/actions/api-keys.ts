"use server";

import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";

export async function getProjectById(projectId: string) {
    const { orgId } = await auth();

    if (!orgId) {
        return null;
    }

    await connectToDatabase();

    const project = await Project.findOne({ _id: projectId, orgId });

    return JSON.parse(JSON.stringify(project));
}

export async function regenerateApiKey(projectId: string) {
    const { orgId } = await auth();

    if (!orgId) {
        throw new Error("Unauthorized");
    }

    const { generateApiKey, hashApiKey } = await import("@/lib/crypto");

    await connectToDatabase();

    const project = await Project.findOne({ _id: projectId, orgId });

    if (!project) {
        throw new Error("Project not found");
    }

    const newApiKey = generateApiKey();
    const newApiKeyHash = await hashApiKey(newApiKey);

    project.apiKey = newApiKey;
    project.apiKeyHash = newApiKeyHash;
    await project.save();

    return { apiKey: newApiKey };
}
