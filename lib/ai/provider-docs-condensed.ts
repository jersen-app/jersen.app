/**
 * Condensed Provider Documentation for AI Code Generation
 * 
 * IMPORTANT: This is a shortened version of provider docs to prevent context overflow.
 * Only essential patterns are included.
 */

import type { ProjectConfig } from "./provider-docs";

/**
 * Get condensed auth documentation (essential patterns only)
 */
export function getCondensedAuthDocs(config: ProjectConfig): string {
    if (!config.providers.auth.enabled) {
        return `## Auth: NOT ENABLED - Enable in project settings first.`;
    }

    return `## Jersen Auth (Condensed)

Uses popup-based OAuth (works in iframes/preview). All auth code is CLIENT-SIDE.

### Key Files to Generate:

**lib/auth.ts** - Auth utilities:
\`\`\`typescript
const API_KEY = '__JERSEN_API_KEY__';
const JERSEN_URL = '__JERSEN_URL__';
const SESSION_KEY = 'jersen_session';

export interface User { id: string; email: string; name: string; avatarUrl?: string; provider: string; }

// Popup-based login (works in iframes/preview)
export function login() {
  const callbackUrl = encodeURIComponent(window.location.origin + '/auth/callback');
  const authUrl = \`\${JERSEN_URL}/auth/oauth?api_key=\${API_KEY}&redirect_uri=\${callbackUrl}\`;
  
  // Try popup first (works better in iframes), fallback to redirect
  const width = 500, height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(authUrl, 'jersen_auth', \`width=\${width},height=\${height},left=\${left},top=\${top}\`);
  
  if (!popup || popup.closed) {
    // Popup blocked, fallback to redirect
    window.location.href = authUrl;
  }
}

// Called by callback page to complete auth
export function handleAuthCallback(): boolean {
  const token = new URLSearchParams(window.location.search).get('session_token');
  if (token) { 
    localStorage.setItem(SESSION_KEY, token); 
    window.history.replaceState({}, '', '/auth/callback');
    // If in popup, close it and notify opener
    if (window.opener) {
      window.opener.postMessage({ type: 'jersen_auth_success', token }, '*');
      window.close();
    }
    return true; 
  }
  return false;
}

// Listen for auth success from popup
export function onAuthSuccess(callback: () => void) {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'jersen_auth_success' && event.data?.token) {
      localStorage.setItem(SESSION_KEY, event.data.token);
      window.removeEventListener('message', handler);
      callback();
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function getToken(): string | null { return typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null; }
export function isLoggedIn(): boolean { return !!getToken(); }
export function logout() { localStorage.removeItem(SESSION_KEY); window.location.href = '/'; }

export async function getUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(\`\${JERSEN_URL}/api/providers/auth/session\`, {
    headers: { 'Authorization': \`Bearer \${token}\`, 'x-jersen-api-key': API_KEY },
  });
  if (!res.ok) { localStorage.removeItem(SESSION_KEY); return null; }
  return (await res.json()).user;
}
\`\`\`

**app/auth/callback/page.tsx** - OAuth callback (use client):
\`\`\`tsx
"use client";
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { handleAuthCallback } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const success = handleAuthCallback();
    // If not in popup (window.opener is null), redirect to dashboard
    if (!window.opener) {
      router.replace(success ? '/dashboard' : '/?error=auth_failed');
    }
    // If in popup, handleAuthCallback already closed it
  }, [router]);
  return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-violet-600 rounded-full"></div></div>;
}
\`\`\`

**hooks/useAuth.ts** - React hook for auth state:
\`\`\`tsx
"use client";
import { useState, useEffect } from 'react';
import { getUser, login, logout, isLoggedIn, onAuthSuccess, type User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    setLoading(true);
    const userData = await getUser();
    setUser(userData);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
    // Listen for popup auth success
    const cleanup = onAuthSuccess(() => {
      checkAuth();
    });
    return cleanup;
  }, []);

  return { user, loading, isLoggedIn: !!user, login, logout, refetch: checkAuth };
}
\`\`\`

**⚠️ IMPORTANT:**
- NEVER call login() in useEffect - causes redirect loops! Only call from button onClick.
- The popup flow works in iframes/preview. Falls back to redirect if popup blocked.
- Update the redirect path ('/dashboard') to match your app's protected page.
`;
}

/**
 * Get condensed storage documentation
 */
export function getCondensedStorageDocs(config: ProjectConfig): string {
    if (!config.providers.storage.enabled) {
        return `## Storage: NOT ENABLED - Enable in project settings first.`;
    }

    return `## Jersen Storage (Condensed)

File storage via Cloudflare R2. Files served via public CDN.

### lib/jersen-storage.ts:
\`\`\`typescript
const API_KEY = '__JERSEN_API_KEY__';
const API_URL = '__JERSEN_URL__';

export async function uploadFile(file: File, key: string, token?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(\`\${API_URL}/api/providers/storage\`, {
    method: 'POST',
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
    body: formData,
  });
  return res.json(); // { success, key, url, size, error }
}

export async function getFileUrl(key: string, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(\`\${API_URL}/api/providers/storage?key=\${encodeURIComponent(key)}\`, {
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
  });
  return res.json(); // { success, url, error }
}

export async function deleteFile(key: string, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(\`\${API_URL}/api/providers/storage?key=\${encodeURIComponent(key)}\`, {
    method: 'DELETE',
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
  });
  return res.json();
}
\`\`\`

**Usage Pattern:** Upload file → Get { key, url } → Store URL in database → Display with <img src={url} />
`;
}

/**
 * Get condensed database documentation
 */
export function getCondensedDatabaseDocs(config: ProjectConfig): string {
    if (!config.providers.database.enabled) {
        return `## Database: NOT ENABLED - Enable in project settings first.`;
    }

    return `## Jersen Database (Condensed)

MongoDB via REST API. **ONE endpoint: /api/providers/database**

### ⚠️ CRITICAL RULES:
1. **NEVER** use \`process.env\` - use \`'__JERSEN_API_KEY__'\` and \`'__JERSEN_URL__'\`
2. **NEVER** append collection to URL: \`/database/todos\` is WRONG!
3. Collection goes in BODY (POST/PATCH) or QUERY PARAMS (GET/DELETE)

### lib/jersen-db.ts (COPY EXACTLY):
\`\`\`typescript
const API_KEY = '__JERSEN_API_KEY__';
const API_URL = '__JERSEN_URL__';

export async function insertOne<T extends Record<string, any>>(collection: string, document: T, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(\`\${API_URL}/api/providers/database\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
    body: JSON.stringify({ collection, document }),
  });
  return res.json(); // { success, insertedId, error }
}

export async function find<T = any>(collection: string, query: Record<string, any> = {}, limit = 100, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const params = new URLSearchParams({ collection, query: JSON.stringify(query), limit: String(limit) });
  const res = await fetch(\`\${API_URL}/api/providers/database?\${params}\`, {
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
  });
  return res.json(); // { success, documents, count, error }
}

export async function updateOne(collection: string, query: Record<string, any>, update: Record<string, any>, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(\`\${API_URL}/api/providers/database\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
    body: JSON.stringify({ collection, query, update }),
  });
  return res.json(); // { success, matchedCount, modifiedCount, error }
}

export async function deleteOne(collection: string, query: Record<string, any>, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const params = new URLSearchParams({ collection, query: JSON.stringify(query) });
  const res = await fetch(\`\${API_URL}/api/providers/database?\${params}\`, {
    method: 'DELETE',
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {}) },
  });
  return res.json(); // { success, deletedCount, error }
}

export async function findOne<T = any>(collection: string, query: Record<string, any>) {
  const result = await find<T>(collection, query, 1);
  return { success: result.success, document: result.documents?.[0], error: result.error };
}
\`\`\`

### Usage Example:
\`\`\`tsx
import { find, insertOne, updateOne, deleteOne } from '@/lib/jersen-db';

// Create
await insertOne('todos', { title: 'Buy milk', completed: false });

// Read
const result = await find('todos', { completed: false });
const todos = result.documents || [];

// Update
await updateOne('todos', { _id: id }, { completed: true });

// Delete
await deleteOne('todos', { _id: id });
\`\`\`
`;
}

/**
 * Get all condensed provider docs
 */
export function getCondensedProviderDocs(config: ProjectConfig): string {
    const docs: string[] = [];
    
    if (config.providers.auth.enabled) {
        docs.push(getCondensedAuthDocs(config));
    }
    if (config.providers.storage.enabled) {
        docs.push(getCondensedStorageDocs(config));
    }
    if (config.providers.database.enabled) {
        docs.push(getCondensedDatabaseDocs(config));
    }
    
    if (docs.length === 0) return '';
    
    return `---\n# Jersen Provider Docs\n\n${docs.join('\n\n---\n\n')}`;
}
