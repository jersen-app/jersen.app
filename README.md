# Jersen.app

> **AI-powered full-stack app builder with built-in Auth, Database, and Storage providers**

Jersen is an open-source platform that lets users build full-stack web applications using AI. It provides instant preview in sandboxed environments and includes built-in backend services (Authentication, Database, Storage) so users can build complete apps without managing infrastructure.

![Jersen Logo](/public/logo.png)

> **[👀 View Platform Tour & Screenshots](docs/PLATFORM_TOUR.md)**

## ✨ Features

### 🤖 AI Builder
- **Natural language to code**: Describe what you want, get a working app
- **Live preview**: Instant preview in E2B sandboxed environments
- **Iterative development**: Chat with AI to refine and improve your app
- **Multi-file support**: Full project structure with routing, components, and APIs

### 🛡️ Super Admin Control
- **Full Platform Management**: Built-in admin dashboard to manage users, organizations, and projects.
- **System Overview**: Monitor platform usage, active sandboxes, and resource consumption.
- **User Administration**: Manage roles, permissions, and access levels.

### 🤝 Development Services & Expert Help
Jersen originated as a premium development service platform. It includes a unique "Request Help" feature:
- **Request Expert Assistance**: Users can request help directly from the builder interface.
- **Hybrid Building**: Combine AI generation with human expert intervention for complex features.
- **Production Requests**: Users can submit their projects for production review and deployment assistance.

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
| Framework | [Next.js 15+](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/docs), Google Gemini |
| Database | MongoDB (Mongoose) |
| Auth | [Clerk](https://clerk.com/) |
| Storage | Cloudflare R2 |
| Sandbox | [E2B](https://e2b.dev/) |
| Rate Limiting | [Upstash Redis](https://upstash.com/) |
| UI | Radix UI, Lucide React, Sonner |

## 🚀 Getting Started

Follow these steps to run the Jersen platform locally.

### Prerequisites

- **Node.js 20+** (Recommended)
- **pnpm** (Recommended) or npm
- **MongoDB** instance (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jersen-app/jersen.app.git
   cd jersen.app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with the required keys.
   
   ```bash
   # .env.local
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # MongoDB
   MONGO_URI=mongodb://localhost:27017/jersen
   
   # E2B Sandbox
   E2B_API_KEY=e2b_...
   
   # Google Gemini AI
   GOOGLE_GENERATIVE_AI_API_KEY=...
   
   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   
   > See [SELF-HOSTING.md](docs/SELF-HOSTING.md) for a complete list of environment variables.

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) to see the platform.

## 📂 Project Structure

```
jersen.app/
├── app/                 # Next.js App Router pages and API routes
│   ├── (marketing)/     # Landing page and marketing routes
│   ├── admin/           # Admin dashboard
│   ├── api/             # Backend API routes
│   ├── auth/            # Authentication routes
│   ├── dashboard/       # User dashboard
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── chat/            # AI chat interface components
│   ├── dashboard/       # Dashboard components
│   └── ui/              # Reusable UI components (shadcn/ui)
├── lib/                 # Utility functions and libraries
│   ├── ai/              # AI logic and prompts
│   ├── db.ts            # Database connection
│   └── utils.ts         # Helper functions
├── models/              # Mongoose data models
├── public/              # Static assets
└── docs/                # Documentation
```

## 📖 Documentation

- [Self-Hosting Guide](docs/SELF-HOSTING.md) - Detailed instructions for self-hosting.
- [Provider APIs](docs/PROVIDERS.md) - Documentation for the APIs available to user-built apps.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
