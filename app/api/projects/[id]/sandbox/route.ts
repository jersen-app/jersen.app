import { Sandbox } from "@e2b/code-interpreter";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";

export const maxDuration = 300;

const SANDBOX_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const TEMPLATE_ID = "nextjs-developer-song-dev";

// Get the Jersen API URL based on environment
const JERSEN_API_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000";

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

    // Fetch project to get API key and dependencies - use fresh query
    await connectToDatabase();
    const project = await Project.findById(projectId).lean();
    
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    console.log(`Project ${projectId} has dependencies:`, project.dependencies || []);

    // Create new sandbox
    const sandbox = await Sandbox.create(TEMPLATE_ID, {
        metadata: {
            projectId,
            userId,
        },
        timeoutMs: SANDBOX_TIMEOUT,
    });

    console.log(`Created E2B sandbox ${sandbox.sandboxId} for project ${projectId}`);

    // Generate .env.local content with Jersen provider credentials
    const envContent = generateEnvFile(project);
    
    // Prepare files to write (including .env.local)
    const filesToWrite: Record<string, string> = {
        '.env.local': envContent,
        ...(files || {}),
    };

    // Write files to sandbox one by one
    // Note: nextjs-developer template uses /home/user as working directory
    if (Object.keys(filesToWrite).length > 0) {
        console.log(`Writing ${Object.keys(filesToWrite).length} files to sandbox...`);
        for (const [path, content] of Object.entries(filesToWrite)) {
            const fullPath = `/home/user/${path}`;
            try {
                await sandbox.files.write(fullPath, content);
                console.log(`Wrote: ${fullPath}`);
            } catch (error) {
                console.error(`Failed to write ${fullPath}:`, error);
            }
        }
    }
    
    // Install stored dependencies from the project
    const projectDeps: string[] = (project as any).dependencies || [];
    console.log(`Project dependencies to install: [${projectDeps.join(', ')}]`);
    if (projectDeps.length > 0) {
        console.log(`Installing project dependencies: ${projectDeps.join(', ')}`);
        try {
            const depsString = projectDeps.join(' ');
            const installResult = await sandbox.commands.run(`cd /home/user && bun add ${depsString}`, { timeoutMs: 120000 });
            console.log('bun add result:', installResult.exitCode === 0 ? 'success' : 'failed');
            if (installResult.stderr) {
                console.log('bun add stderr:', installResult.stderr);
            }
            if (installResult.stdout) {
                console.log('bun add stdout:', installResult.stdout);
            }
        } catch (error) {
            console.error('Failed to install dependencies:', error);
        }
    } else {
        console.log('No dependencies to install');
    }
    
    // Check if package.json was updated and install additional dependencies
    if (files && files['package.json']) {
        console.log('package.json detected, running bun install...');
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

/**
 * Generate .env.local content for the sandbox with Jersen provider credentials
 */
function generateEnvFile(project: any): string {
    const lines: string[] = [
        '# Jersen Platform Environment Variables',
        '# Auto-generated for sandbox preview',
        '',
        `# Jersen API Configuration`,
        `NEXT_PUBLIC_JERSEN_API_KEY=${project.apiKey || ''}`,
        `NEXT_PUBLIC_JERSEN_API_URL=${JERSEN_API_URL}`,
        '',
    ];

    // Add database connection string if provisioned
    if (project.providers?.database?.enabled && project.providers?.database?.dbName) {
        lines.push('# Database (for server-side use only)');
        lines.push(`JERSEN_DB_NAME=${project.providers.database.dbName}`);
        lines.push('');
    }

    // Add storage info if enabled
    if (project.providers?.storage?.enabled) {
        lines.push('# Storage');
        lines.push(`JERSEN_STORAGE_ENABLED=true`);
        lines.push(`JERSEN_STORAGE_QUOTA=${project.providers.storage.quota || 1024}`);
        lines.push('');
    }

    // Add auth info if enabled
    if (project.providers?.auth?.enabled) {
        lines.push('# Auth (Clerk)');
        lines.push(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''}`);
        lines.push('');
    }

    return lines.join('\n');
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

        // Fetch project to check for new dependencies
        await connectToDatabase();
        const project = await Project.findById(projectId);

        // Update files one by one
        if (files && Object.keys(files).length > 0) {
            console.log(`Updating ${Object.keys(files).length} files in sandbox...`);
            for (const [path, content] of Object.entries(files)) {
                const fullPath = `/home/user/${path}`;
                try {
                    await sandbox.files.write(fullPath, content);
                    console.log(`Updated: ${fullPath}`);
                } catch (error) {
                    console.error(`Failed to update ${fullPath}:`, error);
                }
            }
        }
        
        // Install any new dependencies from the project
        const projectDeps = project?.dependencies || [];
        if (projectDeps.length > 0) {
            console.log(`Ensuring dependencies installed: ${projectDeps.join(', ')}`);
            try {
                const depsString = projectDeps.join(' ');
                const installResult = await sandbox.commands.run(`cd /home/user && bun add ${depsString}`, { timeoutMs: 120000 });
                console.log('bun add result:', installResult.exitCode === 0 ? 'success' : 'failed');
            } catch (error) {
                console.error('Failed to install dependencies:', error);
            }
        }
        
        // Check if package.json was updated and run bun install
        if (files && files['package.json']) {
            console.log('package.json updated, running bun install...');
            try {
                const installResult = await sandbox.commands.run('cd /home/user && bun install', { timeoutMs: 60000 });
                console.log('bun install result:', installResult.exitCode === 0 ? 'success' : 'failed');
            } catch (error) {
                console.error('Failed to run bun install:', error);
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
