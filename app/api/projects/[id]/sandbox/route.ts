import { Sandbox } from "@e2b/code-interpreter";
import { Sandbox as VercelSandbox } from "@vercel/sandbox";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { getPlatformSettings } from "@/models/PlatformSettings";
import OrganizationSettings from "@/models/OrganizationSettings";
import VercelIntegration from "@/models/VercelIntegration";
import ActiveSandbox, { 
    getOrgActiveSandboxes, 
    getProjectSandbox, 
    registerSandbox, 
    unregisterSandbox,
    getOldestOrgSandbox 
} from "@/models/ActiveSandbox";
import { sandboxRatelimit, checkRateLimit, getRateLimitIdentifier } from "@/lib/ratelimit";

export const maxDuration = 300;

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
    const cleanUrl = url.replace(/\/$/, '');
    
    // Warn if using localhost - E2B sandbox cannot reach localhost
    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
        console.warn(
            '⚠️  WARNING: NEXT_PUBLIC_APP_URL is set to localhost.',
            '\n   E2B sandbox CANNOT reach localhost on your machine.',
            '\n   Auth, Storage, and Database providers will NOT work in preview.',
            '\n   To fix: Use ngrok or a tunnel service:',
            '\n   1. Run: ngrok http 3000',
            '\n   2. Update .env.local: NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io',
            '\n   3. Restart the dev server'
        );
    }
    
    return cleanUrl;
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
        sandboxProvider: platformSettings.sandboxProvider ?? "e2b",
        vercelSandboxTimeout: platformSettings.vercelSandboxTimeout ?? 10,
        e2bTemplateId: platformSettings.e2bTemplateId || "nextjs-developer-song-dev",
    };
}

// Check if user has Vercel connected and get credentials for sandbox
async function getVercelCredentials(userId: string, orgId: string | null) {
    const integration = await VercelIntegration.findOne({
        userId,
        orgId: orgId || null,
    });

    if (!integration) {
        return null;
    }

    // For sandbox, we need the sandboxAccessToken (personal access token)
    // The OAuth accessToken is for deployments, not sandbox
    if (!integration.sandboxAccessToken) {
        return {
            connected: true,
            hasSandboxToken: false,
            teamId: integration.vercelTeamId || undefined,
            vercelUserId: integration.vercelUserId,
        };
    }

    return {
        connected: true,
        hasSandboxToken: true,
        teamId: integration.vercelTeamId || undefined,
        projectId: integration.sandboxProjectId || undefined,
        token: integration.sandboxAccessToken,
        vercelUserId: integration.vercelUserId,
        integrationId: integration._id,
    };
}

// Create a Vercel project for sandboxes if one doesn't exist
async function ensureVercelSandboxProject(
    token: string,
    teamId?: string,
    integrationId?: string
): Promise<string> {
    const projectName = "jersen-sandbox";
    
    // Check if project already exists
    const listUrl = teamId 
        ? `https://api.vercel.com/v9/projects?teamId=${teamId}`
        : `https://api.vercel.com/v9/projects`;
    
    const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
    });
    
    if (listRes.ok) {
        const data = await listRes.json();
        const existingProject = data.projects?.find((p: any) => p.name === projectName);
        if (existingProject) {
            // Update integration with project ID if not already stored
            if (integrationId) {
                await VercelIntegration.updateOne(
                    { _id: integrationId },
                    { $set: { sandboxProjectId: existingProject.id } }
                );
            }
            return existingProject.id;
        }
    }
    
    // Create new project
    const createUrl = teamId
        ? `https://api.vercel.com/v10/projects?teamId=${teamId}`
        : `https://api.vercel.com/v10/projects`;
    
    const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: projectName,
            framework: "nextjs",
        }),
    });
    
    if (!createRes.ok) {
        const error = await createRes.text();
        console.error("Failed to create Vercel project:", error);
        throw new Error(`Failed to create Vercel sandbox project: ${error}`);
    }
    
    const newProject = await createRes.json();
    
    // Update integration with project ID
    if (integrationId) {
        await VercelIntegration.updateOne(
            { _id: integrationId },
            { $set: { sandboxProjectId: newProject.id } }
        );
    }
    
    console.log(`Created Vercel project "${projectName}" with ID: ${newProject.id}`);
    return newProject.id;
}

// Determine which provider to use
async function determineProvider(
    userId: string, 
    orgId: string | null, 
    requestedProvider?: string
): Promise<{ provider: "e2b" | "vercel"; credentials?: { teamId?: string; token: string; vercelUserId: string; projectId?: string; integrationId?: unknown } }> {
    const platformSettings = await getPlatformSettings();
    const sandboxProvider = platformSettings.sandboxProvider || "e2b";
    
    // If E2B only, always use E2B
    if (sandboxProvider === "e2b") {
        return { provider: "e2b" };
    }
    
    // Check if user has Vercel connected
    const vercelCredentials = await getVercelCredentials(userId, orgId);
    
    if (sandboxProvider === "vercel") {
        // Vercel only mode - require connection AND sandbox token
        if (!vercelCredentials) {
            throw new Error("VERCEL_NOT_CONNECTED");
        }
        if (!vercelCredentials.hasSandboxToken || !vercelCredentials.token) {
            throw new Error("SANDBOX_TOKEN_REQUIRED");
        }
        return { 
            provider: "vercel", 
            credentials: {
                teamId: vercelCredentials.teamId,
                token: vercelCredentials.token,
                vercelUserId: vercelCredentials.vercelUserId,
                projectId: vercelCredentials.projectId,
                integrationId: vercelCredentials.integrationId,
            }
        };
    }
    
    // Both mode - use Vercel if connected with sandbox token, otherwise E2B
    if (vercelCredentials?.hasSandboxToken && vercelCredentials.token) {
        return { 
            provider: "vercel", 
            credentials: {
                teamId: vercelCredentials.teamId,
                token: vercelCredentials.token,
                vercelUserId: vercelCredentials.vercelUserId,
                projectId: vercelCredentials.projectId,
                integrationId: vercelCredentials.integrationId,
            }
        };
    }
    
    return { provider: "e2b" };
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
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting
        const rateLimitId = getRateLimitIdentifier(userId, request);
        const rateLimited = await checkRateLimit(sandboxRatelimit, rateLimitId);
        if (rateLimited) return rateLimited;

        const { id: projectId } = await params;
        const { action, files, provider: requestedProvider } = await request.json();

        await connectToDatabase();

        switch (action) {
            case "create":
                return await createSandbox(projectId, userId, orgId || null, files, requestedProvider);

            case "update":
                return await updateSandbox(projectId, userId, orgId || null, files, requestedProvider);

            case "destroy":
                return await destroySandbox(projectId, userId, orgId || null, requestedProvider);

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
        console.error("Sandbox Error:", error);
        
        // Handle Vercel connection required error
        if (error instanceof Error && error.message === "VERCEL_NOT_CONNECTED") {
            return NextResponse.json(
                { 
                    error: "Vercel connection required. Please connect your Vercel account to preview projects.",
                    code: "VERCEL_NOT_CONNECTED"
                },
                { status: 400 }
            );
        }
        
        // Handle sandbox token required error
        if (error instanceof Error && error.message === "SANDBOX_TOKEN_REQUIRED") {
            return NextResponse.json(
                { 
                    error: "Sandbox access token required. Please add your Vercel personal access token in Settings → Integrations.",
                    code: "SANDBOX_TOKEN_REQUIRED"
                },
                { status: 400 }
            );
        }
        
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
    orgId: string | null,
    files?: Record<string, string>,
    requestedProvider?: string
) {
    // Fetch project to get API key, dependencies, and org
    const project = await Project.findById(projectId).lean();
    
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    const projectOrgId = (project as any).orgId;
    const settings = await getSandboxSettings(projectOrgId);
    
    // Determine which provider to use
    const { provider, credentials } = await determineProvider(userId, orgId, requestedProvider);
    
    console.log(`Creating sandbox for project ${projectId} using provider: ${provider}`);
    
    if (provider === "vercel") {
        return await createVercelSandboxInternal(
            projectId, 
            userId, 
            projectOrgId, 
            files, 
            credentials!, 
            settings
        );
    }
    
    // E2B sandbox (existing logic)
    return await createE2BSandbox(projectId, userId, projectOrgId, files, settings);
}

async function createE2BSandbox(
    projectId: string,
    userId: string,
    orgId: string,
    files?: Record<string, string>,
    settings?: Awaited<ReturnType<typeof getSandboxSettings>>
) {
    if (!settings) {
        settings = await getSandboxSettings(orgId);
    }
    
    const project = await Project.findById(projectId).lean();
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
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
    const sandbox = await Sandbox.create(settings.e2bTemplateId, {
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
    
    // Write files to sandbox in parallel for speed
    // Note: nextjs-developer template uses /home/user as working directory
    if (Object.keys(processedFiles).length > 0) {
        console.log(`Writing ${Object.keys(processedFiles).length} files to sandbox...`);
        
        // Group files into batches to avoid overwhelming the sandbox connection
        const BATCH_SIZE = 5;
        const fileEntries = Object.entries(processedFiles);
        
        for (let i = 0; i < fileEntries.length; i += BATCH_SIZE) {
            const batch = fileEntries.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async ([path, content]) => {
                const fullPath = `/home/user/${path}`;
                try {
                    await sandbox.files.write(fullPath, content);
                    console.log(`Wrote: ${fullPath}`);
                } catch (error) {
                    console.error(`Failed to write ${fullPath}:`, error);
                }
            }));
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
        settings.sandboxTimeoutMinutes,
        "e2b" // provider
    );
    
    // Save sandbox URL to project for CORS whitelist
    // Also add to allowedOrigins array so it persists even when sandbox changes
    await Project.updateOne(
        { _id: projectId },
        { 
            $set: { sandboxUrl: url },
            $addToSet: { allowedOrigins: url }
        }
    );
    console.log(`Saved sandbox URL to project: ${url}`);

    // Check if providers will work (not if using localhost)
    const isLocalhost = JERSEN_API_URL.includes('localhost') || JERSEN_API_URL.includes('127.0.0.1');

    return NextResponse.json({
        sandboxId: sandbox.sandboxId,
        url,
        status: "created",
        provider: "e2b",
        warning: isLocalhost ? 
            "Auth, Storage, and Database providers will not work because NEXT_PUBLIC_APP_URL is set to localhost. Use ngrok or a tunnel service to expose your local server." : 
            undefined,
    });
}

/**
 * Create a Vercel Sandbox for the project
 */
async function createVercelSandboxInternal(
    projectId: string,
    userId: string,
    orgId: string,
    files?: Record<string, string>,
    credentials?: { 
        connected?: boolean;
        hasSandboxToken?: boolean;
        teamId?: string; 
        projectId?: string; 
        token?: string; 
        vercelUserId?: string; 
        integrationId?: unknown 
    },
    settings?: Awaited<ReturnType<typeof getSandboxSettings>>
) {
    if (!credentials || !credentials.connected) {
        return NextResponse.json(
            { 
                error: "Vercel connection required. Please connect your Vercel account.",
                code: "VERCEL_NOT_CONNECTED"
            },
            { status: 400 }
        );
    }

    // Check if user has sandbox token
    if (!credentials.hasSandboxToken || !credentials.token) {
        return NextResponse.json(
            { 
                error: "Vercel Sandbox token required. Please add your Vercel access token in Settings.",
                code: "VERCEL_SANDBOX_TOKEN_REQUIRED"
            },
            { status: 400 }
        );
    }

    if (!settings) {
        settings = await getSandboxSettings(orgId);
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Ensure we have a Vercel project for sandboxes
    let vercelProjectId = credentials.projectId;
    if (!vercelProjectId) {
        console.log("No Vercel project ID found, creating one...");
        vercelProjectId = await ensureVercelSandboxProject(
            credentials.token,
            credentials.teamId,
            credentials.integrationId?.toString()
        );
    }

    const timeoutMs = settings.vercelSandboxTimeout * 60 * 1000;

    // Check if existing Vercel sandbox for this project
    const existingProjectSandbox = await getProjectSandbox(projectId);
    if (existingProjectSandbox && existingProjectSandbox.provider === "vercel") {
        try {
            const sandbox = await VercelSandbox.get({
                sandboxId: existingProjectSandbox.sandboxId,
                teamId: credentials.teamId,
                projectId: vercelProjectId,
                token: credentials.token,
            });

            // If files were passed, sync them
            if (files && Object.keys(files).length > 0) {
                const apiKey = (project as any).apiKey || '';
                const processedFiles = injectCredentials(files, apiKey, JERSEN_API_URL);

                for (const [path, content] of Object.entries(processedFiles)) {
                    await sandbox.writeFiles([
                        { path, content: Buffer.from(content) }
                    ]);
                }
            }

            const url = sandbox.domain(3000);
            return NextResponse.json({
                sandboxId: sandbox.sandboxId,
                url,
                status: "existing",
                provider: "vercel",
            });
        } catch {
            // Sandbox expired, remove from DB
            await unregisterSandbox(projectId);
        }
    }

    // Kill any existing Vercel sandbox from other projects in this org (one at a time)
    const orgSandboxes = await getOrgActiveSandboxes(orgId);
    const existingVercelSandbox = orgSandboxes.find(s => s.provider === "vercel" && s.projectId !== projectId);
    
    if (existingVercelSandbox) {
        console.log(`Killing existing Vercel sandbox for project ${existingVercelSandbox.projectId} to make room for ${projectId}`);
        try {
            const oldSandbox = await VercelSandbox.get({
                sandboxId: existingVercelSandbox.sandboxId,
                teamId: credentials.teamId,
                projectId: vercelProjectId,
                token: credentials.token,
            });
            await oldSandbox.stop();
        } catch (error) {
            console.error("Failed to stop old Vercel sandbox:", error);
        }
        await unregisterSandbox(existingVercelSandbox.projectId);
    }

    console.log(`Creating Vercel sandbox for project ${projectId} using Vercel project ${vercelProjectId}`);
    console.log(`Vercel credentials: teamId=${credentials.teamId}, projectId=${vercelProjectId}, tokenLength=${credentials.token?.length}`);

    // Create the sandbox with the Vercel project ID
    try {
        const sandbox = await VercelSandbox.create({
            teamId: credentials.teamId,
            projectId: vercelProjectId,
            token: credentials.token,
            timeout: timeoutMs,
            ports: [3000],
            runtime: "node22",
        });

        console.log(`Created Vercel sandbox ${sandbox.sandboxId}`);

        // Write files to sandbox
        const apiKey = (project as any).apiKey || '';
        const processedFiles = injectCredentials(files || {}, apiKey, JERSEN_API_URL);

        if (Object.keys(processedFiles).length > 0) {
            console.log(`Writing ${Object.keys(processedFiles).length} files to Vercel sandbox...`);
            
            const fileBuffers = Object.entries(processedFiles).map(([path, content]) => ({
                path,
                content: Buffer.from(content),
            }));
            
            await sandbox.writeFiles(fileBuffers);
        }

        // Install dependencies
        console.log("Installing dependencies in Vercel sandbox...");
        const install = await sandbox.runCommand({
            cmd: "npm",
            args: ["install", "--force"],
        });

        if (install.exitCode !== 0) {
            console.error("npm install failed in Vercel sandbox");
        }

        // Start dev server
        console.log("Starting dev server in Vercel sandbox...");
        await sandbox.runCommand({
            cmd: "npm",
            args: ["run", "dev"],
            detached: true,
        });

        // Wait for server to start
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const url = sandbox.domain(3000);

        // Register sandbox in database
        await registerSandbox(
            orgId,
            projectId,
            sandbox.sandboxId,
            url,
            userId,
            settings.vercelSandboxTimeout,
            "vercel" // provider
        );

        // Save sandbox URL to project for CORS
        await Project.updateOne(
            { _id: projectId },
            {
                $set: { sandboxUrl: url },
                $addToSet: { allowedOrigins: url },
            }
        );

        console.log(`Vercel sandbox created: ${url}`);

        return NextResponse.json({
            sandboxId: sandbox.sandboxId,
            url,
            status: "created",
            provider: "vercel",
        });
    } catch (error: unknown) {
        console.error("Vercel Sandbox creation failed:", error);
        
        // Check for 403 error which means scope issue
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorText = (error as any)?.text || "";
        
        if (errorMessage.includes("403") || errorText.includes("forbidden") || errorText.includes("permission")) {
            return NextResponse.json(
                { 
                    error: "Vercel Sandbox permission denied. Your Vercel integration may not have the Sandbox scope enabled. Please reconnect your Vercel account or contact support.",
                    code: "VERCEL_SANDBOX_FORBIDDEN"
                },
                { status: 403 }
            );
        }
        
        throw error; // Re-throw for general error handling
    }
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
    userId: string,
    orgId: string | null,
    files?: Record<string, string>,
    requestedProvider?: string
) {
    const existing = await getProjectSandbox(projectId);

    if (!existing) {
        return NextResponse.json(
            { error: "Sandbox not found or expired. Please create a new one." },
            { status: 404 }
        );
    }

    const provider = existing.provider || "e2b";

    if (provider === "vercel") {
        return await updateVercelSandboxInternal(projectId, userId, orgId, existing, files);
    }

    // E2B sandbox update
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
            provider: "e2b",
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

async function updateVercelSandboxInternal(
    projectId: string,
    userId: string,
    orgId: string | null,
    existing: { sandboxId: string },
    files?: Record<string, string>
) {
    const credentials = await getVercelCredentials(userId, orgId);
    if (!credentials) {
        return NextResponse.json(
            { error: "Vercel connection required" },
            { status: 400 }
        );
    }

    // Ensure we have a Vercel project ID
    let vercelProjectId = credentials.projectId;
    if (!vercelProjectId) {
        vercelProjectId = await ensureVercelSandboxProject(
            credentials.token,
            credentials.teamId,
            credentials.integrationId?.toString()
        );
    }

    try {
        const sandbox = await VercelSandbox.get({
            sandboxId: existing.sandboxId,
            teamId: credentials.teamId,
            projectId: vercelProjectId,
            token: credentials.token,
        });

        const project = await Project.findById(projectId);
        const apiKey = (project as any)?.apiKey || '';
        const processedFiles = files ? injectCredentials(files, apiKey, JERSEN_API_URL) : {};

        if (Object.keys(processedFiles).length > 0) {
            const fileBuffers = Object.entries(processedFiles).map(([path, content]) => ({
                path,
                content: Buffer.from(content),
            }));
            await sandbox.writeFiles(fileBuffers);
        }

        const url = sandbox.domain(3000);

        return NextResponse.json({
            sandboxId: sandbox.sandboxId,
            url,
            status: "updated",
            provider: "vercel",
        });
    } catch (error) {
        console.error("Failed to update Vercel sandbox:", error);
        await unregisterSandbox(projectId);
        return NextResponse.json(
            { error: "Vercel sandbox connection failed. Please create a new one." },
            { status: 404 }
        );
    }
}

async function destroySandbox(
    projectId: string,
    userId: string,
    orgId: string | null,
    requestedProvider?: string
) {
    const existing = await getProjectSandbox(projectId);

    if (!existing) {
        return NextResponse.json({ status: "not-found" });
    }

    const provider = existing.provider || "e2b";

    try {
        if (provider === "vercel") {
            const credentials = await getVercelCredentials(userId, orgId);
            if (credentials) {
                // Ensure we have a Vercel project ID
                let vercelProjectId = credentials.projectId;
                if (!vercelProjectId) {
                    vercelProjectId = await ensureVercelSandboxProject(
                        credentials.token,
                        credentials.teamId,
                        credentials.integrationId?.toString()
                    );
                }

                const sandbox = await VercelSandbox.get({
                    sandboxId: existing.sandboxId,
                    teamId: credentials.teamId,
                    projectId: vercelProjectId,
                    token: credentials.token,
                });
                await sandbox.stop();
            }
        } else {
            await killSandboxById(existing.sandboxId);
        }
    } catch (error) {
        console.error(`Failed to destroy ${provider} sandbox:`, error);
    }

    await unregisterSandbox(projectId);
    console.log(`Destroyed ${provider} sandbox for project ${projectId}`);

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

    const provider = (existing as any).provider || "e2b";

    try {
        if (provider === "vercel") {
            // Vercel sandbox - the URL is stored directly in the database
            // No need to "connect" - just return the stored URL
            return NextResponse.json({
                sandboxId: existing.sandboxId,
                url: existing.url,
                expiresAt: existing.expiresAt.getTime(),
                provider: "vercel",
            });
        }

        // E2B sandbox - connect to get the URL
        const sandbox = await Sandbox.connect(existing.sandboxId);
        const url = `https://${sandbox.getHost(3000)}`;

        return NextResponse.json({
            sandboxId: existing.sandboxId,
            url,
            expiresAt: existing.expiresAt.getTime(),
            provider: "e2b",
        });
    } catch {
        await unregisterSandbox(projectId);
        return NextResponse.json(
            { error: "Sandbox not found or expired" },
            { status: 404 }
        );
    }
}
