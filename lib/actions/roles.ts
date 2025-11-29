"use server";

import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Role, { IRole } from "@/models/Role";
import { revalidatePath } from "next/cache";

export async function getRoles() {
    const { orgId } = await auth();

    if (!orgId) {
        return [];
    }

    await connectToDatabase();

    const roles = await Role.find({ orgId }).sort({ createdAt: -1 });

    // Convert Mongoose documents to plain objects to avoid serialization issues
    return JSON.parse(JSON.stringify(roles));
}

export async function createRole(formData: FormData) {
    const { orgId } = await auth();

    if (!orgId) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const permissions = (formData.get("permissions") as string)
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    if (!name) {
        throw new Error("Role name is required");
    }

    await connectToDatabase();

    await Role.create({
        name,
        description,
        permissions,
        orgId,
    });

    revalidatePath("/dashboard/settings/roles");
}

export async function deleteRole(roleId: string) {
    const { orgId } = await auth();

    if (!orgId) {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();

    await Role.findOneAndDelete({ _id: roleId, orgId });

    revalidatePath("/dashboard/settings/roles");
}
