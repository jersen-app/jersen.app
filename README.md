# Jersen.app

Jersen is a premium software development agency based in Cambodia, specializing in turning visions into reality with precision and speed. This repository contains the source code for the Jersen.app platform, which features an innovative **AI Builder** allowing clients to visualize and prototype their ideas instantly.

![Jersen Logo](/logo.png)

## Features

-   **AI Builder**: An interactive tool powered by the Vercel AI SDK and Google Generative AI that lets users generate working prototypes of their application ideas.
-   **Agency Services**: Information about Jersen's full-scale development services, from MVP to enterprise-grade products.
-   **Modern UI/UX**: A sleek, minimalist design using Tailwind CSS v4 and Radix UI primitives, supporting both dark and light modes.
-   **Secure Authentication**: Integrated with Clerk for robust user management.
-   **Database**: Powered by MongoDB (via Mongoose).

## Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: TypeScript
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **AI**: [Vercel AI SDK](https://sdk.vercel.ai/docs), Google Generative AI
-   **Database**: MongoDB (Mongoose)
-   **Auth**: [Clerk](https://clerk.com/)
-   **Storage**: AWS S3
-   **UI Components**: Radix UI, Lucide React, Sonner, Vaul

## Getting Started

First, install dependencies:

```bash
npm install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `app/`: Next.js App Router pages and layouts.
    -   `(marketing)/`: Public-facing marketing pages.
    -   `dashboard/`: User dashboard for managing projects.
    -   `api/`: Backend API routes.
-   `components/`: Reusable UI components.
-   `lib/`: Utility functions, database connections, and shared logic.
-   `models/`: Mongoose database models.
-   `public/`: Static assets.

## Learn More

To learn more about the technologies used in this project:

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Vercel AI SDK](https://sdk.vercel.ai/docs)
-   [Tailwind CSS](https://tailwindcss.com/docs)
