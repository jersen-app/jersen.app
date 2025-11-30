import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { ProjectUserModel } from "@/models/ProjectUser";
import { createSecureToken } from "@/lib/crypto";

interface PageProps {
    searchParams: Promise<{
        api_key?: string;
        redirect_uri?: string;
    }>;
}

export default async function OAuthCallbackPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const { api_key, redirect_uri } = params;

    if (!api_key || !redirect_uri) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Invalid Request</h1>
                    <p className="text-gray-600">
                        Missing required parameters.
                    </p>
                </div>
            </div>
        );
    }

    // Verify user is authenticated with Clerk
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        // Redirect back to OAuth page to sign in
        const oauthUrl = new URL("/auth/oauth", process.env.NEXT_PUBLIC_APP_URL);
        oauthUrl.searchParams.set("api_key", api_key);
        oauthUrl.searchParams.set("redirect_uri", redirect_uri);
        redirect(oauthUrl.toString());
    }

    // Validate API key and get project
    await connectToDatabase();
    const project = await Project.findOne({ apiKey: api_key });

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Invalid API Key</h1>
                    <p className="text-gray-600">
                        The provided API key is not valid.
                    </p>
                </div>
            </div>
        );
    }

    // Get user info from Clerk
    const email = user.emailAddresses[0]?.emailAddress;
    const name = user.firstName 
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user.username || email?.split("@")[0] || "User";
    const avatarUrl = user.imageUrl;

    // Get OAuth provider info
    const oauthProvider = user.externalAccounts?.[0]?.provider || "oauth";
    const oauthId = user.externalAccounts?.[0]?.externalId || userId;

    // Find or create ProjectUser
    let projectUser = await ProjectUserModel.findOne({
        projectId: project._id,
        $or: [
            { clerkUserId: userId },
            { email: email }
        ]
    });

    if (!projectUser) {
        // Create new ProjectUser
        projectUser = await ProjectUserModel.create({
            projectId: project._id,
            clerkUserId: userId,
            email,
            name,
            avatarUrl,
            provider: oauthProvider,
            providerId: oauthId,
            metadata: {
                lastLogin: new Date(),
                loginCount: 1
            }
        });
    } else {
        // Update existing user
        projectUser.lastLoginAt = new Date();
        projectUser.name = name;
        projectUser.avatarUrl = avatarUrl;
        if (projectUser.metadata) {
            projectUser.metadata.loginCount = (projectUser.metadata.loginCount || 0) + 1;
            projectUser.metadata.lastLogin = new Date();
        }
        await projectUser.save();
    }

    // Create a session token for the project
    const sessionData = {
        userId: projectUser._id.toString(),
        projectId: project._id.toString(),
        email,
        name,
        avatarUrl,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    const sessionToken = await createSecureToken(JSON.stringify(sessionData));

    // Redirect back to user's app with token
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("session_token", sessionToken);
    redirectUrl.searchParams.set("user_id", projectUser._id.toString());

    redirect(redirectUrl.toString());
}
