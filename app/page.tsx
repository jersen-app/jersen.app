import { ArrowRight, Bot, Code2, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black dark:bg-black dark:text-white font-sans selection:bg-gray-200 dark:selection:bg-gray-800">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center px-6 py-32 text-center md:py-48 lg:py-64">
          <div className="mx-auto max-w-4xl space-y-8">
            <h1 className="text-5xl font-medium tracking-tight sm:text-7xl md:text-8xl">
              Build anything.
              <br />
              <span className="text-gray-500 dark:text-gray-400">
                We handle the rest.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl leading-relaxed">
              Jersen provides premium development services in Cambodia. From MVP to full-scale product, we turn your vision into reality with precision and speed.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="#"
                className="group inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-medium text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#ai-builder"
                className="group inline-flex h-12 items-center justify-center rounded-full border border-gray-200 px-8 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                Try AI Builder
              </Link>
            </div>
          </div>
        </section>

        {/* AI Builder Section */}
        <section id="ai-builder" className="px-6 py-24 sm:py-32 bg-black text-white dark:bg-white dark:text-black overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="relative mx-auto max-w-7xl text-center">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-xl dark:border-black/20 dark:bg-black/10">
              <Bot className="mr-2 h-4 w-4" />
              New Feature
            </div>
            <h2 className="mt-8 text-4xl font-medium tracking-tight sm:text-6xl">
              Build your MVP with AI.
              <br />
              <span className="text-gray-400 dark:text-gray-600">
                Before you commit.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 dark:text-gray-600">
              Use our AI Builder to visualize your idea and create a working prototype instantly. Once you're ready, submit it to our team for full-scale development.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="#"
                className="group inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-black transition-all hover:bg-gray-200 dark:bg-black dark:text-white dark:hover:bg-gray-800"
              >
                Launch AI Builder
                <Sparkles className="ml-2 h-5 w-5 text-purple-500 transition-transform group-hover:scale-110" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="services" className="px-6 py-24 sm:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900">
                  <Rocket className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium">Rapid Development</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We specialize in quick turnarounds for demos and MVPs without compromising on quality.
                </p>
              </div>
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium">Full-Stack Expertise</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  From complex backends to stunning frontends, our team handles the entire technology stack.
                </p>
              </div>
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium">Enterprise Grade</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Security, scalability, and performance are built into every product we deliver.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Showcase */}
        <section id="projects" className="px-6 py-24 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl space-y-16">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Selected Work</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  A glimpse into what we've built for our partners.
                </p>
              </div>
              <Link
                href="#"
                className="group inline-flex items-center text-sm font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                View all projects
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "FinTech Dashboard",
                  category: "Web Application",
                  description: "A comprehensive financial analytics platform for a leading bank in Cambodia.",
                  color: "bg-blue-50 dark:bg-blue-900/20"
                },
                {
                  title: "E-Commerce Mobile App",
                  category: "Mobile Development",
                  description: "Native iOS and Android application with seamless payment integration.",
                  color: "bg-emerald-50 dark:bg-emerald-900/20"
                },
                {
                  title: "Real Estate Portal",
                  category: "Platform",
                  description: "Property listing and management system with virtual tour capabilities.",
                  color: "bg-purple-50 dark:bg-purple-900/20"
                }
              ].map((project, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:shadow-lg dark:border-gray-800 dark:bg-black">
                  <div className={`aspect-video w-full ${project.color}`} />
                  <div className="p-6">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                      {project.category}
                    </div>
                    <h3 className="mb-2 text-xl font-medium">{project.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {project.description}
                    </p>
                    <div className="mt-6 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                      View Case Study
                      <ArrowRight className="ml-2 h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-12 dark:border-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Jersen. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-gray-500 hover:text-black dark:hover:text-white">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-black dark:hover:text-white">
              Terms
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-black dark:hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
