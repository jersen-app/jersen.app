import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen flex-col">
            <header className="fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-gray-200 bg-white/80 px-2 py-2 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
                <div className="flex items-center gap-2 md:gap-8">
                    <Link
                        href="/"
                        className="ml-4 text-lg font-bold tracking-tight md:text-xl"
                    >
                        Jersen
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400 md:flex">
                        <Link
                            href="/"
                            className="transition-colors hover:text-black dark:hover:text-white"
                        >
                            Home
                        </Link>
                        <Link
                            href="#services"
                            className="transition-colors hover:text-black dark:hover:text-white"
                        >
                            Services
                        </Link>
                        <Link
                            href="#projects"
                            className="transition-colors hover:text-black dark:hover:text-white"
                        >
                            Projects
                        </Link>
                        <Link
                            href="#contact"
                            className="transition-colors hover:text-black dark:hover:text-white"
                        >
                            Contact
                        </Link>
                    </nav>
                    <div className="flex items-center gap-2 pl-2 md:pl-0">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            <UserButton />
                        </SignedIn>
                    </div>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
