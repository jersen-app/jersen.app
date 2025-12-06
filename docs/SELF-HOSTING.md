# Self-Hosting Configuration Guide

This guide covers detailed configuration options for self-hosting Jersen.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Service Setup](#service-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 2GB | 4GB+ |
| Storage | 10GB | 50GB+ |
| Node.js | 20.x | 22.x LTS |

### Required Accounts

1. **Clerk** (Authentication)
   - Sign up at [clerk.com](https://clerk.com)
   - Create a new application
   - Enable OAuth providers (Google, GitHub, etc.)

2. **MongoDB** (Database)
   - Local installation or [MongoDB Atlas](https://mongodb.com/atlas)
   - Create a database for Jersen

3. **E2B** (Sandbox Environments)
   - Sign up at [e2b.dev](https://e2b.dev)
   - Get your API key from the dashboard

4. **Google AI** (Gemini)
   - Get API key from [Google AI Studio](https://aistudio.google.com/)

---

## Service Setup

### Clerk Configuration

1. Create a Clerk application
2. Go to **User & Authentication** → **Social Connections**
3. Enable desired OAuth providers:
   - Google OAuth
   - GitHub OAuth
   - Discord (optional)
   - etc.

4. Configure redirect URLs:
   ```
   Allowed redirect URLs:
   - http://localhost:3000/*
   - https://your-domain.com/*
   ```

5. Get your keys from **API Keys** section

### MongoDB Setup

#### Option A: Local MongoDB

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb
sudo systemctl start mongodb

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Connection string: `mongodb://localhost:27017`

#### Option B: MongoDB Atlas

1. Create cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create database user
3. Whitelist IP addresses (or allow from anywhere: `0.0.0.0/0`)
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/`

### Cloudflare R2 Setup (Optional - for Storage)

1. Sign up for [Cloudflare](https://cloudflare.com)
2. Go to **R2** → **Create bucket**
3. Create an API token with R2 permissions
4. Set up a public bucket or custom domain for CDN access

**Bucket Settings:**
```
Bucket Name: jersen-storage
Public Access: Enabled (for CDN)
CORS Configuration:
  - Allow all origins (or specific domains)
  - Allow GET, PUT methods
```

### Upstash Redis Setup (Optional - for Rate Limiting)

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Get REST URL and token from dashboard

---

## Environment Configuration

### Complete .env.local Template

```bash
# ============================================
# JERSEN SELF-HOSTING CONFIGURATION
# ============================================

# --------------------------------------------
# CORE SERVICES (Required)
# --------------------------------------------

# Clerk Authentication
# Get from: https://dashboard.clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# MongoDB Database
# Local: mongodb://localhost:27017
# Atlas: mongodb+srv://user:pass@cluster.mongodb.net/
MONGO_URI=mongodb://localhost:27017

# Separate database for user project data (optional, defaults to MONGO_URI)
# PROJECT_DB_URI=mongodb://localhost:27017

# E2B Sandbox
# Get from: https://e2b.dev/dashboard
E2B_API_KEY=e2b_xxxxx

# Google Gemini AI
# Get from: https://aistudio.google.com/
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyxxxxx
GEMINI_API_KEY=AIzaSyxxxxx

# App URL (your deployment URL)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --------------------------------------------
# OPTIONAL SERVICES
# --------------------------------------------

# Cloudflare R2 Storage
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=jersen-storage
PUBLIC_GATEWAY=https://your-r2-gateway.com

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# Vercel Integration (One-click deploy)
# Create your integration at https://vercel.com/dashboard/integrations/console
# Required scopes: user:read, deployments:read/write, projects:read/write
VCEL_CLIENT_ID=oac_xxxxx
VCEL_CLIENT_SECRET=xxxxx
VCEL_INTEGRATION_SLUG=your-integration-slug  # The URL slug of your Vercel integration
VCEL_REDIRECT_URI=https://your-domain.com/api/integrations/vercel/callback

# --------------------------------------------
# ADMINISTRATION
# --------------------------------------------

# Super Admin User ID (Clerk user ID)
# This user has access to /admin panel
SUPER_ADMIN_USER_ID=user_xxxxx
```

### Environment Variable Details

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (safe for client) | `pk_test_xxx` |
| `CLERK_SECRET_KEY` | Clerk secret key (server only) | `sk_test_xxx` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `E2B_API_KEY` | E2B API key for sandboxes | `e2b_xxx` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key | `AIzaSy...` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | `https://jersen.example.com` |
| `PUBLIC_GATEWAY` | R2 public CDN URL | `https://cdn.example.com` |
| `SUPER_ADMIN_USER_ID` | Clerk user ID for admin access | `user_xxx` |

---

## Deployment Options

### Option 1: Vercel (Recommended)

1. Fork the repository
2. Import to Vercel
3. Add environment variables
4. Deploy

**Vercel Configuration:**
```json
// vercel.json (optional)
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  jersen:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### Option 3: Node.js Server

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Start server
pnpm start

# Or with PM2
pm2 start npm --name "jersen" -- start
```

### Option 4: Railway/Render/Fly.io

Most PaaS platforms work out of the box:

1. Connect your GitHub repository
2. Set environment variables
3. Deploy

---

## Customization

### Custom E2B Template

The default template is `nextjs-developer-song-dev`. To use your own:

1. Create a template at [e2b.dev](https://e2b.dev)
2. Update the template ID:

```typescript
// app/api/projects/[id]/sandbox/route.ts
const TEMPLATE_ID = "your-custom-template";
```

### Custom AI Model

Jersen uses Google Gemini by default. To change:

```typescript
// lib/ai/gemini.ts
// Modify the model configuration
```

### Branding

Update branding in:
- `public/logo.png` - Logo image
- `app/layout.tsx` - Meta tags
- `components/` - UI components

### Platform Settings

Admin can configure platform-wide settings at `/admin/settings`:
- Sandbox timeout duration
- Max sandboxes per organization
- Rate limits
- Feature flags

---

## Troubleshooting

### Common Issues

#### Clerk Authentication Errors

```
Error: Clerk publishable key not found
```
**Solution:** Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set and starts with `pk_`

#### MongoDB Connection Errors

```
Error: MongoServerSelectionError
```
**Solutions:**
- Check connection string format
- Ensure MongoDB is running
- For Atlas: whitelist your IP address

#### E2B Sandbox Errors

```
Error: Failed to create sandbox
```
**Solutions:**
- Verify E2B API key is valid
- Check E2B account has available credits
- Template ID exists and is accessible

#### CORS Errors

```
Access-Control-Allow-Origin error
```
**Solutions:**
- Check origin is in allowed list
- For custom domains: add to project's `allowedOrigins`
- Verify OPTIONS preflight handler is working

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* pnpm dev
```

### Health Check

Verify services are working:

```bash
# Check API health
curl http://localhost:3000/api/health

# Check database connection
curl http://localhost:3000/api/health/db

# Check E2B connection
curl http://localhost:3000/api/health/e2b
```

---

## Security Considerations

### Production Checklist

- [ ] Use HTTPS in production
- [ ] Set strong MongoDB password
- [ ] Rotate API keys regularly
- [ ] Enable Clerk security features
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting (Upstash Redis)
- [ ] Use environment variables (never commit secrets)
- [ ] Enable database authentication
- [ ] Regular backups

### Secrets Management

For production, consider:
- Vercel Environment Variables
- AWS Secrets Manager
- HashiCorp Vault
- Doppler

---

## Support

- 📖 [Documentation](https://docs.jersen.app)
- 💬 [Discord Community](https://discord.gg/jersen)
- 🐛 [GitHub Issues](https://github.com/jersen-app/jersen.app/issues)
- 📧 [Email Support](mailto:support@jersen.app)
