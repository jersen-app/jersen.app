import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import { OAuthSignIn } from "./OAuthSignIn";

interface PageProps {
    searchParams: Promise<{
        api_key?: string;
        redirect_uri?: string;
        provider?: string;
    }>;
}

export default async function OAuthLoginPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const { api_key, redirect_uri } = params;

    // Validate required params
    if (!api_key || !redirect_uri) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Invalid Request</h1>
                    <p className="text-gray-600">
                        Missing required parameters: api_key and redirect_uri are required.
                    </p>
                </div>
            </div>
        );
    }

    // Validate API key
    await connectToDatabase();
    const project = await Project.findOne({ apiKey: api_key }).lean();

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

    if (!project.providers?.auth?.enabled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Auth Not Enabled</h1>
                    <p className="text-gray-600">
                        Authentication is not enabled for this project.
                    </p>
                </div>
            </div>
        );
    }

    // Check if user is already signed in with Clerk
    const { userId } = await auth();
    
    if (userId) {
        // User is signed in, redirect to callback to create session
        const callbackUrl = new URL("/auth/oauth/callback", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
        callbackUrl.searchParams.set("api_key", api_key);
        callbackUrl.searchParams.set("redirect_uri", redirect_uri);
        redirect(callbackUrl.toString());
    }

    // Build the callback URL for after Clerk sign-in
    const afterSignInUrl = new URL("/auth/oauth/callback", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    afterSignInUrl.searchParams.set("api_key", api_key);
    afterSignInUrl.searchParams.set("redirect_uri", redirect_uri);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Sign in to {(project as any).name}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Powered by Jersen
                    </p>
                </div>
                
                <OAuthSignIn afterSignInUrl={afterSignInUrl.toString()} />
            </div>
        </div>
    );
}
