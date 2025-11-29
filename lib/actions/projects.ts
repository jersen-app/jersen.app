"use server";

import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { revalidatePath } from "next/cache";
import { generateApiKey, hashApiKey } from "@/lib/crypto";
import { provisionDatabase } from "@/lib/database/provisioner";

export async function getProjects() {
    const { orgId } = await auth();

    if (!orgId) {
        return [];
    }

    await connectToDatabase();

    const projects = await Project.find({ orgId }).sort({ createdAt: -1 });

    return JSON.parse(JSON.stringify(projects));
}

export async function createProject(formData: FormData) {
    const { orgId, userId } = await auth();

    if (!orgId || !userId) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;

    if (!name) {
        throw new Error("Project name is required");
    }

    await connectToDatabase();

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    // Create project with API key
    const project = await Project.create({
        name,
        description,
        status,
        orgId,
        userId,
        apiKey,
        apiKeyHash,
    });

    // Optionally provision database
    try {
        const dbConfig = await provisionDatabase(project._id.toString());
        project.providers.database.dbName = dbConfig.dbName;
        project.providers.database.credentials = dbConfig.credentials;
        await project.save();
    } catch (error) {
        console.error("Database provisioning failed:", error);
        // Continue even if provisioning fails - can be done later
    }

    revalidatePath("/dashboard/projects");

    return { apiKey, projectId: project._id.toString() };
}
