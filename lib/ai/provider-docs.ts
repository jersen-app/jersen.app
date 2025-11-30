/**
 * Provider Documentation for AI Code Generation
 * 
 * These docs are injected into the AI context when needed,
 * based on detected context from user messages.
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

This project uses Jersen Auth for user authentication with OAuth social logins (Google, GitHub, Facebook, TikTok).

### How It Works
1. User clicks a login button in your app
2. Your app redirects to Jersen's hosted OAuth page
3. User authenticates with their chosen provider (Google, GitHub, etc.)
4. Jersen redirects back to your app with a session token
5. Your app stores the token and uses it for authenticated requests

### Environment Setup
The \`.env.local\` file is automatically configured with your API key. The Jersen URL defaults to https://jersen.app.

### Auth Library
\`\`\`typescript
// filepath: lib/auth.ts
const API_KEY = process.env.NEXT_PUBLIC_JERSEN_API_KEY || '';
// Jersen API URL - falls back to localhost for development
const JERSEN_URL = process.env.NEXT_PUBLIC_JERSEN_API_URL || 'http://localhost:3000';
const SESSION_KEY = 'jersen_session';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: string;
}

// Redirect to Jersen OAuth login page
export function login() {
  if (!API_KEY) {
    console.error('NEXT_PUBLIC_JERSEN_API_KEY is not set');
    return;
  }
  const callbackUrl = encodeURIComponent(window.location.origin + '/auth/callback');
  window.location.href = \`\${JERSEN_URL}/auth/oauth?api_key=\${API_KEY}&redirect_uri=\${callbackUrl}\`;
}

// Handle callback - extract and store token
export function handleAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('session_token');
  
  if (token) {
    localStorage.setItem(SESSION_KEY, token);
    window.history.replaceState({}, '', '/auth/callback');
    return true;
  }
  return false;
}

// Get current session token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return !!getToken();
}

// Get current user from token
export async function getUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(\`\${JERSEN_URL}/api/providers/auth/session\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'x-api-key': API_KEY,
      },
    });
    if (!res.ok) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// Logout
export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
}
\`\`\`

### Login Button Component
\`\`\`tsx
// filepath: components/LoginButton.tsx
"use client";
import { login } from '@/lib/auth';

export function LoginButton() {
  return (
    <button
      onClick={login}
      className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
    >
      Sign In
    </button>
  );
}
\`\`\`

### Auth Callback Page
\`\`\`tsx
// filepath: app/auth/callback/page.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleAuthCallback } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const success = handleAuthCallback();
    // Redirect to dashboard on success, home on failure
    router.replace(success ? '/dashboard' : '/?error=auth_failed');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  );
}
\`\`\`

### Home Page with Login
\`\`\`tsx
// filepath: app/page.tsx
import { LoginButton } from '@/components/LoginButton';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to My App
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Sign in to get started
      </p>
      <LoginButton />
    </div>
  );
}
\`\`\`

### useAuth Hook (Optional)
\`\`\`tsx
// filepath: hooks/useAuth.ts
"use client";
import { useState, useEffect } from 'react';
import { getUser, isLoggedIn, logout, type User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (isLoggedIn()) {
        const userData = await getUser();
        setUser(userData);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
  };
}
\`\`\`

### Protected Dashboard Page
\`\`\`tsx
// filepath: app/dashboard/page.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span>{user.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p>Welcome, {user.name}!</p>
          <p className="text-gray-600 dark:text-gray-400">Email: {user.email}</p>
        </div>
      </div>
    </div>
  );
}
\`\`\`

### Key Points
- **No OAuth provider icons needed** - users login on Jersen's page which has all the provider buttons
- **Simple redirect flow** - just call \`login()\` to start the auth process
- **Token stored in localStorage** - automatically included in API calls
- **useAuth hook** - easy access to user data and auth state
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
\`\`\`typescript
filepath: lib/jersen-storage.ts
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
filepath: components/FileUpload.tsx
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
filepath: components/StorageImage.tsx
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
\`\`\`typescript
filepath: lib/jersen-db.ts
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
filepath: hooks/useCollection.tsx
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
filepath: app/todos/page.tsx
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
filepath: app/api/todos/route.ts
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

Provider documentation is automatically included below when features like login, file upload, or database operations are detected. Just follow the code patterns shown.
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
