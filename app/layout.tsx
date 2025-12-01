import type { Metadata } from "next";
import { Recursive, Karla } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import DevToolsBlockerWrapper from "@/components/DevToolsBlockerWrapper";

const recursive = Recursive({
  variable: "--font-recursive",
  subsets: ["latin"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jersen.app",
  description: "Premium Software Development Agency & AI Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${recursive.variable} ${karla.variable} antialiased`}
        >
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
          <DevToolsBlockerWrapper />
        </body>
      </html>
    </ClerkProvider>
  );
}
