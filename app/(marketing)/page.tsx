"use client";

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
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { DottedMap } from "@/components/ui/dotted-map";
import { MorphingText } from "@/components/ui/morphing-text";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "motion/react";

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black dark:bg-black dark:text-white font-sans selection:bg-gray-200 dark:selection:bg-gray-800">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16 text-center md:pt-48 md:pb-32 lg:pt-56 lg:pb-40 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(0,0,0,0))]" />
          
          {/* Dotted Map Background */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 dark:opacity-30 pointer-events-none">
            <div className="w-full max-w-6xl h-[500px] md:h-[600px]">
              <DottedMap 
                dotRadius={0.4}
                dotColor="currentColor"
                markerColor="#10b981"
                markers={[
                  { lat: 11.5564, lng: 104.9282, size: 0.8 }, // Phnom Penh, Cambodia
                  { lat: 37.7749, lng: -122.4194, size: 0.6 }, // San Francisco
                  { lat: 51.5074, lng: -0.1278, size: 0.6 }, // London
                  { lat: 35.6762, lng: 139.6503, size: 0.6 }, // Tokyo
                  { lat: 1.3521, lng: 103.8198, size: 0.6 }, // Singapore
                  { lat: -33.8688, lng: 151.2093, size: 0.6 }, // Sydney
                ]}
              />
            </div>
          </div>

          <motion.div 
            className="relative z-10 mx-auto max-w-5xl space-y-6 sm:space-y-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div 
              className="group relative inline-flex items-center justify-center rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-sm px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]"
              variants={itemVariants}
            >
              <span
                className={cn(
                  "animate-gradient absolute inset-0 block size-full rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]"
                )}
                style={{
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "destination-out",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "subtract",
                }}
              />
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <AnimatedGradientText className="text-xs sm:text-sm font-medium">
                Premium Development Service in Cambodia
              </AnimatedGradientText>
            </motion.div>
            <motion.div variants={itemVariants} className="mb-4">
              <MorphingText 
                texts={["Build.", "Ship.", "Scale."]} 
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl h-16 sm:h-24 md:h-28 lg:h-36"
              />
            </motion.div>
            <motion.p 
              className="mx-auto max-w-2xl text-base sm:text-lg text-gray-700 dark:text-gray-300 md:text-xl leading-relaxed px-4 py-3 rounded-2xl bg-white/70 dark:bg-black/70 backdrop-blur-sm mt-8"
              variants={itemVariants}
            >
              Jersen transforms your vision into reality. From rapid MVPs to full-scale products, 
              we deliver precision engineering with our AI-powered development platform.
            </motion.p>
            <motion.div 
              className="flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row"
              variants={itemVariants}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/dashboard">
                  <ShimmerButton className="h-12 w-full sm:w-auto px-8 text-sm font-medium">
                    Start Building Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </ShimmerButton>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="#ai-builder"
                  className="group inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-gray-200 px-8 text-sm font-medium transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-gray-900 dark:hover:border-gray-700"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Link>
              </motion.div>
            </motion.div>
            <motion.p 
              className="text-xs sm:text-sm text-gray-500"
              variants={itemVariants}
            >
              No credit card required • Free tier available
            </motion.p>
          </motion.div>
        </section>

        {/* What is Jersen */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-24 items-center">
              <motion.div 
                className="space-y-6 sm:space-y-8"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={containerVariants}
              >
                <motion.div 
                  className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900"
                  variants={itemVariants}
                >
                  What is Jersen?
                </motion.div>
                <motion.h2 
                  className="text-3xl sm:text-4xl font-medium tracking-tight lg:text-5xl"
                  variants={itemVariants}
                >
                  Your complete
                  <br />
                  development partner
                </motion.h2>
                <motion.div 
                  className="space-y-4 sm:space-y-6 text-base sm:text-lg text-gray-600 dark:text-gray-400"
                  variants={itemVariants}
                >
                  <p>
                    <strong className="text-black dark:text-white">Jersen is a development agency + AI platform</strong> based in Cambodia. 
                    We combine human expertise with cutting-edge AI to deliver exceptional software products.
                  </p>
                  <p>
                    Use our <strong className="text-black dark:text-white">AI Builder</strong> to prototype your ideas instantly, 
                    then seamlessly transition to our expert team for production-ready development.
                  </p>
                </motion.div>
                <motion.div 
                  className="grid grid-cols-2 gap-4 sm:gap-6"
                  variants={containerVariants}
                >
                  {[
                    { value: "50+", label: "Projects Delivered" },
                    { value: "2 weeks", label: "Average MVP Time" },
                    { value: "24/7", label: "AI Builder Available" },
                    { value: "100%", label: "Code Ownership" },
                  ].map((stat, i) => (
                    <motion.div 
                      key={i} 
                      className="space-y-1 sm:space-y-2"
                      variants={itemVariants}
                    >
                      <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              <motion.div 
                className="relative hidden sm:block"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-6 sm:p-8 lg:p-12">
                  <motion.div 
                    className="h-full w-full rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                      <span className="ml-2 text-xs text-gray-400">Jersen AI Builder</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <motion.div 
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tl-none bg-gray-100 dark:bg-gray-800 p-3 text-sm">
                          Build me a todo app with Google login
                        </div>
                      </motion.div>
                      <motion.div 
                        className="flex items-start gap-3 justify-end"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                      >
                        <div className="flex-1 rounded-2xl rounded-tr-none bg-black dark:bg-white p-3 text-sm text-white dark:text-black">
                          Creating your app with Auth, Database, and Storage providers...
                        </div>
                      </motion.div>
                      <motion.div 
                        className="flex gap-2 mt-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.1, duration: 0.5 }}
                      >
                        <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                            initial={{ width: 0 }}
                            whileInView={{ width: "75%" }}
                            viewport={{ once: true }}
                            transition={{ delay: 1.3, duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* AI Builder Section */}
        <section id="ai-builder" className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 bg-black text-white dark:bg-white dark:text-black overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="relative mx-auto max-w-7xl">
            <motion.div 
              className="text-center mb-10 sm:mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={containerVariants}
            >
              <motion.div 
                className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs sm:text-sm font-medium backdrop-blur-xl dark:border-black/20 dark:bg-black/10"
                variants={itemVariants}
              >
                <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
                AI-Powered Development
              </motion.div>
              <motion.h2 
                className="mt-6 sm:mt-8 text-3xl sm:text-4xl font-medium tracking-tight lg:text-6xl"
                variants={itemVariants}
              >
                Describe it. Build it.
                <br />
                <span className="text-gray-400 dark:text-gray-600">
                  Deploy it.
                </span>
              </motion.h2>
              <motion.p 
                className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-gray-400 dark:text-gray-600 px-2"
                variants={itemVariants}
              >
                Our AI Builder creates fully functional web applications from natural language descriptions. 
                Complete with authentication, database, and file storage—ready to deploy in minutes.
              </motion.p>
            </motion.div>

            {/* AI Builder Features */}
            <motion.div 
              className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-10 sm:mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={containerVariants}
            >
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
                <motion.div 
                  key={i} 
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10 dark:border-black/10 dark:bg-black/5 dark:hover:bg-black/10"
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="h-8 w-8 mb-4 text-purple-400" />
                  </motion.div>
                  <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/dashboard">
                  <ShimmerButton 
                    className="h-14 px-8 text-base font-medium"
                    background="rgba(255, 255, 255, 1)"
                    shimmerColor="#a855f7"
                  >
                    <span className="text-black dark:text-white">Launch AI Builder</span>
                    <Sparkles className="ml-2 h-5 w-5 text-purple-500 transition-transform group-hover:scale-110" />
                  </ShimmerButton>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <motion.div 
              className="text-center mb-10 sm:mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={containerVariants}
            >
              <motion.div 
                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium dark:border-gray-800 dark:bg-gray-900"
                variants={itemVariants}
              >
                Our Services
              </motion.div>
              <motion.h2 
                className="mt-4 sm:mt-6 text-3xl sm:text-4xl font-medium tracking-tight lg:text-5xl"
                variants={itemVariants}
              >
                From idea to production
              </motion.h2>
              <motion.p 
                className="mx-auto mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg text-gray-600 dark:text-gray-400 px-2"
                variants={itemVariants}
              >
                Whether you need a quick prototype or a full-scale enterprise solution, 
                we have the expertise to deliver.
              </motion.p>
            </motion.div>

            <motion.div 
              className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={containerVariants}
            >
              {[
                {
                  icon: Rocket,
                  title: "MVP Development",
                  description: "Launch your product fast. We build functional MVPs in 2-4 weeks, perfect for validating ideas and securing funding.",
                  color: "bg-blue-50 dark:bg-blue-900/20",
                  iconColor: "text-blue-600 dark:text-blue-400",
                  features: ["Rapid 2-4 week delivery", "Production-ready code", "Scalable architecture"]
                },
                {
                  icon: Code2,
                  title: "Full-Stack Development",
                  description: "End-to-end development from database design to polished UI. We handle the entire technology stack.",
                  color: "bg-emerald-50 dark:bg-emerald-900/20",
                  iconColor: "text-emerald-600 dark:text-emerald-400",
                  features: ["React, Next.js, Node.js", "Mobile (React Native)", "Cloud infrastructure"]
                },
                {
                  icon: ShieldCheck,
                  title: "Enterprise Solutions",
                  description: "Mission-critical systems built with security, compliance, and scalability at the core.",
                  color: "bg-purple-50 dark:bg-purple-900/20",
                  iconColor: "text-purple-600 dark:text-purple-400",
                  features: ["Security-first design", "High availability", "Ongoing support"]
                }
              ].map((service, i) => (
                <motion.div 
                  key={i}
                  className="group rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 transition-all hover:shadow-xl hover:border-gray-300 dark:border-gray-800 dark:bg-black dark:hover:border-gray-700"
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div 
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${service.color} mb-6`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <service.icon className={`h-7 w-7 ${service.iconColor}`} />
                  </motion.div>
                  <h3 className="text-xl font-medium mb-3">{service.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {service.description}
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {service.features.map((feature, j) => (
                      <motion.li 
                        key={j}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 * j + 0.3 }}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Projects Showcase */}
        <section id="projects" className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl space-y-10 sm:space-y-16">
            <motion.div 
              className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={containerVariants}
            >
              <motion.div className="space-y-2" variants={itemVariants}>
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs sm:text-sm font-medium dark:border-gray-800 dark:bg-gray-900">
                  Showcase
                </div>
                <h2 className="text-2xl sm:text-3xl font-medium tracking-tight lg:text-4xl">Selected Work</h2>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                  A glimpse into what we&apos;ve built for our partners.
                </p>
              </motion.div>
            </motion.div>

            <motion.div 
              className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={containerVariants}
            >
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
                <motion.div 
                  key={i} 
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-black"
                  variants={itemVariants}
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div 
                    className={`aspect-video w-full ${project.color} flex items-center justify-center overflow-hidden`}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                  >
                    <motion.div 
                      className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-black/80 backdrop-blur-sm"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.div>
                  <div className="p-4 sm:p-6">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                      {project.category}
                    </div>
                    <h3 className="mb-2 text-xl font-medium">{project.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map((tech, j) => (
                        <motion.span 
                          key={j} 
                          className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          whileHover={{ scale: 1.1 }}
                        >
                          {tech}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Documentation Section */}
        <section id="docs" className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 border-t border-gray-100 dark:border-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
              <motion.div 
                className="space-y-6 sm:space-y-8"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={containerVariants}
              >
                <motion.div 
                  className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs sm:text-sm font-medium dark:border-gray-800 dark:bg-gray-900"
                  variants={itemVariants}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Documentation
                </motion.div>
                <motion.h2 
                  className="text-3xl sm:text-4xl font-medium tracking-tight lg:text-5xl"
                  variants={itemVariants}
                >
                  Everything you need
                  <br />
                  to get started
                </motion.h2>
                <motion.p 
                  className="text-base sm:text-lg text-gray-600 dark:text-gray-400"
                  variants={itemVariants}
                >
                  Comprehensive guides, API references, and examples to help you 
                  build with Jersen&apos;s AI platform and integrate our services.
                </motion.p>
                <motion.div className="space-y-3 sm:space-y-4" variants={containerVariants}>
                  {[
                    { href: "/docs", icon: Zap, color: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-blue-600 dark:text-blue-400", title: "Quick Start Guide", description: "Get up and running in 5 minutes" },
                    { href: "/docs/providers", icon: Database, color: "bg-emerald-50 dark:bg-emerald-900/20", iconColor: "text-emerald-600 dark:text-emerald-400", title: "Provider APIs", description: "Auth, Database, and Storage references" },
                    { href: "/docs/deploy", icon: Globe, color: "bg-purple-50 dark:bg-purple-900/20", iconColor: "text-purple-600 dark:text-purple-400", title: "Deployment Guide", description: "Deploy to Vercel, export code" },
                  ].map((item, i) => (
                    <motion.div key={i} variants={itemVariants}>
                      <Link href={item.href}>
                        <motion.div 
                          className="flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-4 transition-all dark:border-gray-800"
                          whileHover={{ x: 10, borderColor: "rgba(0,0,0,0.2)" }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <motion.div 
                            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}
                            whileHover={{ rotate: 10, scale: 1.1 }}
                          >
                            <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                          </motion.div>
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-gray-500">{item.description}</div>
                          </div>
                          <motion.div
                            initial={{ x: 0 }}
                            whileHover={{ x: 5 }}
                          >
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                          </motion.div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              <motion.div 
                className="relative hidden lg:block"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <motion.div 
                  className="rounded-2xl sm:rounded-3xl bg-gray-900 p-4 sm:p-6 text-white dark:bg-gray-100 dark:text-black overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
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
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl">
            <motion.div 
              className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 lg:p-16 dark:border-gray-800 dark:bg-black"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
                <motion.div 
                  className="space-y-5 sm:space-y-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={containerVariants}
                >
                  <motion.div 
                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs sm:text-sm font-medium dark:border-gray-800 dark:bg-gray-900"
                    variants={itemVariants}
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Open Source
                  </motion.div>
                  <motion.h2 
                    className="text-2xl sm:text-3xl font-medium tracking-tight lg:text-4xl"
                    variants={itemVariants}
                  >
                    Self-hosting coming soon
                  </motion.h2>
                  <motion.p 
                    className="text-base sm:text-lg text-gray-600 dark:text-gray-400"
                    variants={itemVariants}
                  >
                    We&apos;re building Jersen to be fully open source and self-hostable. 
                    Deploy the entire platform on your own infrastructure with complete control.
                  </motion.p>
                  <motion.div className="space-y-2 sm:space-y-3" variants={containerVariants}>
                    {[
                      "Full source code access",
                      "Docker deployment ready",
                      "Bring your own AI providers",
                      "Community-driven development"
                    ].map((item, i) => (
                      <motion.div 
                        key={i}
                        className="flex items-center gap-3 text-sm sm:text-base text-gray-600 dark:text-gray-400"
                        variants={itemVariants}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        </motion.div>
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4"
                    variants={itemVariants}
                  >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        href="https://github.com/jersen-app"
                        target="_blank"
                        className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 px-6 text-sm font-medium transition-all hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                      >
                        <Github className="mr-2 h-4 w-4" />
                        Star on GitHub
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href="/waitlist">
                        <ShimmerButton className="h-12 px-6 text-sm font-medium">
                          Join Waitlist
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </ShimmerButton>
                      </Link>
                    </motion.div>
                  </motion.div>
                </motion.div>
                <div className="relative hidden lg:block">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl rounded-full" />
                  <motion.div 
                    className="relative grid grid-cols-2 gap-4"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={containerVariants}
                  >
                    <div className="space-y-4">
                      {[
                        { icon: Users, value: "1000+", label: "Waitlist signups", color: "text-purple-500" },
                        { icon: Building2, value: "Cambodia", label: "Based & operated", color: "text-blue-500" },
                      ].map((stat, i) => (
                        <motion.div 
                          key={i}
                          className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                          variants={itemVariants}
                          whileHover={{ scale: 1.05, y: -5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <stat.icon className={`h-8 w-8 mb-3 ${stat.color}`} />
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <div className="text-sm text-gray-500">{stat.label}</div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="space-y-4 pt-8">
                      {[
                        { icon: Code2, value: "MIT", label: "License (planned)", color: "text-emerald-500" },
                        { icon: Sparkles, value: "AI First", label: "Development approach", color: "text-pink-500" },
                      ].map((stat, i) => (
                        <motion.div 
                          key={i}
                          className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                          variants={itemVariants}
                          whileHover={{ scale: 1.05, y: -5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <stat.icon className={`h-8 w-8 mb-3 ${stat.color}`} />
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <div className="text-sm text-gray-500">{stat.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="px-4 sm:px-6 py-16 sm:py-24 lg:py-32 border-t border-gray-100 dark:border-gray-900">
          <motion.div 
            className="mx-auto max-w-4xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-medium tracking-tight lg:text-5xl mb-4 sm:mb-6"
              variants={itemVariants}
            >
              Ready to build
              <br />
              something amazing?
            </motion.h2>
            <motion.p 
              className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto px-2"
              variants={itemVariants}
            >
              Whether you want to try our AI Builder or discuss a custom project, 
              we&apos;re here to help turn your vision into reality.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
              variants={itemVariants}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/dashboard">
                  <ShimmerButton className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base font-medium">
                    Start Building Free
                    <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1" />
                  </ShimmerButton>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="mailto:hello@jersen.app"
                  className="group inline-flex h-12 sm:h-14 w-full sm:w-auto items-center justify-center rounded-full border border-gray-200 px-6 sm:px-8 text-sm sm:text-base font-medium transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  <MessageSquare className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                  Contact Sales
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 sm:py-16 dark:border-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 sm:gap-12 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-8 sm:mb-12">
            <div className="col-span-2 sm:col-span-1 space-y-4">
              <div className="text-xl font-bold">Jersen</div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                Premium development services in Cambodia. From MVP to full-scale product, 
                we turn your vision into reality.
              </p>
              <div className="flex gap-4">
                <Link href="https://github.com/jersen-app" target="_blank" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  <Github className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="font-medium text-sm sm:text-base">Product</div>
              <div className="space-y-2 sm:space-y-3 text-sm">
                <Link href="/dashboard" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">AI Builder</Link>
                <Link href="#services" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Services</Link>
                <Link href="#projects" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Showcase</Link>
                <Link href="/pricing" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Pricing</Link>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="font-medium text-sm sm:text-base">Resources</div>
              <div className="space-y-2 sm:space-y-3 text-sm">
                <Link href="/docs" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Documentation</Link>
                <Link href="/docs/providers" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">API Reference</Link>
                <Link href="https://github.com/jersen-app" target="_blank" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">GitHub</Link>
                <Link href="/changelog" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Changelog</Link>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="font-medium text-sm sm:text-base">Company</div>
              <div className="space-y-2 sm:space-y-3 text-sm">
                <Link href="/about" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">About</Link>
                <Link href="mailto:hello@jersen.app" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Contact</Link>
                <Link href="/privacy" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="block text-gray-500 hover:text-black dark:hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-900 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-gray-500">
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
