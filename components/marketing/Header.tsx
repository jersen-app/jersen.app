"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#ai-builder", label: "AI Builder" },
  { href: "#services", label: "Services" },
  { href: "#projects", label: "Showcase" },
  { href: "#docs", label: "Docs" },
  { href: "#contact", label: "Contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Header */}
      <header className="fixed top-6 left-1/2 z-50 -translate-x-1/2 hidden md:block">
        <div className="rounded-full border border-gray-200 bg-white/80 px-2 py-2 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="ml-4 text-xl font-bold tracking-tight"
            >
              Jersen
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-gray-600 dark:text-gray-400">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-black dark:hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
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
                <Link
                  href="/dashboard"
                  className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  Dashboard
                </Link>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="flex items-center justify-between px-4 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 dark:bg-black/80 dark:border-gray-900">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Jersen
          </Link>
          <div className="flex items-center gap-3">
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 dark:bg-black/95 dark:border-gray-900 shadow-lg">
            <nav className="flex flex-col py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-6 py-3 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 transition-colors dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-900"
                >
                  {link.label}
                </Link>
              ))}
              <SignedOut>
                <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-4 px-6">
                  <SignInButton mode="modal">
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 text-base font-medium text-gray-600 hover:text-black transition-colors dark:text-gray-400 dark:hover:text-white text-left"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                </div>
              </SignedOut>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
