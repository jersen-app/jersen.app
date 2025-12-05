import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import PlatformSettings, { AI_MODELS, SANDBOX_PROVIDERS, getPlatformSettings } from "@/models/PlatformSettings";

const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID;

// GET current settings
export async function GET() {
    const { userId } = await auth();

    if (!userId || userId !== SUPER_ADMIN_USER_ID) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await getPlatformSettings();

    return NextResponse.json({
        settings,
        availableModels: AI_MODELS,
        sandboxProviders: SANDBOX_PROVIDERS,
    });
}

// PATCH update settings
export async function PATCH(request: NextRequest) {
    const { userId } = await auth();

    if (!userId || userId !== SUPER_ADMIN_USER_ID) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { 
            aiModel, 
            sandboxProvider,
            vercelSandboxTimeout,
            e2bTemplateId,
            maxSandboxesPerOrg, 
            sandboxTimeoutMinutes, 
            autoPreviewEnabled,
            allowPublicSignup,
            allowPublicOrgCreation,
            requireOrgApproval,
            maxOrgsPerUser,
            disableDevTools,
            storageMaxImageSizeMB,
            storageMaxVideoSizeMB,
            storageDefaultProjectQuotaMB,
        } = body;

        // Validate model
        if (aiModel && !AI_MODELS.some(m => m.id === aiModel)) {
            return NextResponse.json(
                { error: "Invalid AI model" },
                { status: 400 }
            );
        }

        // Validate storage settings
        if (storageMaxImageSizeMB !== undefined && storageMaxImageSizeMB < 1) {
            return NextResponse.json(
                { error: "Max image size must be at least 1MB" },
                { status: 400 }
            );
        }

        if (storageMaxVideoSizeMB !== undefined && storageMaxVideoSizeMB < 1) {
            return NextResponse.json(
                { error: "Max video size must be at least 1MB" },
                { status: 400 }
            );
        }

        if (storageDefaultProjectQuotaMB !== undefined && storageDefaultProjectQuotaMB < 1) {
            return NextResponse.json(
                { error: "Default project quota must be at least 1MB" },
                { status: 400 }
            );
        }

        // Validate sandbox provider
        if (sandboxProvider && !SANDBOX_PROVIDERS.some(p => p.id === sandboxProvider)) {
            return NextResponse.json(
                { error: "Invalid sandbox provider" },
                { status: 400 }
            );
        }

        // Validate Vercel sandbox timeout (5-10 min for preview)
        if (vercelSandboxTimeout !== undefined && (vercelSandboxTimeout < 5 || vercelSandboxTimeout > 10)) {
            return NextResponse.json(
                { error: "Vercel sandbox timeout must be between 5 and 10 minutes" },
                { status: 400 }
            );
        }

        // Validate sandbox settings
        if (maxSandboxesPerOrg !== undefined && (maxSandboxesPerOrg < 1 || maxSandboxesPerOrg > 10)) {
            return NextResponse.json(
                { error: "Max sandboxes must be between 1 and 10" },
                { status: 400 }
            );
        }

        if (sandboxTimeoutMinutes !== undefined && (sandboxTimeoutMinutes < 1 || sandboxTimeoutMinutes > 60)) {
            return NextResponse.json(
                { error: "Sandbox timeout must be between 1 and 60 minutes" },
                { status: 400 }
            );
        }

        if (maxOrgsPerUser !== undefined && (maxOrgsPerUser < 1 || maxOrgsPerUser > 10)) {
            return NextResponse.json(
                { error: "Max orgs per user must be between 1 and 10" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const updateData: Record<string, unknown> = {};
        if (aiModel !== undefined) updateData.aiModel = aiModel;
        if (sandboxProvider !== undefined) updateData.sandboxProvider = sandboxProvider;
        if (vercelSandboxTimeout !== undefined) updateData.vercelSandboxTimeout = vercelSandboxTimeout;
        if (e2bTemplateId !== undefined) updateData.e2bTemplateId = e2bTemplateId;
        if (maxSandboxesPerOrg !== undefined) updateData.maxSandboxesPerOrg = maxSandboxesPerOrg;
        if (sandboxTimeoutMinutes !== undefined) updateData.sandboxTimeoutMinutes = sandboxTimeoutMinutes;
        if (autoPreviewEnabled !== undefined) updateData.autoPreviewEnabled = autoPreviewEnabled;
        if (allowPublicSignup !== undefined) updateData.allowPublicSignup = allowPublicSignup;
        if (allowPublicOrgCreation !== undefined) updateData.allowPublicOrgCreation = allowPublicOrgCreation;
        if (requireOrgApproval !== undefined) updateData.requireOrgApproval = requireOrgApproval;
        if (maxOrgsPerUser !== undefined) updateData.maxOrgsPerUser = maxOrgsPerUser;
        if (disableDevTools !== undefined) updateData.disableDevTools = disableDevTools;
        if (storageMaxImageSizeMB !== undefined) updateData.storageMaxImageSizeMB = storageMaxImageSizeMB;
        if (storageMaxVideoSizeMB !== undefined) updateData.storageMaxVideoSizeMB = storageMaxVideoSizeMB;
        if (storageDefaultProjectQuotaMB !== undefined) updateData.storageDefaultProjectQuotaMB = storageDefaultProjectQuotaMB;

        const settings = await PlatformSettings.findOneAndUpdate(
            { _id: "platform_settings" },
            { $set: updateData },
            { new: true, upsert: true }
        );

        return NextResponse.json({
            success: true,
            settings,
        });
    } catch (error) {
        console.error("Failed to update platform settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
