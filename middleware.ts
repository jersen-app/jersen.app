import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that should be public (no Clerk auth required)
const isPublicRoute = createRouteMatcher([
  '/api/providers/(.*)',  // Provider APIs use API key auth, not Clerk
  '/auth/oauth(.*)',      // OAuth flow pages
  '/waitlist',            // Waitlist page
  '/api/user/status',     // User status check API
  '/',                    // Landing page
  '/(marketing)(.*)',     // Marketing pages
]);

// Routes that should skip waitlist check (admin routes, etc.)
const skipWaitlistCheck = createRouteMatcher([
  '/admin(.*)',           // Admin pages (have their own auth)
  '/api/admin/(.*)',      // Admin APIs
  '/waitlist',            // Waitlist page itself
  '/api/user/status',     // Status check API
]);

export default clerkMiddleware(async (auth, request) => {
  // Skip Clerk for provider routes - they use API key authentication
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  
  // For dashboard and other protected routes, check if user is on waitlist
  const { userId } = await auth();
  
  // If user is authenticated and accessing dashboard routes
  if (userId && !skipWaitlistCheck(request)) {
    const pathname = request.nextUrl.pathname;
    
    // Only check waitlist for dashboard routes
    if (pathname.startsWith('/dashboard')) {
      // We'll do the actual waitlist check in the dashboard layout
      // to avoid database calls in middleware
      // The middleware just ensures auth is present
    }
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
