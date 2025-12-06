# Jersen Provider APIs

This document describes the backend APIs that Jersen provides to user-built applications. When users build apps on Jersen, their apps can use these APIs for authentication, database, and storage without any backend setup.

## Overview

Jersen injects credentials into user projects automatically:

```typescript
// These are automatically injected by Jersen
const API_KEY = '__JERSEN_API_KEY__';  // Replaced with actual project API key
const API_URL = '__JERSEN_URL__';       // Replaced with Jersen URL (e.g., https://jersen.app)
```

All API requests require the `x-jersen-api-key` header.

---

## 🔐 Authentication Provider

Provides OAuth authentication for user applications. Users can login via Google, GitHub, or other providers configured in Clerk.

### How It Works

1. User clicks "Login" in their app
2. App redirects to Jersen OAuth page
3. User authenticates with their preferred provider
4. Jersen creates a session and redirects back with a token
5. App stores the token and uses it for authenticated requests

### Endpoints

#### Start OAuth Flow
```
GET /auth/oauth?api_key={API_KEY}&redirect_uri={CALLBACK_URL}
```

Redirects user to Clerk OAuth sign-in page.

#### OAuth Callback (handled by Jersen)
```
GET /auth/oauth/callback?api_key={API_KEY}&redirect_uri={CALLBACK_URL}
```

After authentication, redirects to user's app with `?session_token=xxx&user_id=xxx`

#### Get Session
```
GET /api/providers/auth/session
Headers:
  Authorization: Bearer {session_token}
  x-jersen-api-key: {API_KEY}

Response:
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "provider": "google",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLoginAt": "2024-12-02T00:00:00.000Z"
  },
  "expiresAt": "2024-12-09T00:00:00.000Z"
}
```

#### Delete Session (Logout)
```
DELETE /api/providers/auth/session
Headers:
  Authorization: Bearer {session_token}
  x-jersen-api-key: {API_KEY}

Response:
{
  "success": true,
  "message": "Session invalidated..."
}
```

### Client Library

```typescript
// lib/auth.ts
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

// Redirect to login
export function login() {
  const callbackUrl = encodeURIComponent(window.location.origin + '/auth/callback');
  window.location.href = `${JERSEN_URL}/auth/oauth?api_key=${API_KEY}&redirect_uri=${callbackUrl}`;
}

// Handle callback - extract and store token
export function handleAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('session_token');
  
  if (token) {
    localStorage.setItem(SESSION_KEY, token);
    window.history.replaceState({}, '', '/auth/callback');
    return true;
  }
  return false;
}

// Get current user
export async function getUser(): Promise<User | null> {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  const res = await fetch(`${JERSEN_URL}/api/providers/auth/session`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-jersen-api-key': API_KEY,
    },
  });
  
  if (!res.ok) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  
  const data = await res.json();
  return data.user;
}

// Logout
export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
}
```

---

## 📦 Database Provider

Provides a MongoDB-like REST API for storing and querying data. Each project's data is isolated in separate collections.

### Endpoints

#### Insert Document
```
POST /api/providers/database
Headers:
  Content-Type: application/json
  x-jersen-api-key: {API_KEY}

Body:
{
  "collection": "todos",
  "document": {
    "text": "Buy groceries",
    "completed": false,
    "userId": "user_abc123"
  }
}

Response:
{
  "success": true,
  "insertedId": "507f1f77bcf86cd799439011"
}
```

#### Find Documents
```
GET /api/providers/database?collection={collection}&query={JSON}&limit={number}
Headers:
  x-jersen-api-key: {API_KEY}

Example: /api/providers/database?collection=todos&query={"userId":"user_abc123"}

Response:
{
  "success": true,
  "documents": [
    { "_id": "...", "text": "Buy groceries", "completed": false, "userId": "user_abc123" }
  ],
  "count": 1
}
```

#### Update Documents
```
PATCH /api/providers/database
Headers:
  Content-Type: application/json
  x-jersen-api-key: {API_KEY}

Body:
{
  "collection": "todos",
  "query": { "_id": "507f1f77bcf86cd799439011" },
  "update": { "$set": { "completed": true } }
}

Response:
{
  "success": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```

#### Delete Documents
```
DELETE /api/providers/database?collection={collection}&query={JSON}
Headers:
  x-jersen-api-key: {API_KEY}

Example: /api/providers/database?collection=todos&query={"_id":"507f1f77bcf86cd799439011"}

Response:
{
  "success": true,
  "deletedCount": 1
}
```

### Client Library

```typescript
// lib/jersen-db.ts
const API_KEY = '__JERSEN_API_KEY__';
const API_URL = '__JERSEN_URL__';

export async function insertOne(collection: string, document: any, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(`${API_URL}/api/providers/database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
    body: JSON.stringify({ collection, document }),
  });
  return res.json();
}

export async function find(collection: string, query: any = {}, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const params = new URLSearchParams({ collection, query: JSON.stringify(query) });
  const res = await fetch(`${API_URL}/api/providers/database?${params}`, {
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
  });
  return res.json();
}

export async function updateOne(collection: string, query: any, update: any, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(`${API_URL}/api/providers/database`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
    body: JSON.stringify({ collection, query, update }),
  });
  return res.json();
}

export async function deleteOne(collection: string, query: any, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const params = new URLSearchParams({ collection, query: JSON.stringify(query) });
  const res = await fetch(`${API_URL}/api/providers/database?${params}`, {
    method: 'DELETE',
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
  });
  return res.json();
}
```

### Notes

- Document `_id` fields are automatically converted from strings to ObjectId for queries
- Each project's collections are prefixed with `proj_{projectId}_` for isolation
- Default limit is 100 documents per query

---

## 🗄️ Storage Provider

Provides file storage using Cloudflare R2 with a public CDN gateway.

### Endpoints

#### Upload File
```
POST /api/providers/storage
Headers:
  x-jersen-api-key: {API_KEY}
Content-Type: multipart/form-data

Body:
  file: (binary)
  key: "uploads/image.png"

Response:
{
  "success": true,
  "key": "projects/abc123/uploads/image.png",
  "url": "https://gateway.jersen.app/projects/abc123/uploads/image.png",
  "size": 12345
}
```

#### Get File URL
```
GET /api/providers/storage?key={key}
Headers:
  x-jersen-api-key: {API_KEY}

Response:
{
  "success": true,
  "url": "https://gateway.jersen.app/projects/abc123/uploads/image.png"
}
```

#### Delete File
```
DELETE /api/providers/storage?key={key}
Headers:
  x-jersen-api-key: {API_KEY}

Response:
{
  "success": true
}
```

### Client Library

```typescript
// lib/jersen-storage.ts
const API_KEY = '__JERSEN_API_KEY__';
const API_URL = '__JERSEN_URL__';

export async function uploadFile(file: File, key: string, token?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);

  const res = await fetch(`${API_URL}/api/providers/storage`, {
    method: 'POST',
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
    body: formData,
  });
  return res.json();
}

export async function getFileUrl(key: string, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(`${API_URL}/api/providers/storage?key=${encodeURIComponent(key)}`, {
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
  });
  return res.json();
}

export async function deleteFile(key: string, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('jersen_session') : null);
  const res = await fetch(`${API_URL}/api/providers/storage?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { 'x-jersen-api-key': API_KEY, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
  });
  return res.json();
}
```

### Notes

- Files are served via Cloudflare's public CDN - no bandwidth cost on your app
- URLs returned are permanent and don't expire
- To track/list files, store metadata in the Database provider
- Recommended key pattern: `{category}/{userId}/{filename}`

---

## 🔒 CORS Configuration

Jersen automatically handles CORS for:
- E2B sandbox URLs (`https://3000-*.e2b.app`)
- Jersen platform domains
- Deployed project URLs (when deployed via Vercel integration)

For custom domains, use the allowed origins API:

```
POST /api/projects/{projectId}/allowed-origins
Body: { "origin": "https://my-app.example.com" }

GET /api/projects/{projectId}/allowed-origins

DELETE /api/projects/{projectId}/allowed-origins
Body: { "origin": "https://my-app.example.com" }
```

---

## 🔑 API Key

Each project has a unique API key in the format: `jersen_proj_XXXXX`

The API key is:
- Generated when a project is created
- Stored securely (hashed) in the database
- Automatically injected into project files during preview
- Required for all provider API calls

To regenerate an API key:
```
POST /api/projects/{projectId}/regenerate-key
```

---

## Rate Limiting

All provider APIs are rate-limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 10 requests/minute per IP |
| Database endpoints | 100 requests/minute per API key |
| Storage endpoints | 50 requests/minute per API key |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701500000
```
