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

This project uses Jersen Auth (built on Clerk) for user authentication.

### Environment Setup
Add to \`.env.local\`:
\`\`\`
JERSEN_API_KEY=${config.apiKey}
JERSEN_API_URL=https://api.jersen.app  # or http://localhost:3000 for dev
\`\`\`

### Client-Side Auth Hook
Create \`lib/jersen-auth.ts\`:
\`\`\`typescript
const API_KEY = process.env.NEXT_PUBLIC_JERSEN_API_KEY!;
const API_URL = process.env.NEXT_PUBLIC_JERSEN_API_URL || 'https://api.jersen.app';

interface User {
  id: string;
  email: string;
  metadata?: Record<string, any>;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  sessionToken?: string;
  error?: string;
}

export async function signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthResponse> {
  const res = await fetch(\`\${API_URL}/api/providers/auth?action=signup\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ email, password, metadata }),
  });
  return res.json();
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(\`\${API_URL}/api/providers/auth?action=signin\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.sessionToken) {
    localStorage.setItem('jersen_session', data.sessionToken);
    localStorage.setItem('jersen_user', JSON.stringify(data.user));
  }
  return data;
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('jersen_session');
  localStorage.removeItem('jersen_user');
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('jersen_user');
  return userStr ? JSON.parse(userStr) : null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('jersen_session');
}
\`\`\`

### React Auth Context (Optional)
Create \`contexts/AuthContext.tsx\`:
\`\`\`tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signUp, signOut, getCurrentUser, isAuthenticated } from '@/lib/jersen-auth';

interface User {
  id: string;
  email: string;
  metadata?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setIsLoading(false);
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const handleSignUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const result = await signUp(email, password, metadata);
    return { success: result.success, error: result.error };
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      signIn: handleSignIn, 
      signUp: handleSignUp, 
      signOut: handleSignOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
\`\`\`

### Usage Example
\`\`\`tsx
"use client";
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn(email, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  // ... render form
}
\`\`\`

### Protected Routes
\`\`\`tsx
"use client";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;
  
  return <>{children}</>;
}
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
Add to \`.env.local\`:
\`\`\`
JERSEN_API_KEY=${config.apiKey}
JERSEN_API_URL=https://api.jersen.app
\`\`\`

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
Add to \`.env.local\`:
\`\`\`
JERSEN_API_KEY=${config.apiKey}
JERSEN_API_URL=https://api.jersen.app
\`\`\`

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
