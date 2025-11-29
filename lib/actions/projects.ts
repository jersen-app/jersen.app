"use server";

import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { revalidatePath } from "next/cache";

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

    await Project.create({
        name,
        description,
        status,
        orgId,
        userId,
    });

    revalidatePath("/dashboard/projects");
}
