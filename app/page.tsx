import { ArrowRight, Code2, Rocket, ShieldCheck } from "lucide-react";
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
                href="#"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 px-8 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                View Our Work
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-24 sm:py-32 border-t border-gray-100 dark:border-gray-900">
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
