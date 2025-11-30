import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that should be public (no Clerk auth required)
const isPublicRoute = createRouteMatcher([
  '/api/providers/(.*)',  // Provider APIs use API key auth, not Clerk
  '/auth/oauth(.*)',      // OAuth flow pages
]);

export default clerkMiddleware(async (auth, request) => {
  // Skip Clerk for provider routes - they use API key authentication
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
