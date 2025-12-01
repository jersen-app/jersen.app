import { Sandbox } from "@e2b/code-interpreter";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { getPlatformSettings } from "@/models/PlatformSettings";
import OrganizationSettings from "@/models/OrganizationSettings";
import ActiveSandbox, { 
    getOrgActiveSandboxes, 
    getProjectSandbox, 
    registerSandbox, 
    unregisterSandbox,
    getOldestOrgSandbox 
} from "@/models/ActiveSandbox";
import { sandboxRatelimit, checkRateLimit, getRateLimitIdentifier } from "@/lib/ratelimit";

export const maxDuration = 300;

const TEMPLATE_ID = "nextjs-developer-song-dev";

// Get the Jersen API URL based on environment
function getJersenApiUrl(): string {
    let url = '';
    if (process.env.NEXT_PUBLIC_APP_URL) {
        url = process.env.NEXT_PUBLIC_APP_URL;
    } else if (process.env.VERCEL_URL) {
        url = `https://${process.env.VERCEL_URL}`;
    } else {
        url = 'http://localhost:3000';
    }
    // Remove trailing slash to prevent double slashes in URLs
    return url.replace(/\/$/, '');
}

const JERSEN_API_URL = getJersenApiUrl();

// Get effective sandbox settings (org override or platform default)
async function getSandboxSettings(orgId: string) {
    const platformSettings = await getPlatformSettings();
    const orgSettings = await OrganizationSettings.findOne({ orgId }).lean();
    
    return {
        maxSandboxesPerOrg: orgSettings?.maxSandboxesPerOrg ?? platformSettings.maxSandboxesPerOrg ?? 1,
        sandboxTimeoutMinutes: orgSettings?.sandboxTimeoutMinutes ?? platformSettings.sandboxTimeoutMinutes ?? 10,
        autoPreviewEnabled: orgSettings?.autoPreviewEnabled ?? platformSettings.autoPreviewEnabled ?? true,
    };
}

// Kill a sandbox by its ID
async function killSandboxById(sandboxId: string): Promise<void> {
    try {
        const sandbox = await Sandbox.connect(sandboxId);
        await sandbox.kill();
        console.log(`Killed sandbox ${sandboxId}`);
    } catch (error) {
        console.error(`Failed to kill sandbox ${sandboxId}:`, error);
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting
        const rateLimitId = getRateLimitIdentifier(userId, request);
        const rateLimited = await checkRateLimit(sandboxRatelimit, rateLimitId);
        if (rateLimited) return rateLimited;

        const { id: projectId } = await params;
        const { action, files } = await request.json();

        await connectToDatabase();

        switch (action) {
            case "create":
                return await createSandbox(projectId, userId, files);

            case "update":
                return await updateSandbox(projectId, files);

            case "destroy":
                return await destroySandbox(projectId);

            case "get-url":
                return await getSandboxUrl(projectId);
            
            case "get-settings":
                return await getSettings(projectId);

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

async function getSettings(projectId: string) {
    const project = await Project.findById(projectId).lean();
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    const orgId = (project as any).orgId;
    const settings = await getSandboxSettings(orgId);
    
    return NextResponse.json({ settings });
}

async function createSandbox(
    projectId: string,
    userId: string,
    files?: Record<string, string>
) {
    // Fetch project to get API key, dependencies, and org
    const project = await Project.findById(projectId).lean();
    
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    const orgId = (project as any).orgId;
    const settings = await getSandboxSettings(orgId);
    const sandboxTimeoutMs = settings.sandboxTimeoutMinutes * 60 * 1000;

    // Check if sandbox already exists for this project
    const existingProjectSandbox = await getProjectSandbox(projectId);
    if (existingProjectSandbox) {
        try {
            const sandbox = await Sandbox.connect(existingProjectSandbox.sandboxId);
            
            // If files were passed, sync them to the existing sandbox
            if (files && Object.keys(files).length > 0) {
                const apiKey = (project as any).apiKey || '';
                const processedFiles = injectCredentials(files, apiKey, JERSEN_API_URL);
                
                console.log(`Syncing ${Object.keys(processedFiles).length} files to existing sandbox...`);
                for (const [path, content] of Object.entries(processedFiles)) {
                    const fullPath = `/home/user/${path}`;
                    try {
                        await sandbox.files.write(fullPath, content);
                        console.log(`Synced: ${fullPath}`);
                    } catch (error) {
                        console.error(`Failed to sync ${fullPath}:`, error);
                    }
                }
            }
            
            const url = `https://${sandbox.getHost(3000)}`;
            return NextResponse.json({
                sandboxId: existingProjectSandbox.sandboxId,
                url,
                status: "existing",
            });
        } catch {
            // Sandbox expired or not found, remove from DB
            await unregisterSandbox(projectId);
        }
    }

    // Check organization sandbox limit
    const orgSandboxes = await getOrgActiveSandboxes(orgId);
    
    if (orgSandboxes.length >= settings.maxSandboxesPerOrg) {
        // Need to kill the oldest sandbox to make room
        const oldestSandbox = await getOldestOrgSandbox(orgId, projectId);
        if (oldestSandbox) {
            console.log(`Org ${orgId} at sandbox limit (${settings.maxSandboxesPerOrg}), killing oldest sandbox for project ${oldestSandbox.projectId}`);
            await killSandboxById(oldestSandbox.sandboxId);
            await unregisterSandbox(oldestSandbox.projectId);
        }
    }
    
    console.log(`Project ${projectId} has dependencies:`, (project as any).dependencies || []);

    // Create new sandbox
    const sandbox = await Sandbox.create(TEMPLATE_ID, {
        metadata: {
            projectId,
            userId,
            orgId,
        },
        timeoutMs: sandboxTimeoutMs,
    });

    console.log(`Created E2B sandbox ${sandbox.sandboxId} for project ${projectId}`);
    console.log(`JERSEN_API_URL for sandbox: ${JERSEN_API_URL}`);

    // Replace placeholders in files with actual values
    const apiKey = (project as any).apiKey || '';
    const processedFiles = injectCredentials(files || {}, apiKey, JERSEN_API_URL);
    
    // Write files to sandbox one by one
    // Note: nextjs-developer template uses /home/user as working directory
    if (Object.keys(processedFiles).length > 0) {
        console.log(`Writing ${Object.keys(processedFiles).length} files to sandbox...`);
        for (const [path, content] of Object.entries(processedFiles)) {
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

    const url = `https://${sandbox.getHost(3000)}`;

    // Register sandbox in database
    await registerSandbox(
        orgId,
        projectId,
        sandbox.sandboxId,
        url,
        userId,
        settings.sandboxTimeoutMinutes
    );
    
    // Save sandbox URL to project for CORS whitelist
    await Project.updateOne(
        { _id: projectId },
        { $set: { sandboxUrl: url } }
    );
    console.log(`Saved sandbox URL to project: ${url}`);

    return NextResponse.json({
        sandboxId: sandbox.sandboxId,
        url,
        status: "created",
    });
}

/**
 * Replace placeholders in file contents with actual credentials
 */
function injectCredentials(
    files: Record<string, string>,
    apiKey: string,
    jersenUrl: string
): Record<string, string> {
    const processed: Record<string, string> = {};
    // Ensure no trailing slash in URL to prevent double slashes
    const cleanUrl = jersenUrl.replace(/\/$/, '');
    
    for (const [path, content] of Object.entries(files)) {
        let processedContent = content;
        // Replace placeholders
        processedContent = processedContent.replace(/__JERSEN_API_KEY__/g, apiKey);
        processedContent = processedContent.replace(/__JERSEN_URL__/g, cleanUrl);
        processed[path] = processedContent;
    }
    
    return processed;
}

async function updateSandbox(
    projectId: string,
    files?: Record<string, string>
) {
    const existing = await getProjectSandbox(projectId);

    if (!existing) {
        return NextResponse.json(
            { error: "Sandbox not found or expired. Please create a new one." },
            { status: 404 }
        );
    }

    try {
        const sandbox = await Sandbox.connect(existing.sandboxId);

        // Fetch project to get API key and check for new dependencies
        const project = await Project.findById(projectId);
        
        // Replace placeholders with actual values
        const apiKey = (project as any)?.apiKey || '';
        const processedFiles = files ? injectCredentials(files, apiKey, JERSEN_API_URL) : {};

        // Update files one by one
        if (Object.keys(processedFiles).length > 0) {
            console.log(`Updating ${Object.keys(processedFiles).length} files in sandbox...`);
            for (const [path, content] of Object.entries(processedFiles)) {
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
        await unregisterSandbox(projectId);
        return NextResponse.json(
            { error: "Sandbox connection failed. Please create a new one." },
            { status: 404 }
        );
    }
}

async function destroySandbox(projectId: string) {
    const existing = await getProjectSandbox(projectId);

    if (!existing) {
        return NextResponse.json({ status: "not-found" });
    }

    try {
        await killSandboxById(existing.sandboxId);
    } catch (error) {
        console.error("Failed to destroy sandbox:", error);
    }

    await unregisterSandbox(projectId);
    console.log(`Destroyed sandbox for project ${projectId}`);

    return NextResponse.json({ status: "destroyed" });
}

async function getSandboxUrl(projectId: string) {
    const existing = await getProjectSandbox(projectId);

    if (!existing) {
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
            expiresAt: existing.expiresAt.getTime(),
        });
    } catch {
        await unregisterSandbox(projectId);
        return NextResponse.json(
            { error: "Sandbox not found or expired" },
            { status: 404 }
        );
    }
}
