import { Sandbox } from "@e2b/code-interpreter";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const SANDBOX_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const TEMPLATE_ID = "nextjs-developer-song-dev";

// Store active sandboxes in memory (in production, use Redis)
const activeSandboxes = new Map<
    string,
    { sandboxId: string; expiresAt: number }
>();

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
        const { action, files } = await request.json();

        switch (action) {
            case "create":
                return await createSandbox(projectId, userId, files);

            case "update":
                return await updateSandbox(projectId, files);

            case "destroy":
                return await destroySandbox(projectId);

            case "get-url":
                return await getSandboxUrl(projectId);

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }
    } catch (error: unknown) {
        console.error("E2B Sandbox Error:", error);
        const message = error instanceof Error ? error.message : "Failed to manage sandbox";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

async function createSandbox(
    projectId: string,
    userId: string,
    files?: Record<string, string>
) {
    // Clean up expired sandboxes
    cleanupExpiredSandboxes();

    // Check if sandbox already exists and is still valid
    const existing = activeSandboxes.get(projectId);
    if (existing && existing.expiresAt > Date.now()) {
        try {
            const sandbox = await Sandbox.connect(existing.sandboxId);
            const url = `https://${sandbox.getHost(3000)}`;
            return NextResponse.json({
                sandboxId: existing.sandboxId,
                url,
                status: "existing",
            });
        } catch {
            // Sandbox expired or not found, remove from map
            activeSandboxes.delete(projectId);
        }
    }

    // Create new sandbox
    const sandbox = await Sandbox.create(TEMPLATE_ID, {
        metadata: {
            projectId,
            userId,
        },
        timeoutMs: SANDBOX_TIMEOUT,
    });

    console.log(`Created E2B sandbox ${sandbox.sandboxId} for project ${projectId}`);

    // Write files to sandbox
    // Note: nextjs-developer template uses /home/user as working directory
    if (files && Object.keys(files).length > 0) {
        const fileWrites = Object.entries(files).map(([path, content]) => ({
            path: `/home/user/${path}`,
            data: content,
        }));
        await sandbox.files.write(fileWrites);
        console.log(`Wrote ${fileWrites.length} files to sandbox:`, fileWrites.map(f => f.path).join(', '));
        
        // Check if package.json was updated and install dependencies
        if (files['package.json']) {
            console.log('package.json detected, installing dependencies...');
            try {
                const installResult = await sandbox.commands.run('cd /home/user && bun install', { timeoutMs: 60000 });
                console.log('bun install result:', installResult.exitCode === 0 ? 'success' : 'failed');
                if (installResult.stderr) {
                    console.log('bun install stderr:', installResult.stderr);
                }
            } catch (error) {
                console.error('Failed to run bun install:', error);
            }
        }
    }

    // Dev server is already running from template start command
    // Just wait a moment for it to be ready
    console.log(`Sandbox ${sandbox.sandboxId} dev server should already be running`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Store sandbox reference
    activeSandboxes.set(projectId, {
        sandboxId: sandbox.sandboxId,
        expiresAt: Date.now() + SANDBOX_TIMEOUT,
    });

    const url = `https://${sandbox.getHost(3000)}`;

    return NextResponse.json({
        sandboxId: sandbox.sandboxId,
        url,
        status: "created",
    });
}

async function updateSandbox(
    projectId: string,
    files?: Record<string, string>
) {
    const existing = activeSandboxes.get(projectId);

    if (!existing || existing.expiresAt < Date.now()) {
        return NextResponse.json(
            { error: "Sandbox not found or expired. Please create a new one." },
            { status: 404 }
        );
    }

    try {
        const sandbox = await Sandbox.connect(existing.sandboxId);

        // Update files
        if (files && Object.keys(files).length > 0) {
            const fileWrites = Object.entries(files).map(([path, content]) => ({
                path: `/home/user/${path}`,
                data: content,
            }));
            await sandbox.files.write(fileWrites);
            console.log(`Updated files in sandbox:`, fileWrites.map(f => f.path).join(', '));
            
            // Check if package.json was updated and install dependencies
            if (files['package.json']) {
                console.log('package.json updated, installing dependencies...');
                try {
                    const installResult = await sandbox.commands.run('cd /home/user && bun install', { timeoutMs: 60000 });
                    console.log('bun install result:', installResult.exitCode === 0 ? 'success' : 'failed');
                } catch (error) {
                    console.error('Failed to run bun install:', error);
                }
            }
        }

        const url = `https://${sandbox.getHost(3000)}`;

        return NextResponse.json({
            sandboxId: sandbox.sandboxId,
            url,
            status: "updated",
        });
    } catch (error) {
        console.error("Failed to update sandbox:", error);
        activeSandboxes.delete(projectId);
        return NextResponse.json(
            { error: "Sandbox connection failed. Please create a new one." },
            { status: 404 }
        );
    }
}

async function destroySandbox(projectId: string) {
    const existing = activeSandboxes.get(projectId);

    if (!existing) {
        return NextResponse.json({ status: "not-found" });
    }

    try {
        const sandbox = await Sandbox.connect(existing.sandboxId);
        await sandbox.kill();
    } catch (error) {
        console.error("Failed to destroy sandbox:", error);
    }

    activeSandboxes.delete(projectId);
    console.log(`Destroyed sandbox for project ${projectId}`);

    return NextResponse.json({ status: "destroyed" });
}

async function getSandboxUrl(projectId: string) {
    const existing = activeSandboxes.get(projectId);

    if (!existing || existing.expiresAt < Date.now()) {
        return NextResponse.json(
            { error: "Sandbox not found or expired" },
            { status: 404 }
        );
    }

    try {
        const sandbox = await Sandbox.connect(existing.sandboxId);
        const url = `https://${sandbox.getHost(3000)}`;

        return NextResponse.json({
            sandboxId: existing.sandboxId,
            url,
            expiresAt: existing.expiresAt,
        });
    } catch {
        activeSandboxes.delete(projectId);
        return NextResponse.json(
            { error: "Sandbox not found or expired" },
            { status: 404 }
        );
    }
}

function cleanupExpiredSandboxes() {
    const now = Date.now();
    activeSandboxes.forEach(({ sandboxId, expiresAt }, projectId) => {
        if (expiresAt < now) {
            Sandbox.connect(sandboxId)
                .then((sandbox) => sandbox.kill())
                .catch(console.error);
            activeSandboxes.delete(projectId);
            console.log(`Cleaned up expired sandbox for project ${projectId}`);
        }
    });
}
