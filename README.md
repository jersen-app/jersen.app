# Jersen.app
xxxxxxxxxx
> **AI-powered full-stack app builder with built-in Auth, Database, and Storage providers**

Jersen is an open-source platform that lets users build full-stack web applications using AI. It provides instant preview in sandboxed environments and includes built-in backend services (Authentication, Database, Storage) so users can build complete apps without managing infrastructure.

![Jersen Logo](/logo.png)

## ✨ Features

### 🤖 AI Builder
- **Natural language to code**: Describe what you want, get a working app
- **Live preview**: Instant preview in E2B sandboxed environments
- **Iterative development**: Chat with AI to refine and improve your app
- **Multi-file support**: Full project structure with routing, components, and APIs

### 🔐 Built-in Providers
- **Authentication**: OAuth login (Google, GitHub, etc.) via Clerk - users get auth without setup
- **Database**: MongoDB-based REST API - no database configuration needed
- **Storage**: Cloudflare R2 storage with public CDN - file uploads just work

### 🚀 Deployment
- **One-click Vercel deploy**: Deploy directly from the builder
- **Build validation**: Automatic build check before deployment
- **CORS handling**: Automatic origin whitelisting for deployed apps

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/docs), Google Gemini |
| Database | MongoDB (Mongoose) |
| Auth | [Clerk](https://clerk.com/) |
| Storage | Cloudflare R2 |
| Sandbox | [E2B](https://e2b.dev/) |
| Rate Limiting | [Upstash Redis](https://upstash.com/) |
| UI | Radix UI, Lucide React, Sonner |

## 📦 Self-Hosting Guide

### Prerequisites

- Node.js 18+ or Bun
- MongoDB instance (local or Atlas)
- pnpm (recommended) or npm

### Required Services

You'll need accounts/credentials for:

| Service | Purpose | Required |
|---------|---------|----------|
| [Clerk](https://clerk.com/) | User authentication for Jersen platform | ✅ Yes |
| [MongoDB](https://mongodb.com/) | Platform database + user project data | ✅ Yes |
| [E2B](https://e2b.dev/) | Sandboxed preview environments | ✅ Yes |
| [Google AI](https://ai.google.dev/) | Gemini API for AI code generation | ✅ Yes |
| [Cloudflare R2](https://cloudflare.com/r2/) | File storage for user projects | Optional |
| [Upstash Redis](https://upstash.com/) | Rate limiting | Optional |
| [Vercel](https://vercel.com/) | One-click deployment for user projects | Optional |

### Environment Variables

Create a `.env.local` file with the following:

```bash
# ===================
# REQUIRED
# ===================

# Clerk Authentication (for Jersen platform users)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# MongoDB
MONGO_URI=mongodb://localhost:27017
# Or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/

# E2B Sandbox (for live previews)
E2B_API_KEY=e2b_xxxxx

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyxxxxx
GEMINI_API_KEY=AIzaSyxxxxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ===================
# OPTIONAL
# ===================

# Cloudflare R2 Storage (for user file uploads)
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=jersen-storage
PUBLIC_GATEWAY=https://your-r2-public-gateway.com

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# Vercel Integration (for one-click deploy)
# Create your integration at https://vercel.com/dashboard/integrations/console
VCEL_CLIENT_ID=oac_xxxxx
VCEL_CLIENT_SECRET=xxxxx
VCEL_INTEGRATION_SLUG=your-integration-slug  # The URL slug of your Vercel integration
VCEL_REDIRECT_URI=https://your-domain.com/api/integrations/vercel/callback

# Admin
SUPER_ADMIN_USER_ID=user_xxxxx
```

### Installation

```bash
# Clone the repository
git clone https://github.com/jersen-app/jersen.app.git
cd jersen.app

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Deployment

#### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jersen-app/jersen.app)

1. Click the button above
2. Add all environment variables
3. Deploy!

#### Deploy with Docker

```bash
# Build the image
docker build -t jersen-app .

# Run with environment variables
docker run -p 3000:3000 --env-file .env.local jersen-app
```

#### Deploy to any Node.js host

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## 📁 Project Structure

```
jersen.app/
├── app/
│   ├── (marketing)/     # Public landing pages
│   ├── admin/           # Admin dashboard
│   ├── api/
│   │   ├── providers/   # Auth, Database, Storage APIs for user projects
│   │   ├── projects/    # Project management APIs
│   │   └── integrations/# Vercel integration
│   ├── auth/            # OAuth callback handlers
│   └── dashboard/       # User dashboard & AI builder
├── components/
│   ├── chat/            # AI chat interface components
│   ├── ui/              # Reusable UI components (shadcn)
│   └── ...
├── lib/
│   ├── ai/              # AI prompts and provider docs
│   ├── storage/         # R2 storage utilities
│   └── ...
├── models/              # MongoDB/Mongoose models
└── ...
```

## 🔌 Provider APIs

When users build apps with Jersen, their apps can use these APIs:

### Authentication API
```
GET  /auth/oauth              # OAuth login page
GET  /auth/oauth/callback     # OAuth callback
GET  /api/providers/auth/session  # Get current user session
```

### Database API
```
POST   /api/providers/database  # Insert document
GET    /api/providers/database  # Find documents
PATCH  /api/providers/database  # Update documents
DELETE /api/providers/database  # Delete documents
```

### Storage API
```
POST   /api/providers/storage   # Upload file
GET    /api/providers/storage   # Get file URL
DELETE /api/providers/storage   # Delete file
```

## 🔧 Configuration

### E2B Sandbox Template

Jersen uses a custom E2B template for Next.js development. The template ID is configured in:
```typescript
// app/api/projects/[id]/sandbox/route.ts
const TEMPLATE_ID = "nextjs-developer-song-dev";
```

To use your own template, create one at [e2b.dev](https://e2b.dev/) and update this value.

### Clerk OAuth Providers

Configure OAuth providers in your Clerk dashboard:
1. Go to Clerk Dashboard → User & Authentication → Social Connections
2. Enable desired providers (Google, GitHub, etc.)
3. Users building apps on Jersen will be able to login via these providers

### CORS Configuration

User project origins are automatically whitelisted when:
- A sandbox is created (E2B URLs)
- A project is deployed to Vercel

Manual origin management:
```
POST   /api/projects/[id]/allowed-origins  # Add allowed origin
GET    /api/projects/[id]/allowed-origins  # List allowed origins
DELETE /api/projects/[id]/allowed-origins  # Remove allowed origin
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [E2B](https://e2b.dev/) for sandboxed environments
- [Vercel](https://vercel.com/) for the AI SDK and hosting
- [Clerk](https://clerk.com/) for authentication
- [Cloudflare](https://cloudflare.com/) for R2 storage

## 📞 Support

- 📧 Email: support@jersen.app
- 🐛 Issues: [GitHub Issues](https://github.com/jersen-app/jersen.app/issues)
- 💬 Discord: [Join our community](https://discord.gg/jersen)

---

Made with ❤️ by [Jersen](https://jersen.app)
XXXXX
