"use client";

import { SignIn, useAuth } from "@clerk/nextjs";

interface OAuthSignInProps {
    afterSignInUrl: string;
}

export function OAuthSignIn({ afterSignInUrl }: OAuthSignInProps) {
    const { isSignedIn, isLoaded } = useAuth();

    // Show loading while checking auth state
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    // If signed in, the server-side redirect should have already happened
    // Just show a redirecting message in case there's a delay
    if (isSignedIn) {
        return (
            <div className="flex flex-col items-center justify-center p-8 gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                <p className="text-gray-600">Redirecting...</p>
            </div>
        );
    }

    return (
        <SignIn
            afterSignInUrl={afterSignInUrl}
            appearance={{
                elements: {
                    rootBox: "mx-auto",
                    card: "shadow-xl",
                    formButtonPrimary: "bg-violet-600 hover:bg-violet-700",
                },
            }}
        />
    );
}
