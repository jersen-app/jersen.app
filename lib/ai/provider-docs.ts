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
Credentials are automatically injected when you preview.

### Auth Library
\`\`\`typescript
// filepath: lib/auth.ts
// These values are automatically injected by Jersen
const API_KEY = '__JERSEN_API_KEY__';
const JERSEN_URL = '__JERSEN_URL__';
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

// Get current user from token (client-side)
export async function getUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(\`\${JERSEN_URL}/api/providers/auth/session\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'x-jersen-api-key': API_KEY,
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

// Get user from token (server-side, for API routes)
// Uses the same injected credentials - works in both client and server
export async function getUserFromToken(token: string): Promise<User | null> {
  if (!token) return null;

  try {
    const res = await fetch(\`\${JERSEN_URL}/api/providers/auth/session\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'x-jersen-api-key': API_KEY,
      },
    });
    if (!res.ok) return null;
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
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { handleAuthCallback } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    // Prevent running twice (React strict mode or router changes)
    if (handled.current) return;
    handled.current = true;

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

### Protected API Routes
\`\`\`typescript
// filepath: app/api/todos/route.ts
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { find, insertOne } from '@/lib/jersen-db';

// Helper to get user from Authorization header
async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return getUserFromToken(token);
}

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await find('todos', { userId: user.id });
  return NextResponse.json(result.documents || []);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await request.json();
  const result = await insertOne('todos', {
    userId: user.id,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json(result);
}
\`\`\`

### Key Points
- **No OAuth provider icons needed** - users login on Jersen's page which has all the provider buttons
- **Simple redirect flow** - just call \`login()\` to start the auth process
- **Token stored in localStorage** - automatically included in API calls
- **useAuth hook** - easy access to user data and auth state
- **getUserFromToken()** - use this in API routes to validate tokens (works server-side)
- **NO process.env** - credentials are injected as constants, not env vars

### ⚠️ Important: Avoid Redirect Loops

**NEVER call \`login()\` automatically in a useEffect!** This causes redirect loops.

❌ **WRONG - causes infinite loop:**
\`\`\`tsx
useEffect(() => {
  if (!isLoggedIn()) {
    login(); // DON'T DO THIS - causes redirect loop!
  }
}, []);
\`\`\`

✅ **CORRECT - only redirect, don't call login():**
\`\`\`tsx
useEffect(() => {
  if (!loading && !isAuthenticated) {
    router.replace('/'); // Redirect to home page with login button
  }
}, [loading, isAuthenticated]);
\`\`\`

The \`login()\` function should ONLY be called from a button click handler.
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

    const needsDatabase = !config.providers.database.enabled;
    const dbWarning = needsDatabase ? `
### ⚠️ IMPORTANT: Storage + Database

Storage only stores files - it does NOT track file metadata!

To list files, store metadata, or associate files with users/records, you MUST:
1. Enable the **Database provider** in project settings
2. Store file info (key, url, userId, etc.) in the database after upload

**Example pattern:**
\`\`\`typescript
// After uploading a file, save metadata to database
const uploadResult = await uploadFile(file, key);
if (uploadResult.success) {
  await insertOne('files', {
    key: uploadResult.key,
    url: uploadResult.url,
    userId: currentUser.id,
    filename: file.name,
    contentType: file.type,
    size: uploadResult.size,
    createdAt: new Date().toISOString()
  });
}

// To list user's files, query the database
const result = await find('files', { userId: currentUser.id });
\`\`\`
` : '';

    return `## Jersen Storage Provider

This project uses Jersen Storage (built on Cloudflare R2) for file storage.
Files are served via a public Cloudflare gateway - no bandwidth cost on your app!

**Quota:** ${config.providers.storage.quota || 1024}MB
${dbWarning}
### Environment Setup
Credentials are automatically injected when you preview.

### Storage Client
\`\`\`typescript
filepath: lib/jersen-storage.ts
// These values are automatically injected by Jersen
const API_KEY = '__JERSEN_API_KEY__';
const API_URL = '__JERSEN_URL__';

interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;  // Public gateway URL - use this directly!
  size?: number;
  error?: string;
}

interface FileUrlResult {
  success: boolean;
  url?: string;  // Public gateway URL
  error?: string;
}

export async function uploadFile(file: File, key: string, token?: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const res = await fetch(\`\${API_URL}/api/providers/storage\`, {
    method: 'POST',
    headers: {
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
    },
    body: formData,
  });
  return res.json();
}

export async function getFileUrl(key: string, token?: string): Promise<FileUrlResult> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const res = await fetch(\`\${API_URL}/api/providers/storage?key=\${encodeURIComponent(key)}\`, {
    headers: {
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
    },
  });
  return res.json();
}

export async function deleteFile(key: string, token?: string): Promise<{ success: boolean; error?: string }> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const res = await fetch(\`\${API_URL}/api/providers/storage?key=\${encodeURIComponent(key)}\`, {
    method: 'DELETE',
    headers: {
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
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
import { uploadFile } from '@/lib/jersen-storage';

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

      // URL is returned directly from upload - no need for extra API call!
      if (uploadResult.url) {
        onUpload?.(uploadResult.key!, uploadResult.url);
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

### Image Display Component
\`\`\`tsx
filepath: components/StorageImage.tsx
"use client";

// Since URLs are public gateway URLs, just use them directly!
export function StorageImage({ url, alt, ...props }: { url: string; alt: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={url} alt={alt} {...props} />;
}

// Or if you only have the key and need to fetch the URL:
import { useState, useEffect } from 'react';
import { getFileUrl } from '@/lib/jersen-storage';

export function StorageImageByKey({ storageKey, alt, ...props }: { storageKey: string; alt: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
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

### Complete Example: Todo with File Attachment

This shows the CORRECT way to add file uploads to a todo list. The key insight is that the **attachment URL must be included when creating the todo record**.

**API Route with Attachment Support:**
\`\`\`typescript
// filepath: app/api/todos/route.ts
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { find, insertOne, updateOne, deleteOne } from '@/lib/jersen-db';

async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return getUserFromToken(token);
}

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await find('todos', { userId: user.id });
  return NextResponse.json(result.documents || []);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ⚠️ IMPORTANT: Accept attachment in the request body!
  const { text, attachment } = await request.json();
  
  const newTodo = {
    userId: user.id,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    // Include attachment if provided
    ...(attachment && {
      attachment: {
        key: attachment.key,
        url: attachment.url,
        name: attachment.name,
      }
    }),
  };

  const result = await insertOne('todos', newTodo);
  return NextResponse.json({ _id: result.insertedId, ...newTodo });
}
\`\`\`

**Frontend Form Component:**
\`\`\`tsx
// filepath: components/AddTodoForm.tsx
"use client";
import { useState } from 'react';
import { uploadFile } from '@/lib/jersen-storage';

interface Attachment {
  key: string;
  url: string;
  name: string;
}

export function AddTodoForm({ onAdd }: { onAdd: () => void }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setUploading(true);
    
    try {
      let attachment: Attachment | undefined;
      
      // Step 1: Upload file first if selected
      if (file) {
        const key = \`todos/\${Date.now()}-\${file.name}\`;
        const uploadResult = await uploadFile(file, key);
        
        if (uploadResult.success && uploadResult.url) {
          attachment = {
            key: uploadResult.key!,
            url: uploadResult.url,
            name: file.name,
          };
        }
      }
      
      // Step 2: Create todo WITH the attachment info
      const token = localStorage.getItem('jersen_session');
      await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`,
        },
        body: JSON.stringify({
          text: text.trim(),
          attachment,  // ⚠️ Include the attachment!
        }),
      });
      
      setText('');
      setFile(null);
      onAdd();
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add todo..."
        className="flex-1 border rounded px-3 py-2"
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        accept="image/*"
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
\`\`\`

**Display Todo with Attachment:**
\`\`\`tsx
// filepath: components/TodoItem.tsx
interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  attachment?: {
    key: string;
    url: string;
    name: string;
  };
}

export function TodoItem({ todo }: { todo: Todo }) {
  return (
    <div className="p-4 border rounded">
      <p>{todo.text}</p>
      {todo.attachment && (
        <div className="mt-2">
          {/* Use the URL directly - it's a public gateway URL */}
          <img 
            src={todo.attachment.url} 
            alt={todo.attachment.name}
            className="max-w-xs rounded"
          />
        </div>
      )}
    </div>
  );
}
\`\`\`

### Key Pattern: Upload → Include URL in Data

The correct flow is:
1. **Upload file to storage** → Get back \`{ key, url }\`
2. **Create/update database record** → Include the \`key\` and \`url\` in the record
3. **When displaying** → Use the \`url\` directly (it's a public CDN URL)

❌ **WRONG** - Upload and create separately without connecting them:
\`\`\`typescript
// This creates a todo WITHOUT the image!
await uploadFile(file, key);
await insertOne('todos', { text }); // Missing attachment!
\`\`\`

✅ **CORRECT** - Upload first, then include in record:
\`\`\`typescript
const upload = await uploadFile(file, key);
await insertOne('todos', { 
  text,
  attachment: { key: upload.key, url: upload.url, name: file.name }
});
\`\`\`

### Best Practices
- **Always store file metadata in the database** - Storage only stores the file, not metadata!
- Use meaningful key paths: \`users/{userId}/avatar.jpg\`, \`products/{productId}/images/main.jpg\`
- Store the storage key AND url in your database after upload
- The public gateway URL never expires - safe to store permanently
- To list files, query your database (storage has no list API)
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

This project uses Jersen Database for data storage via REST API.

${dbInfo}

### 🚨🚨🚨 STOP! READ THIS FIRST! 🚨🚨🚨

**YOU MUST COPY THE \`lib/jersen-db.ts\` FILE EXACTLY AS SHOWN BELOW.**

DO NOT:
- Create your own database helper functions
- Create a \`dbFetch\` wrapper function  
- Append collection names to the URL path
- Use \`/api/providers/database/\${collection}\` - THIS IS WRONG!
- Use operation fields like \`{ operation: 'find' }\` - THIS IS WRONG!

The API has ONE endpoint: \`/api/providers/database\`
- Collection goes in BODY or QUERY PARAMS, NOT in the URL path!

### ⚠️ CRITICAL: NO process.env - USE INJECTED CONSTANTS

**NEVER use \`process.env\` in this project!** Credentials are injected as constants.

❌ **WRONG - DO NOT DO THIS:**
\`\`\`typescript
const API_KEY = process.env.JERSEN_API_KEY;  // WRONG!
const API_URL = process.env.JERSEN_URL;      // WRONG!
\`\`\`

✅ **CORRECT - USE THIS EXACT PATTERN:**
\`\`\`typescript
const API_KEY = '__JERSEN_API_KEY__';  // Automatically replaced
const API_URL = '__JERSEN_URL__';      // Automatically replaced
\`\`\`

**Also DO NOT use:**
- \`mongoose\` library
- \`mongodb\` driver  
- \`MONGODB_URI\` or any database connection strings

### ⚠️⚠️⚠️ CRITICAL: Database API Structure ⚠️⚠️⚠️

**There is ONE endpoint: \`/api/providers/database\`**
- The collection name goes in the BODY (POST/PATCH) or QUERY PARAMS (GET/DELETE)
- **NEVER append collection to URL path!**

| Method | URL | Body/Params |
|--------|-----|-------------|
| POST | \`/api/providers/database\` | Body: \`{ collection: "todos", document: {...} }\` |
| GET | \`/api/providers/database?collection=todos&query={}\` | Query params |
| PATCH | \`/api/providers/database\` | Body: \`{ collection: "todos", query: {...}, update: {...} }\` |
| DELETE | \`/api/providers/database?collection=todos&query={}\` | Query params |

❌ **WRONG - NEVER DO THIS:**
\`\`\`typescript
// These URLs are WRONG and will return 404!
fetch(\`\${API_URL}/api/providers/database/\${collection}\`)      // WRONG!
fetch(\`\${API_URL}/api/providers/database/todos\`)              // WRONG!
fetch(\`\${API_URL}/api/providers/database/insertOne/todos\`)    // WRONG!
fetch(\`\${API_URL}/api/providers/database/find/todos\`)         // WRONG!
\`\`\`

✅ **CORRECT - Always use single endpoint:**
\`\`\`typescript
// POST - collection in body
fetch(\`\${API_URL}/api/providers/database\`, {
  method: 'POST',
  body: JSON.stringify({ collection: 'todos', document: {...} })
})

// GET - collection in query params
fetch(\`\${API_URL}/api/providers/database?collection=todos&query={}\`)
\`\`\`

### Database Client - COPY THIS FILE EXACTLY (DO NOT MODIFY!)

**⚠️ IMPORTANT: Copy this ENTIRE file to \`lib/jersen-db.ts\`. Do not create your own version!**

\`\`\`typescript
// filepath: lib/jersen-db.ts
// ⚠️ COPY THIS FILE EXACTLY - DO NOT CREATE YOUR OWN DATABASE HELPER!
// ⚠️ The URL is ALWAYS /api/providers/database - NEVER append collection to path!

// These values are automatically injected by Jersen
const API_KEY = '__JERSEN_API_KEY__';
const API_URL = '__JERSEN_URL__';

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
// Endpoint: POST /api/providers/database
// Body: { collection, document }
export async function insertOne<T extends Record<string, any>>(
  collection: string, 
  document: T,
  token?: string
): Promise<InsertResult> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const res = await fetch(\`\${API_URL}/api/providers/database\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
    },
    body: JSON.stringify({ collection, document }),
  });
  return res.json();
}

// Find documents
// Endpoint: GET /api/providers/database?collection=X&query={}&limit=N
export async function find<T = any>(
  collection: string, 
  query: Record<string, any> = {}, 
  limit = 100,
  token?: string
): Promise<FindResult<T>> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const params = new URLSearchParams({
    collection,
    query: JSON.stringify(query),
    limit: String(limit),
  });
  
  const res = await fetch(\`\${API_URL}/api/providers/database?\${params}\`, {
    headers: {
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
    },
  });
  return res.json();
}

// Update documents  
// Endpoint: PATCH /api/providers/database
// Body: { collection, query, update }
export async function updateMany(
  collection: string,
  query: Record<string, any>,
  update: Record<string, any>,
  token?: string
): Promise<UpdateResult> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const res = await fetch(\`\${API_URL}/api/providers/database\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
    },
    body: JSON.stringify({ collection, query, update }),
  });
  return res.json();
}

// Delete documents
// Endpoint: DELETE /api/providers/database?collection=X&query={}
export async function deleteMany(
  collection: string,
  query: Record<string, any>,
  token?: string
): Promise<DeleteResult> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const params = new URLSearchParams({
    collection,
    query: JSON.stringify(query),
  });
  
  const res = await fetch(\`\${API_URL}/api/providers/database?\${params}\`, {
    method: 'DELETE',
    headers: {
      'x-jersen-api-key': API_KEY,
      ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}),
    },
  });
  return res.json();
}

// Convenience: Find one document
export async function findOne<T = any>(
  collection: string,
  query: Record<string, any>
): Promise<{ success: boolean; document?: T; error?: string }> {
  const result = await find<T>(collection, query, 1);
  return {
    success: result.success,
    document: result.documents?.[0],
    error: result.error,
  };
}

// Convenience: Update one document
export async function updateOne(
  collection: string,
  query: Record<string, any>,
  update: Record<string, any>
): Promise<UpdateResult> {
  return updateMany(collection, query, update);
}

// Convenience: Delete one document
export async function deleteOne(
  collection: string,
  query: Record<string, any>
): Promise<DeleteResult> {
  return deleteMany(collection, query);
}
\`\`\`

### Usage Example - Todo List

\`\`\`tsx
// filepath: app/todos/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { find, insertOne, updateOne, deleteOne } from '@/lib/jersen-db';

interface Todo {
  _id?: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);

  // Load todos on mount
  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    const result = await find<Todo>('todos');
    if (result.success) {
      setTodos(result.documents || []);
    }
    setLoading(false);
  }

  async function addTodo() {
    if (!newTodo.trim()) return;
    await insertOne('todos', {
      title: newTodo,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    setNewTodo('');
    loadTodos();
  }

  async function toggleTodo(todo: Todo) {
    await updateOne('todos', { _id: todo._id }, { completed: !todo.completed });
    loadTodos();
  }

  async function removeTodo(id: string) {
    await deleteOne('todos', { _id: id });
    loadTodos();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Todos</h1>
      
      <div className="flex gap-2 mb-4">
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add todo..."
          className="flex-1 border rounded px-3 py-2"
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo} className="bg-blue-500 text-white px-4 py-2 rounded">
          Add
        </button>
      </div>
      
      <ul className="space-y-2">
        {todos.map(todo => (
          <li key={todo._id} className="flex items-center gap-2 p-2 border rounded">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo)}
            />
            <span className={todo.completed ? 'line-through text-gray-400' : ''}>
              {todo.title}
            </span>
            <button 
              onClick={() => removeTodo(todo._id!)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
\`\`\`

### Server-Side Usage (API Routes)

When using auth with database, import both libraries:

\`\`\`typescript
// filepath: app/api/user-todos/route.ts
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { find, insertOne, updateOne, deleteOne } from '@/lib/jersen-db';

async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return getUserFromToken(token);
}

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find todos for this user only
  const result = await find('todos', { userId: user.id });
  return NextResponse.json(result.documents || []);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title } = await request.json();
  const result = await insertOne('todos', {
    userId: user.id,  // Associate with user
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json(result);
}
\`\`\`

### Complete Example: Auth + Database + Storage (Todo with Attachments)

When all three providers are used together, here's the complete pattern:

**API Route:**
\`\`\`typescript
// filepath: app/api/todos/route.ts
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { find, insertOne, updateOne, deleteOne } from '@/lib/jersen-db';

interface Todo {
  _id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  attachment?: {
    key: string;
    url: string;
    name: string;
  };
}

async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return getUserFromToken(token);
}

// GET - List user's todos (with attachments)
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await find<Todo>('todos', { userId: user.id });
  return NextResponse.json(result.documents || []);
}

// POST - Create todo (with optional attachment)
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ⚠️ Accept both text AND attachment from client
  const { text, attachment } = await request.json();
  
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const newTodo: Omit<Todo, '_id'> = {
    userId: user.id,
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };

  // Include attachment if provided (already uploaded client-side)
  if (attachment?.key && attachment?.url) {
    newTodo.attachment = {
      key: attachment.key,
      url: attachment.url,
      name: attachment.name || 'file',
    };
  }

  const result = await insertOne('todos', newTodo);
  return NextResponse.json({ _id: result.insertedId, ...newTodo }, { status: 201 });
}

// PATCH - Toggle completed status
export async function PATCH(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, completed } = await request.json();
  const result = await updateOne(
    'todos',
    { _id: id, userId: user.id },
    { $set: { completed } }
  );
  return NextResponse.json({ success: result.modifiedCount > 0 });
}

// DELETE - Remove todo
export async function DELETE(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  const result = await deleteOne('todos', { _id: id, userId: user.id });
  return NextResponse.json({ success: result.deletedCount > 0 });
}
\`\`\`

**Frontend - Add Todo Form with File Upload:**
\`\`\`tsx
// filepath: components/AddTodoForm.tsx
"use client";
import { useState } from 'react';
import { uploadFile } from '@/lib/jersen-storage';
import { getToken } from '@/lib/auth';

interface AddTodoFormProps {
  onAdd: () => void;
}

export function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    
    setLoading(true);
    
    try {
      let attachment;
      
      // Step 1: If file selected, upload it first
      if (file) {
        const key = \`todos/\${Date.now()}-\${file.name.replace(/\\s+/g, '-')}\`;
        const uploadResult = await uploadFile(file, key);
        
        if (uploadResult.success && uploadResult.url) {
          attachment = {
            key: uploadResult.key,
            url: uploadResult.url,
            name: file.name,
          };
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      }
      
      // Step 2: Create todo with attachment info included
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${getToken()}\`,
        },
        body: JSON.stringify({
          text: text.trim(),
          attachment, // ⚠️ This includes the uploaded file's URL!
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create todo');
      
      // Reset form
      setText('');
      setFile(null);
      onAdd(); // Refresh list
    } catch (error) {
      console.error('Error creating todo:', error);
      alert('Failed to add todo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full p-3 border rounded-xl"
        disabled={loading}
      />
      <div className="flex gap-2">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept="image/*,application/pdf"
          className="flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-black text-white rounded-xl disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Todo'}
        </button>
      </div>
      {file && (
        <p className="text-sm text-gray-500">Selected: {file.name}</p>
      )}
    </form>
  );
}
\`\`\`

**Frontend - Todo Item with Attachment Display:**
\`\`\`tsx
// filepath: components/TodoItem.tsx
"use client";
import { getToken } from '@/lib/auth';

interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  attachment?: {
    key: string;
    url: string;
    name: string;
  };
}

interface TodoItemProps {
  todo: Todo;
  onUpdate: () => void;
}

export function TodoItem({ todo, onUpdate }: TodoItemProps) {
  const handleToggle = async () => {
    await fetch('/api/todos', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${getToken()}\`,
      },
      body: JSON.stringify({ id: todo._id, completed: !todo.completed }),
    });
    onUpdate();
  };

  const handleDelete = async () => {
    await fetch(\`/api/todos?id=\${todo._id}\`, {
      method: 'DELETE',
      headers: { 'Authorization': \`Bearer \${getToken()}\` },
    });
    onUpdate();
  };

  const isImage = todo.attachment?.name.match(/\\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className="p-4 border rounded-xl">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          className="w-5 h-5"
        />
        <span className={todo.completed ? 'line-through text-gray-400' : ''}>
          {todo.text}
        </span>
        <button onClick={handleDelete} className="ml-auto text-red-500">
          Delete
        </button>
      </div>
      
      {/* Display attachment if present */}
      {todo.attachment && (
        <div className="mt-3 pl-8">
          {isImage ? (
            <img 
              src={todo.attachment.url}  // Direct public URL
              alt={todo.attachment.name}
              className="max-w-xs rounded-lg"
            />
          ) : (
            <a 
              href={todo.attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              📎 {todo.attachment.name}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
\`\`\`

### Key Integration Points:

1. **Client uploads file to storage** → Gets \`{ key, url, name }\`
2. **Client sends todo + attachment info to API** → API saves both in database
3. **When fetching todos** → Attachment URL is already in the document
4. **When displaying** → Use \`todo.attachment.url\` directly (public CDN)

This ensures the file URL is **stored with the todo record** so it appears when listing todos.
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
 * Instructs AI to use getProviderDocs tool for implementation details
 */
export function getProviderOverview(config: ProjectConfig): string {
    const enabled: string[] = [];
    const details: string[] = [];
    
    if (config.providers.auth.enabled) {
        enabled.push('Auth');
        details.push('- **Auth**: OAuth login via redirect flow. Key: `lib/auth.ts`, `app/auth/callback/page.tsx`');
    }
    if (config.providers.storage.enabled) {
        enabled.push('Storage');
        details.push('- **Storage**: File uploads to R2. Key: `lib/jersen-storage.ts`');
    }
    if (config.providers.database.enabled) {
        enabled.push('Database');
        details.push('- **Database**: MongoDB via REST. Key: `lib/jersen-db.ts`. ONE endpoint: `/api/providers/database`');
    }
    
    if (enabled.length === 0) {
        return '';
    }
    
    return `## Jersen Providers Available: ${enabled.join(', ')}

${details.join('\n')}

**IMPORTANT**: Use the \`getProviderDocs\` tool to get implementation code when you need to implement auth, storage, or database features. The tool will return the exact code patterns to use.

**CRITICAL RULES** (always apply):
- Use \`'__JERSEN_API_KEY__'\` and \`'__JERSEN_URL__'\` - NEVER \`process.env\`
- Database: ONE endpoint \`/api/providers/database\` - collection in body/params, NOT in URL path
- Auth: Client-side only with localStorage - never call login() in useEffect
`;
}
