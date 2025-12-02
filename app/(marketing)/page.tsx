import { 
  ArrowRight, 
  Bot, 
  Code2, 
  Rocket, 
  ShieldCheck, 
  Sparkles, 
  Database, 
  Lock, 
  Cloud, 
  Zap, 
  Globe, 
  FileCode, 
  BookOpen, 
  Github, 
  Play,
  CheckCircle2,
  Users,
  Building2,
  MessageSquare
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black dark:bg-black dark:text-white font-sans selection:bg-gray-200 dark:selection:bg-gray-800">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center px-6 py-32 text-center md:py-48 lg:py-56">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(0,0,0,0))]" />
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-sm font-medium backdrop-blur-sm dark:border-gray-800 dark:bg-black/80">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Premium Development Services in Cambodia
            </div>
            <h1 className="text-5xl font-medium tracking-tight sm:text-7xl md:text-8xl">
              Build anything.
              <br />
              <span className="bg-gradient-to-r from-gray-600 to-gray-400 bg-clip-text text-transparent dark:from-gray-400 dark:to-gray-600">
                Ship faster.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl leading-relaxed">
              Jersen transforms your vision into reality. From rapid MVPs to full-scale products, 
              we deliver precision engineering with our AI-powered development platform.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:scale-105 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Start Building Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#ai-builder"
                className="group inline-flex h-12 items-center justify-center rounded-full border border-gray-200 px-8 text-sm font-medium transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-gray-900 dark:hover:border-gray-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              No credit card required • Free tier available
            </p>
          </div>
        </section>

        {/* What is Jersen */}
        <section className="px-6 py-24 sm:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900">
                  What is Jersen?
                </div>
                <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">
                  Your complete
                  <br />
                  development partner
                </h2>
                <div className="space-y-6 text-lg text-gray-600 dark:text-gray-400">
                  <p>
                    <strong className="text-black dark:text-white">Jersen is a development agency + AI platform</strong> based in Cambodia. 
                    We combine human expertise with cutting-edge AI to deliver exceptional software products.
                  </p>
                  <p>
                    Use our <strong className="text-black dark:text-white">AI Builder</strong> to prototype your ideas instantly, 
                    then seamlessly transition to our expert team for production-ready development.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">50+</div>
                    <div className="text-sm text-gray-500">Projects Delivered</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">2 weeks</div>
                    <div className="text-sm text-gray-500">Average MVP Time</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">24/7</div>
                    <div className="text-sm text-gray-500">AI Builder Available</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">100%</div>
                    <div className="text-sm text-gray-500">Code Ownership</div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-8 lg:p-12">
                  <div className="h-full w-full rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                      <span className="ml-2 text-xs text-gray-400">Jersen AI Builder</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tl-none bg-gray-100 dark:bg-gray-800 p-3 text-sm">
                          Build me a todo app with Google login
                        </div>
                      </div>
                      <div className="flex items-start gap-3 justify-end">
                        <div className="flex-1 rounded-2xl rounded-tr-none bg-black dark:bg-white p-3 text-sm text-white dark:text-black">
                          Creating your app with Auth, Database, and Storage providers...
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Builder Section */}
        <section id="ai-builder" className="px-6 py-24 sm:py-32 bg-black text-white dark:bg-white dark:text-black overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-xl dark:border-black/20 dark:bg-black/10">
                <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
                AI-Powered Development
              </div>
              <h2 className="mt-8 text-4xl font-medium tracking-tight sm:text-6xl">
                Describe it. Build it.
                <br />
                <span className="text-gray-400 dark:text-gray-600">
                  Deploy it.
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 dark:text-gray-600">
                Our AI Builder creates fully functional web applications from natural language descriptions. 
                Complete with authentication, database, and file storage—ready to deploy in minutes.
              </p>
            </div>

            {/* AI Builder Features */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
              {[
                {
                  icon: Lock,
                  title: "Authentication",
                  description: "Built-in OAuth with Google, GitHub, Facebook, and TikTok login"
                },
                {
                  icon: Database,
                  title: "Database",
                  description: "MongoDB-powered REST API for seamless data storage"
                },
                {
                  icon: Cloud,
                  title: "File Storage",
                  description: "Cloudflare R2 storage with global CDN delivery"
                },
                {
                  icon: Zap,
                  title: "Instant Preview",
                  description: "Live sandbox environment to test your app immediately"
                },
                {
                  icon: Globe,
                  title: "One-Click Deploy",
                  description: "Deploy to Vercel with a single click when ready"
                },
                {
                  icon: FileCode,
                  title: "Export Code",
                  description: "Download the complete source code—you own everything"
                }
              ].map((feature, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10 dark:border-black/10 dark:bg-black/5 dark:hover:bg-black/10">
                  <feature.icon className="h-8 w-8 mb-4 text-purple-400" />
                  <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Link
                href="/dashboard"
                className="group inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-black transition-all hover:bg-gray-200 hover:scale-105 dark:bg-black dark:text-white dark:hover:bg-gray-800"
              >
                Launch AI Builder
                <Sparkles className="ml-2 h-5 w-5 text-purple-500 transition-transform group-hover:scale-110" />
              </Link>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="px-6 py-24 sm:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900">
                Our Services
              </div>
              <h2 className="mt-6 text-4xl font-medium tracking-tight sm:text-5xl">
                From idea to production
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                Whether you need a quick prototype or a full-scale enterprise solution, 
                we have the expertise to deliver.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group rounded-3xl border border-gray-200 bg-white p-8 transition-all hover:shadow-xl hover:border-gray-300 dark:border-gray-800 dark:bg-black dark:hover:border-gray-700">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-6">
                  <Rocket className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">MVP Development</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Launch your product fast. We build functional MVPs in 2-4 weeks, 
                  perfect for validating ideas and securing funding.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Rapid 2-4 week delivery
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Production-ready code
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Scalable architecture
                  </li>
                </ul>
              </div>

              <div className="group rounded-3xl border border-gray-200 bg-white p-8 transition-all hover:shadow-xl hover:border-gray-300 dark:border-gray-800 dark:bg-black dark:hover:border-gray-700">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 mb-6">
                  <Code2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">Full-Stack Development</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  End-to-end development from database design to polished UI. 
                  We handle the entire technology stack.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    React, Next.js, Node.js
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Mobile (React Native)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Cloud infrastructure
                  </li>
                </ul>
              </div>

              <div className="group rounded-3xl border border-gray-200 bg-white p-8 transition-all hover:shadow-xl hover:border-gray-300 dark:border-gray-800 dark:bg-black dark:hover:border-gray-700">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/20 mb-6">
                  <ShieldCheck className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">Enterprise Solutions</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Mission-critical systems built with security, compliance, 
                  and scalability at the core.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Security-first design
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    High availability
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Ongoing support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Showcase */}
        <section id="projects" className="px-6 py-24 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl space-y-16">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900">
                  Showcase
                </div>
                <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Selected Work</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  A glimpse into what we've built for our partners.
                </p>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "FinTech Dashboard",
                  category: "Web Application",
                  description: "A comprehensive financial analytics platform for a leading bank in Cambodia.",
                  color: "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40",
                  tech: ["Next.js", "PostgreSQL", "Chart.js"]
                },
                {
                  title: "E-Commerce Platform",
                  category: "Mobile & Web",
                  description: "Full-stack marketplace with real-time inventory and payment processing.",
                  color: "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40",
                  tech: ["React Native", "Node.js", "Stripe"]
                },
                {
                  title: "Healthcare Portal",
                  category: "Enterprise",
                  description: "Patient management system with telemedicine capabilities and HIPAA compliance.",
                  color: "bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40",
                  tech: ["React", "AWS", "MongoDB"]
                },
                {
                  title: "Real Estate Platform",
                  category: "Marketplace",
                  description: "Property listing and management system with virtual tour capabilities.",
                  color: "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40",
                  tech: ["Next.js", "Mapbox", "Prisma"]
                },
                {
                  title: "Education LMS",
                  category: "SaaS",
                  description: "Learning management system with video streaming and progress tracking.",
                  color: "bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40",
                  tech: ["React", "Node.js", "Redis"]
                },
                {
                  title: "Logistics Tracker",
                  category: "IoT & Mobile",
                  description: "Real-time fleet tracking with route optimization and delivery management.",
                  color: "bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/40 dark:to-cyan-800/40",
                  tech: ["React Native", "Firebase", "Maps API"]
                }
              ].map((project, i) => (
                <div key={i} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white transition-all hover:shadow-xl dark:border-gray-800 dark:bg-black">
                  <div className={`aspect-video w-full ${project.color} flex items-center justify-center`}>
                    <div className="h-16 w-16 rounded-2xl bg-white/80 dark:bg-black/80 backdrop-blur-sm" />
                  </div>
                  <div className="p-6">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                      {project.category}
                    </div>
                    <h3 className="mb-2 text-xl font-medium">{project.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map((tech, j) => (
                        <span key={j} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Documentation Section */}
        <section id="docs" className="px-6 py-24 sm:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Documentation
                </div>
                <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">
                  Everything you need
                  <br />
                  to get started
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Comprehensive guides, API references, and examples to help you 
                  build with Jersen's AI platform and integrate our services.
                </p>
                <div className="space-y-4">
                  <Link href="/docs" className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center dark:bg-blue-900/20">
                      <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Quick Start Guide</div>
                      <div className="text-sm text-gray-500">Get up and running in 5 minutes</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </Link>
                  <Link href="/docs/providers" className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center dark:bg-emerald-900/20">
                      <Database className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Provider APIs</div>
                      <div className="text-sm text-gray-500">Auth, Database, and Storage references</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </Link>
                  <Link href="/docs/deploy" className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700">
                    <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center dark:bg-purple-900/20">
                      <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Deployment Guide</div>
                      <div className="text-sm text-gray-500">Deploy to Vercel, export code</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-3xl bg-gray-900 p-6 text-white dark:bg-gray-100 dark:text-black overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs text-gray-500">lib/jersen-db.ts</span>
                  </div>
                  <pre className="text-sm overflow-x-auto">
                    <code className="text-gray-300 dark:text-gray-700">{`// Jersen Database - Simple REST API
import { find, insertOne } from '@/lib/jersen-db';

// Query documents
const todos = await find('todos', { 
  userId: user.id 
});

// Insert document
await insertOne('todos', {
  title: 'Build with Jersen',
  completed: false
});`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="px-6 py-24 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 lg:p-16 dark:border-gray-800 dark:bg-black">
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900">
                    <Github className="mr-2 h-4 w-4" />
                    Open Source
                  </div>
                  <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
                    Self-hosting coming soon
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    We're building Jersen to be fully open source and self-hostable. 
                    Deploy the entire platform on your own infrastructure with complete control.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>Full source code access</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>Docker deployment ready</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>Bring your own AI providers</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>Community-driven development</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link
                      href="https://github.com/jersen-app"
                      target="_blank"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 px-6 text-sm font-medium transition-all hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      Star on GitHub
                    </Link>
                    <Link
                      href="/waitlist"
                      className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                      Join Waitlist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="relative hidden lg:block">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl rounded-full" />
                  <div className="relative grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <Users className="h-8 w-8 mb-3 text-purple-500" />
                        <div className="text-2xl font-bold">1000+</div>
                        <div className="text-sm text-gray-500">Waitlist signups</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <Building2 className="h-8 w-8 mb-3 text-blue-500" />
                        <div className="text-2xl font-bold">Cambodia</div>
                        <div className="text-sm text-gray-500">Based & operated</div>
                      </div>
                    </div>
                    <div className="space-y-4 pt-8">
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <Code2 className="h-8 w-8 mb-3 text-emerald-500" />
                        <div className="text-2xl font-bold">MIT</div>
                        <div className="text-sm text-gray-500">License (planned)</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <Sparkles className="h-8 w-8 mb-3 text-pink-500" />
                        <div className="text-2xl font-bold">AI First</div>
                        <div className="text-sm text-gray-500">Development approach</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="px-6 py-24 sm:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-medium tracking-tight sm:text-5xl mb-6">
              Ready to build
              <br />
              something amazing?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Whether you want to try our AI Builder or discuss a custom project, 
              we're here to help turn your vision into reality.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex h-14 items-center justify-center rounded-full bg-black px-8 text-base font-medium text-white transition-all hover:bg-gray-800 hover:scale-105 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="mailto:hello@jersen.app"
                className="group inline-flex h-14 items-center justify-center rounded-full border border-gray-200 px-8 text-base font-medium transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-16 dark:border-gray-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="space-y-4">
              <div className="text-xl font-bold">Jersen</div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Premium development services in Cambodia. From MVP to full-scale product, 
                we turn your vision into reality.
              </p>
              <div className="flex gap-4">
                <Link href="https://github.com/jersen-app" target="_blank" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  <Github className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-medium">Product</div>
              <div className="space-y-3 text-sm">
                <Link href="/dashboard" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">AI Builder</Link>
                <Link href="#services" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Services</Link>
                <Link href="#projects" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Showcase</Link>
                <Link href="/pricing" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Pricing</Link>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-medium">Resources</div>
              <div className="space-y-3 text-sm">
                <Link href="/docs" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Documentation</Link>
                <Link href="/docs/providers" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">API Reference</Link>
                <Link href="https://github.com/jersen-app" target="_blank" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">GitHub</Link>
                <Link href="/changelog" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Changelog</Link>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-medium">Company</div>
              <div className="space-y-3 text-sm">
                <Link href="/about" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">About</Link>
                <Link href="mailto:hello@jersen.app" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Contact</Link>
                <Link href="/privacy" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Jersen. All rights reserved.
            </p>
            <p className="text-sm text-gray-500">
              Made with ❤️ in Cambodia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
