import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import VercelIntegration from "@/models/VercelIntegration";
import Project from "@/models/Project";

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
    const { projectId, projectName } = body;

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
        // Convert project files to Vercel format
        // Vercel expects files as an array of { file: string, data: string | Buffer }
        const files = project.files.map((file: { path: string; content: string }) => ({
            file: file.path.startsWith("/") ? file.path.slice(1) : file.path,
            data: file.content,
        }));

        // Create deployment
        const deploymentName = projectName || project.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

        const deployPayload: any = {
            name: deploymentName,
            files,
            projectSettings: {
                framework: detectFramework(project.files),
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
