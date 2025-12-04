import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";
import Project from "@/models/Project";

// Allow up to 5 minutes for deployment
export const maxDuration = 300;

// Get the Jersen API URL for production deployments
function getJersenApiUrl(): string {
    // For production deployments, always use the public URL
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://www.jersen.app';
}

/**
 * Replace placeholders in file contents with actual credentials
 * Same as sandbox/route.ts but for Vercel deployments
 */
function injectCredentials(
    files: Array<{ file: string; data: string }>,
    apiKey: string,
    jersenUrl: string
): Array<{ file: string; data: string }> {
    const cleanUrl = jersenUrl.replace(/\/$/, '');
    
    return files.map(({ file, data }) => ({
        file,
        data: data
            .replace(/__JERSEN_API_KEY__/g, apiKey)
            .replace(/__JERSEN_URL__/g, cleanUrl),
    }));
}

// Check Vercel connection status
export async function GET(request: NextRequest) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const integration = await VercelIntegration.findOne({
        userId,
        orgId: orgId || null,
    });

    if (!integration) {
        return NextResponse.json({ connected: false });
    }

    // Verify token is still valid by making a simple API call
    try {
        const response = await fetch("https://api.vercel.com/v2/user", {
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
            },
        });

        if (!response.ok) {
            // Token is invalid, remove integration
            await VercelIntegration.deleteOne({ _id: integration._id });
            return NextResponse.json({ connected: false });
        }

        const userData = await response.json();

        return NextResponse.json({
            connected: true,
            user: {
                username: userData.user?.username,
                email: userData.user?.email,
                name: userData.user?.name,
            },
            team: integration.vercelTeamSlug
                ? {
                      id: integration.vercelTeamId,
                      slug: integration.vercelTeamSlug,
                  }
                : null,
            connectedAt: integration.connectedAt,
        });
    } catch (error) {
        console.error("Error checking Vercel status:", error);
        return NextResponse.json({ connected: false, error: "Failed to verify" });
    }
}

// Deploy a project to Vercel
export async function POST(request: NextRequest) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, projectName, skipBuildCheck } = body;

    if (!projectId) {
        return NextResponse.json(
            { error: "Project ID is required" },
            { status: 400 }
        );
    }

    await connectToDatabase();

    // Get Vercel integration
    const integration = await VercelIntegration.findOne({
        userId,
        orgId: orgId || null,
    });

    if (!integration) {
        return NextResponse.json(
            { error: "Vercel not connected", code: "NOT_CONNECTED" },
            { status: 400 }
        );
    }

    // Get project files
    const project = await Project.findById(projectId);

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.orgId !== orgId && project.userId !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!project.files || project.files.length === 0) {
        return NextResponse.json(
            { error: "Project has no files to deploy" },
            { status: 400 }
        );
    }

    try {
        // Skip build check - let Vercel handle the build
        // Vercel will show build errors in the deployment logs
        // Previously we ran build check in E2B sandbox but it often timed out

        // Get project API key and Jersen URL for credential injection
        const apiKey = project.apiKey || '';
        const jersenUrl = getJersenApiUrl();
        console.log(`Deploying with Jersen URL: ${jersenUrl}`);

        // Prepare files for Vercel deployment
        // Vercel expects files as an array of { file: string, data: string }
        let files = project.files.map((file: { path: string; content: string }) => ({
            file: file.path.startsWith("/") ? file.path.slice(1) : file.path,
            data: file.content,
        }));

        // Replace placeholders with actual credentials (same as sandbox)
        files = injectCredentials(files, apiKey, jersenUrl);

        // Get stored project dependencies (e.g., mongodb, framer-motion, zustand)
        const projectDeps: string[] = (project as any).dependencies || [];
        console.log(`Project dependencies to inject: [${projectDeps.join(', ')}]`);

        // Convert dependencies array to object format for package.json
        // e.g., ["mongodb", "framer-motion@^10.0.0"] -> { mongodb: "latest", "framer-motion": "^10.0.0" }
        const additionalDeps: Record<string, string> = {};
        for (const dep of projectDeps) {
            if (dep.includes('@') && !dep.startsWith('@')) {
                // Has version specified like "framer-motion@^10.0.0"
                const [name, version] = dep.split('@');
                additionalDeps[name] = version;
            } else if (dep.startsWith('@')) {
                // Scoped package like "@clerk/nextjs" or "@clerk/nextjs@^5.0.0"
                const parts = dep.split('@').filter(Boolean);
                if (parts.length >= 2 && parts[1].includes('.')) {
                    // Has version: @clerk/nextjs@^5.0.0
                    additionalDeps['@' + parts[0]] = parts[1];
                } else {
                    // No version: @clerk/nextjs
                    additionalDeps['@' + parts[0]] = 'latest';
                }
            } else {
                additionalDeps[dep] = 'latest';
            }
        }

        // Ensure essential files exist and inject dependencies
        const packageJsonIndex = files.findIndex((f: { file: string }) => f.file === "package.json");
        
        if (packageJsonIndex !== -1) {
            // Parse existing package.json and merge dependencies
            try {
                const existingPkg = JSON.parse(files[packageJsonIndex].data);
                existingPkg.dependencies = {
                    ...existingPkg.dependencies,
                    ...additionalDeps,
                };
                files[packageJsonIndex].data = JSON.stringify(existingPkg, null, 2);
                console.log(`Merged ${Object.keys(additionalDeps).length} dependencies into existing package.json`);
            } catch (e) {
                console.error('Failed to parse existing package.json:', e);
            }
        } else {
            // Add default package.json with injected dependencies
            files.push({
                file: "package.json",
                data: JSON.stringify(
                    {
                        name: projectName || project.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                        version: "0.1.0",
                        private: true,
                        scripts: {
                            dev: "next dev",
                            build: "next build",
                            start: "next start",
                            lint: "next lint",
                        },
                        dependencies: {
                            next: "15.0.3",
                            react: "^19.0.0",
                            "react-dom": "^19.0.0",
                            ...additionalDeps,
                        },
                        devDependencies: {
                            typescript: "^5",
                            "@types/node": "^20",
                            "@types/react": "^19",
                            "@types/react-dom": "^19",
                        },
                    },
                    null,
                    2
                ),
            });
            console.log(`Created default package.json with ${Object.keys(additionalDeps).length} additional dependencies`);
        }

        // Add next.config if missing
        const hasNextConfig = files.some((f: { file: string }) => 
            f.file === "next.config.js" || 
            f.file === "next.config.mjs" || 
            f.file === "next.config.ts"
        );
        if (!hasNextConfig) {
            files.push({
                file: "next.config.ts",
                data: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
`,
            });
        }

        // Add tsconfig if missing
        const hasTsConfig = files.some((f: { file: string }) => f.file === "tsconfig.json");
        if (!hasTsConfig) {
            files.push({
                file: "tsconfig.json",
                data: JSON.stringify(
                    {
                        compilerOptions: {
                            lib: ["dom", "dom.iterable", "esnext"],
                            allowJs: true,
                            skipLibCheck: true,
                            strict: true,
                            noEmit: true,
                            esModuleInterop: true,
                            module: "esnext",
                            moduleResolution: "bundler",
                            resolveJsonModule: true,
                            isolatedModules: true,
                            jsx: "preserve",
                            incremental: true,
                            plugins: [{ name: "next" }],
                            paths: { "@/*": ["./*"] },
                        },
                        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
                        exclude: ["node_modules"],
                    },
                    null,
                    2
                ),
            });
        }

        // Create deployment
        const deploymentName = projectName || project.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

        const deployPayload: Record<string, unknown> = {
            name: deploymentName,
            files,
            projectSettings: {
                framework: detectFramework(project.files),
                installCommand: "npm install --force",
                buildCommand: "npm run build",
                outputDirectory: ".next",
            },
        };

        // Add team if available
        const teamId = integration.vercelTeamId;

        const deployUrl = teamId
            ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
            : "https://api.vercel.com/v13/deployments";

        const deployResponse = await fetch(deployUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(deployPayload),
        });

        if (!deployResponse.ok) {
            const errorData = await deployResponse.json();
            console.error("Vercel deployment error:", errorData);
            return NextResponse.json(
                {
                    error: "Deployment failed",
                    details: errorData.error?.message || "Unknown error",
                },
                { status: 400 }
            );
        }

        const deployment = await deployResponse.json();
        
        // Add the deployed URL to the project's allowedOrigins for CORS
        const deployedUrl = `https://${deployment.url}`;
        await Project.updateOne(
            { _id: projectId },
            { $addToSet: { allowedOrigins: deployedUrl } }
        );
        console.log(`Added deployed URL to allowedOrigins: ${deployedUrl}`);

        return NextResponse.json({
            success: true,
            deployment: {
                id: deployment.id,
                url: deployedUrl,
                inspectorUrl: deployment.inspectorUrl,
                state: deployment.readyState,
                createdAt: deployment.createdAt,
            },
        });
    } catch (error) {
        console.error("Deployment error:", error);
        return NextResponse.json(
            { error: "Failed to deploy to Vercel" },
            { status: 500 }
        );
    }
}

// Disconnect Vercel integration
export async function DELETE(request: NextRequest) {
    const { userId, orgId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    await VercelIntegration.deleteOne({
        userId,
        orgId: orgId || null,
    });

    return NextResponse.json({ success: true });
}

// Helper to detect framework from project files
function detectFramework(files: Array<{ path: string; content: string }>): string | null {
    const filePaths = files.map((f) => f.path.toLowerCase());
    const packageJsonFile = files.find((f) => f.path === "package.json" || f.path === "/package.json");

    if (packageJsonFile) {
        try {
            const pkg = JSON.parse(packageJsonFile.content);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            if (deps["next"]) return "nextjs";
            if (deps["nuxt"]) return "nuxtjs";
            if (deps["@sveltejs/kit"]) return "sveltekit";
            if (deps["svelte"]) return "svelte";
            if (deps["vue"]) return "vue";
            if (deps["@angular/core"]) return "angular";
            if (deps["gatsby"]) return "gatsby";
            if (deps["astro"]) return "astro";
            if (deps["remix"]) return "remix";
            if (deps["vite"] || deps["@vitejs/plugin-react"]) return "vite";
            if (deps["react"]) return "create-react-app";
        } catch (e) {
            // Failed to parse package.json
        }
    }

    // Check for static HTML
    if (filePaths.some((p) => p.endsWith("index.html"))) {
        return null; // Static site
    }

    return null;
}
