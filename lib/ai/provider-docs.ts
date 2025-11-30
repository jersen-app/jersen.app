/**
 * Provider Documentation for AI Code Generation
 * 
 * These docs are injected into the AI context ONLY when needed,
 * triggered by the getProviderDocs tool or detected context.
 */

export interface ProjectConfig {
    projectId: string;
    apiKey: string;
    providers: {
        auth: { enabled: boolean };
        storage: { enabled: boolean; quota?: number };
        database: {
            enabled: boolean;
            dbName?: string;
            connectionString?: string;
        };
    };
}

/**
 * Authentication Provider Documentation
 */
export function getAuthDocs(config: ProjectConfig): string {
    if (!config.providers.auth.enabled) {
        return `## Authentication Provider
⚠️ Authentication is NOT enabled for this project. Enable it in project settings first.`;
    }

    return `## Jersen Authentication Provider

This project uses Clerk for user authentication, powered by the Jersen platform.

### Environment Setup
The \`.env.local\` file is automatically created when you preview. It contains:
\`\`\`
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<auto-configured>
\`\`\`

### CRITICAL: Setup app/layout.tsx with ClerkProvider
**You MUST wrap your app with ClerkProvider in layout.tsx. Without this, Clerk hooks will throw errors!**

\`\`\`tsx
// filepath: app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Your App Name',
  description: 'Your app description',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
\`\`\`

### Pre-built Auth Components
Clerk provides beautiful, customizable pre-built components:

#### Sign In Page
\`\`\`tsx
// filepath: app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn />
    </div>
  );
}
\`\`\`

#### Sign Up Page
\`\`\`tsx
// filepath: app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp />
    </div>
  );
}
\`\`\`

### User Button Component
The UserButton shows the user's avatar and provides a dropdown for account management:

\`\`\`tsx
"use client";
import { UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="flex justify-between items-center p-4">
      <h1>My App</h1>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
\`\`\`

### Using Clerk Hooks
Access user data and authentication state with hooks:

\`\`\`tsx
"use client";
import { useUser, useAuth, SignedIn, SignedOut } from '@clerk/nextjs';

export function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div>
      <SignedIn>
        <p>Welcome, {user?.firstName}!</p>
        <p>Email: {user?.emailAddresses[0]?.emailAddress}</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </SignedIn>
      
      <SignedOut>
        <p>Please sign in to continue.</p>
      </SignedOut>
    </div>
  );
}
\`\`\`

### Protecting Routes with Middleware
Create \`middleware.ts\` at the root of your project:

\`\`\`typescript
// filepath: middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
\`\`\`

### Server-Side Auth (API Routes)
Access the user in server components and API routes:

\`\`\`typescript
// filepath: app/api/user/route.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  
  return NextResponse.json({
    id: userId,
    email: user?.emailAddresses[0]?.emailAddress,
    firstName: user?.firstName,
    lastName: user?.lastName,
  });
}
\`\`\`

### Available Clerk Components
- \`<SignIn />\` - Full sign-in form with social logins
- \`<SignUp />\` - Full sign-up form
- \`<UserButton />\` - User avatar with dropdown menu
- \`<UserProfile />\` - Full user profile management
- \`<OrganizationSwitcher />\` - Switch between organizations
- \`<SignedIn>\` - Render children only when signed in
- \`<SignedOut>\` - Render children only when signed out

### Available Clerk Hooks
- \`useUser()\` - Get current user data
- \`useAuth()\` - Get auth state and methods (signOut, getToken)
- \`useClerk()\` - Access Clerk instance
- \`useSignIn()\` - Control sign-in flow programmatically
- \`useSignUp()\` - Control sign-up flow programmatically

### Customizing Appearance
You can customize Clerk components with the appearance prop:

\`\`\`tsx
<SignIn 
  appearance={{
    elements: {
      rootBox: "mx-auto",
      card: "bg-white shadow-xl",
      formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
    }
  }}
/>
\`\`\`
`;
}

/**
 * Storage Provider Documentation
 */
export function getStorageDocs(config: ProjectConfig): string {
    if (!config.providers.storage.enabled) {
        return `## Storage Provider
⚠️ Storage is NOT enabled for this project. Enable it in project settings first.`;
    }

    return `## Jersen Storage Provider

This project uses Jersen Storage (built on Cloudflare R2) for file storage.

**Quota:** ${config.providers.storage.quota || 1024}MB

### Environment Setup
The \`.env.local\` file is automatically created when you preview. It contains the API key and URL.

### Storage Client
Create \`lib/jersen-storage.ts\`:
\`\`\`typescript
const API_KEY = process.env.NEXT_PUBLIC_JERSEN_API_KEY!;
const API_URL = process.env.NEXT_PUBLIC_JERSEN_API_URL || 'https://api.jersen.app';

interface UploadResult {
  success: boolean;
  key?: string;
  size?: number;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  url?: string;
  expiresIn?: number;
  error?: string;
}

export async function uploadFile(file: File, key: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const res = await fetch(\`\${API_URL}/api/providers/storage\`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
    },
    body: formData,
  });
  return res.json();
}

export async function getFileUrl(key: string): Promise<DownloadResult> {
  const res = await fetch(\`\${API_URL}/api/providers/storage?key=\${encodeURIComponent(key)}\`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });
  return res.json();
}

export async function deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(\`\${API_URL}/api/providers/storage?key=\${encodeURIComponent(key)}\`, {
    method: 'DELETE',
    headers: {
      'x-api-key': API_KEY,
    },
  });
  return res.json();
}
\`\`\`

### React Upload Component
\`\`\`tsx
"use client";
import { useState } from 'react';
import { uploadFile, getFileUrl } from '@/lib/jersen-storage';

interface FileUploadProps {
  onUpload?: (key: string, url: string) => void;
  accept?: string;
}

export function FileUpload({ onUpload, accept = "image/*" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Generate unique key with timestamp
      const key = \`uploads/\${Date.now()}-\${file.name}\`;
      
      const uploadResult = await uploadFile(file, key);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Get signed URL for the uploaded file
      const urlResult = await getFileUrl(uploadResult.key!);
      if (urlResult.success && urlResult.url) {
        onUpload?.(uploadResult.key!, urlResult.url);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept={accept}
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
\`\`\`

### Image Display with Signed URLs
\`\`\`tsx
"use client";
import { useState, useEffect } from 'react';
import { getFileUrl } from '@/lib/jersen-storage';

export function StorageImage({ storageKey, alt, ...props }: { storageKey: string; alt: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getFileUrl(storageKey).then(result => {
      if (result.success && result.url) {
        setUrl(result.url);
      }
    });
  }, [storageKey]);

  if (!url) return <div className="animate-pulse bg-gray-200 w-full h-48" />;
  
  return <img src={url} alt={alt} {...props} />;
}
\`\`\`

### Best Practices
- Use meaningful key paths: \`users/{userId}/avatar.jpg\`, \`products/{productId}/images/main.jpg\`
- The signed URLs expire in 1 hour, fetch fresh URLs when needed
- Store the storage key in your database, not the URL
`;
}

/**
 * Database Provider Documentation
 */
export function getDatabaseDocs(config: ProjectConfig): string {
    if (!config.providers.database.enabled) {
        return `## Database Provider
⚠️ Database is NOT enabled for this project. Enable it in project settings first.`;
    }

    const dbInfo = config.providers.database.dbName 
        ? `**Database:** \`${config.providers.database.dbName}\``
        : `⚠️ Database not yet provisioned. Create a project to provision.`;

    return `## Jersen Database Provider

This project uses Jersen Database (MongoDB) for data storage.

${dbInfo}

### Environment Setup
The \`.env.local\` file is automatically created when you preview. It contains the API key and URL.

### Database Client
Create \`lib/jersen-db.ts\`:
\`\`\`typescript
const API_KEY = process.env.NEXT_PUBLIC_JERSEN_API_KEY!;
const API_URL = process.env.NEXT_PUBLIC_JERSEN_API_URL || 'https://api.jersen.app';

interface InsertResult {
  success: boolean;
  insertedId?: string;
  error?: string;
}

interface FindResult<T = any> {
  success: boolean;
  documents?: T[];
  count?: number;
  error?: string;
}

interface UpdateResult {
  success: boolean;
  matchedCount?: number;
  modifiedCount?: number;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

// Insert a document
export async function insertOne<T extends Record<string, any>>(
  collection: string, 
  document: T
): Promise<InsertResult> {
  const res = await fetch(\`\${API_URL}/api/providers/database\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ collection, document }),
  });
  return res.json();
}

// Find documents
export async function find<T = any>(
  collection: string, 
  query: Record<string, any> = {}, 
  limit = 100
): Promise<FindResult<T>> {
  const params = new URLSearchParams({
    collection,
    query: JSON.stringify(query),
    limit: String(limit),
  });
  
  const res = await fetch(\`\${API_URL}/api/providers/database?\${params}\`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });
  return res.json();
}

// Update documents
export async function updateMany(
  collection: string,
  query: Record<string, any>,
  update: Record<string, any>
): Promise<UpdateResult> {
  const res = await fetch(\`\${API_URL}/api/providers/database\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ collection, query, update }),
  });
  return res.json();
}

// Delete documents
export async function deleteMany(
  collection: string,
  query: Record<string, any>
): Promise<DeleteResult> {
  const params = new URLSearchParams({
    collection,
    query: JSON.stringify(query),
  });
  
  const res = await fetch(\`\${API_URL}/api/providers/database?\${params}\`, {
    method: 'DELETE',
    headers: {
      'x-api-key': API_KEY,
    },
  });
  return res.json();
}
\`\`\`

### React Hook for Data Fetching
\`\`\`tsx
"use client";
import { useState, useEffect, useCallback } from 'react';
import { find, insertOne, updateMany, deleteMany } from '@/lib/jersen-db';

export function useCollection<T = any>(collection: string, initialQuery: Record<string, any> = {}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (query = initialQuery) => {
    setLoading(true);
    try {
      const result = await find<T>(collection, query);
      if (result.success) {
        setData(result.documents || []);
      } else {
        setError(result.error || 'Failed to fetch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const insert = async (document: Omit<T, '_id'>) => {
    const result = await insertOne(collection, document);
    if (result.success) {
      await refetch();
    }
    return result;
  };

  const update = async (query: Record<string, any>, updates: Partial<T>) => {
    const result = await updateMany(collection, query, updates);
    if (result.success) {
      await refetch();
    }
    return result;
  };

  const remove = async (query: Record<string, any>) => {
    const result = await deleteMany(collection, query);
    if (result.success) {
      await refetch();
    }
    return result;
  };

  return { data, loading, error, refetch, insert, update, remove };
}
\`\`\`

### Usage Example - Todo App
\`\`\`tsx
"use client";
import { useCollection } from '@/hooks/useCollection';

interface Todo {
  _id?: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function TodosPage() {
  const { data: todos, loading, insert, update, remove } = useCollection<Todo>('todos');
  const [newTodo, setNewTodo] = useState('');

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    await insert({
      title: newTodo,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    setNewTodo('');
  };

  const toggleTodo = async (todo: Todo) => {
    await update(
      { _id: todo._id },
      { completed: !todo.completed }
    );
  };

  const deleteTodo = async (id: string) => {
    await remove({ _id: id });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <input
        value={newTodo}
        onChange={(e) => setNewTodo(e.target.value)}
        placeholder="Add todo..."
      />
      <button onClick={addTodo}>Add</button>
      
      <ul>
        {todos.map(todo => (
          <li key={todo._id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo._id!)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
\`\`\`

### Server-Side Usage (API Routes)
\`\`\`typescript
// app/api/todos/route.ts
import { find, insertOne } from '@/lib/jersen-db';

export async function GET() {
  const result = await find('todos', {}, 50);
  return Response.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await insertOne('todos', {
    ...body,
    createdAt: new Date().toISOString(),
  });
  return Response.json(result);
}
\`\`\`
`;
}

/**
 * Get all provider docs based on what's enabled
 */
export function getAllProviderDocs(config: ProjectConfig): string {
    const docs: string[] = [];
    
    docs.push(`# Jersen Provider Documentation

This project uses Jersen platform providers. API Key: \`${config.apiKey.slice(0, 20)}...\`
`);
    
    if (config.providers.auth.enabled) {
        docs.push(getAuthDocs(config));
    }
    
    if (config.providers.storage.enabled) {
        docs.push(getStorageDocs(config));
    }
    
    if (config.providers.database.enabled) {
        docs.push(getDatabaseDocs(config));
    }
    
    return docs.join('\n\n---\n\n');
}

/**
 * Get brief provider overview (for always-on context)
 */
export function getProviderOverview(config: ProjectConfig): string {
    const enabled: string[] = [];
    
    if (config.providers.auth.enabled) enabled.push('Auth');
    if (config.providers.storage.enabled) enabled.push('Storage');
    if (config.providers.database.enabled) enabled.push('Database');
    
    if (enabled.length === 0) {
        return '';
    }
    
    return `## Jersen Providers Available
This project has these Jersen providers enabled: **${enabled.join(', ')}**

When implementing features that need authentication, file storage, or database operations, use the \`getProviderDocs\` tool to get implementation details and code templates.

Example: If user asks for "login page", call getProviderDocs with provider="auth" first.
`;
}

/**
 * Detect which providers are likely needed based on user message
 */
export function detectNeededProviders(message: string): ('auth' | 'storage' | 'database')[] {
    const needed: ('auth' | 'storage' | 'database')[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Auth keywords
    const authKeywords = ['login', 'signup', 'sign up', 'sign in', 'signin', 'auth', 'authentication', 'user', 'logout', 'session', 'password', 'register', 'account'];
    if (authKeywords.some(k => lowerMessage.includes(k))) {
        needed.push('auth');
    }
    
    // Storage keywords
    const storageKeywords = ['upload', 'file', 'image', 'photo', 'avatar', 'attachment', 'download', 'storage', 'media', 'asset'];
    if (storageKeywords.some(k => lowerMessage.includes(k))) {
        needed.push('storage');
    }
    
    // Database keywords
    const dbKeywords = ['database', 'db', 'save', 'store', 'crud', 'collection', 'document', 'insert', 'query', 'fetch data', 'persist', 'mongodb', 'data'];
    if (dbKeywords.some(k => lowerMessage.includes(k))) {
        needed.push('database');
    }
    
    return needed;
}
