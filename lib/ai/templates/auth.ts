/**
 * Auth Templates
 * 
 * Pre-built templates for authentication and authorization patterns.
 */

import { Template } from './types';

export const protectedPageTemplate: Template = {
  id: 'protected-page',
  name: 'Protected Page',
  description: 'A page that requires authentication to access',
  category: 'auth',
  variables: [
    {
      name: 'pageName',
      description: 'Name of the page (e.g., "Profile", "Settings")',
      required: true,
      type: 'string'
    },
    {
      name: 'pagePath',
      description: 'Path for the page (e.g., "profile", "settings")',
      required: true,
      type: 'string'
    }
  ],
  files: [
    {
      path: 'app/dashboard/{{pagePath}}/page.tsx',
      description: 'Protected page with auth check',
      content: `import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { {{PageName}}Content } from '@/components/{{pagePath}}/{{PageName}}Content';

export default async function {{PageName}}Page() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/dashboard/{{pagePath}}');
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{{PageName}}</h1>
      <{{PageName}}Content user={session.user} />
    </div>
  );
}`
    },
    {
      path: 'components/{{pagePath}}/{{PageName}}Content.tsx',
      description: 'Content component with user context',
      content: `'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface {{PageName}}ContentProps {
  user: User;
}

export function {{PageName}}Content({ user }: {{PageName}}ContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {user.name || user.email}</CardTitle>
        <CardDescription>
          Manage your {{pagePath}} settings here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add your protected content here */}
        <p className="text-muted-foreground">
          This content is only visible to authenticated users.
        </p>
      </CardContent>
    </Card>
  );
}`
    }
  ]
};

export const roleProtectedPageTemplate: Template = {
  id: 'role-protected-page',
  name: 'Role-Protected Page',
  description: 'A page that requires specific roles to access',
  category: 'auth',
  variables: [
    {
      name: 'pageName',
      description: 'Name of the page',
      required: true,
      type: 'string'
    },
    {
      name: 'pagePath',
      description: 'Path for the page',
      required: true,
      type: 'string'
    },
    {
      name: 'requiredRole',
      description: 'Role required to access (e.g., "admin", "editor")',
      required: true,
      type: 'string'
    }
  ],
  files: [
    {
      path: 'app/{{pagePath}}/page.tsx',
      description: 'Role-protected page with role check',
      content: `import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { checkUserRole } from '@/lib/auth/roles';

export default async function {{PageName}}Page() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/{{pagePath}}');
  }
  
  const hasAccess = await checkUserRole(session.user.id, '{{requiredRole}}');
  
  if (!hasAccess) {
    redirect('/unauthorized');
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{{PageName}}</h1>
      <p className="text-muted-foreground">
        This page is only accessible to users with the {{requiredRole}} role.
      </p>
      {/* Add your role-protected content here */}
    </div>
  );
}`
    },
    {
      path: 'lib/auth/roles.ts',
      description: 'Role checking utility',
      content: `import { db } from '@/lib/db';

export type Role = 'user' | 'editor' | 'admin' | 'super_admin';

export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

export async function checkUserRole(
  userId: string,
  requiredRole: Role
): Promise<boolean> {
  try {
    // TODO: Fetch user's role from database
    const userRole = 'user' as Role; // Replace with actual query
    
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

export async function getUserRole(userId: string): Promise<Role | null> {
  try {
    // TODO: Fetch from database
    return 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export async function setUserRole(
  userId: string,
  role: Role
): Promise<boolean> {
  try {
    // TODO: Update in database
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
}`
    },
    {
      path: 'app/unauthorized/page.tsx',
      description: 'Unauthorized access page',
      content: `import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-destructive" />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page. 
          Please contact an administrator if you believe this is an error.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}`
    }
  ]
};

export const authMiddlewareTemplate: Template = {
  id: 'auth-middleware',
  name: 'Auth Middleware Pattern',
  description: 'Middleware-based authentication with route protection',
  category: 'auth',
  variables: [
    {
      name: 'protectedPaths',
      description: 'Paths to protect (comma-separated)',
      required: true,
      type: 'array'
    },
    {
      name: 'loginPath',
      description: 'Path to login page',
      required: false,
      type: 'string',
      defaultValue: '/auth/login'
    }
  ],
  files: [
    {
      path: 'middleware.ts',
      description: 'Next.js middleware for route protection',
      content: `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected and public paths
const protectedPaths = [
  '/dashboard',
  '/admin',
  '/settings',
  // Add more protected paths
];

const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/api/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is protected
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );
  
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  );
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }
  
  // Get authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check for admin routes
  if (pathname.startsWith('/admin') && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};`
    }
  ],
  dependencies: ['next-auth']
};

export const authTemplates = [
  protectedPageTemplate,
  roleProtectedPageTemplate,
  authMiddlewareTemplate
];
