import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";
import Project from "@/models/Project";
import { Sandbox } from "@e2b/code-interpreter";

// Allow up to 5 minutes for build check + deployment
export const maxDuration = 300;

const TEMPLATE_ID = "nextjs-developer-song-dev";

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
        // Run build check in sandbox (unless skipped)
        if (!skipBuildCheck) {
            const buildResult = await runBuildCheck(project.files);
            if (!buildResult.success) {
                return NextResponse.json(
                    {
                        error: "Build failed",
                        code: "BUILD_ERROR",
                        buildErrors: buildResult.errors,
                        buildOutput: buildResult.output,
                    },
                    { status: 400 }
                );
            }
        }

        // Prepare files for Vercel deployment
        // Vercel expects files as an array of { file: string, data: string }
        const files = project.files.map((file: { path: string; content: string }) => ({
            file: file.path.startsWith("/") ? file.path.slice(1) : file.path,
            data: file.content,
        }));

        // Ensure essential files exist
        const hasPackageJson = files.some((f: { file: string }) => f.file === "package.json");
        if (!hasPackageJson) {
            // Add default package.json if missing
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
                installCommand: "npm install",
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

        return NextResponse.json({
            success: true,
            deployment: {
                id: deployment.id,
                url: `https://${deployment.url}`,
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

// Run build check in E2B sandbox
async function runBuildCheck(
    files: Array<{ path: string; content: string }>
): Promise<{ success: boolean; errors?: string[]; output?: string }> {
    let sandbox: Sandbox | null = null;

    try {
        // Create temporary sandbox for build check
        sandbox = await Sandbox.create(TEMPLATE_ID, {
            timeoutMs: 120000, // 2 minutes
        });

        // Write project files
        const fileWrites = files.map((file) => ({
            path: `/home/user/${file.path.startsWith("/") ? file.path.slice(1) : file.path}`,
            data: file.content,
        }));
        await sandbox.files.write(fileWrites);

        // Install dependencies
        console.log("Installing dependencies for build check...");
        const installResult = await sandbox.commands.run(
            "cd /home/user && bun install",
            { timeoutMs: 60000 }
        );

        if (installResult.exitCode !== 0) {
            return {
                success: false,
                errors: ["Failed to install dependencies"],
                output: installResult.stderr || installResult.stdout,
            };
        }

        // Run build
        console.log("Running build check...");
        const buildResult = await sandbox.commands.run(
            "cd /home/user && bun run build",
            { timeoutMs: 90000 }
        );

        if (buildResult.exitCode !== 0) {
            // Parse build errors
            const output = buildResult.stderr || buildResult.stdout || "";
            const errors = parseBuildErrors(output);

            return {
                success: false,
                errors: errors.length > 0 ? errors : ["Build failed with unknown error"],
                output,
            };
        }

        console.log("Build check passed!");
        return { success: true };
    } catch (error) {
        console.error("Build check error:", error);
        return {
            success: false,
            errors: [error instanceof Error ? error.message : "Build check failed"],
        };
    } finally {
        // Always clean up sandbox
        if (sandbox) {
            try {
                await sandbox.kill();
            } catch (e) {
                console.error("Failed to kill build check sandbox:", e);
            }
        }
    }
}

// Parse build errors from output
function parseBuildErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
        // Look for TypeScript errors
        if (line.includes("error TS") || line.includes("Error:")) {
            errors.push(line.trim());
        }
        // Look for Next.js build errors
        if (line.includes("Failed to compile") || line.includes("Build error")) {
            errors.push(line.trim());
        }
        // Look for module not found
        if (line.includes("Module not found") || line.includes("Cannot find module")) {
            errors.push(line.trim());
        }
    }

    // Limit to first 10 errors
    return errors.slice(0, 10);
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
