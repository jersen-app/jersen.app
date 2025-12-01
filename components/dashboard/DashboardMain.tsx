"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import CreditDisplay from "@/components/CreditDisplay";

interface DashboardMainProps {
  children: React.ReactNode;
}

export function DashboardMain({ children }: DashboardMainProps) {
  const pathname = usePathname();
  
  // Builder pages have their own full-screen layout
  const isBuilderPage = pathname.includes("/builder");
  
  if (isBuilderPage) {
    return <>{children}</>;
  }

  return (
    <main className="flex-1 md:ml-64 overflow-x-hidden">
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 pl-16 md:pl-6 dark:border-gray-800 dark:bg-black">
        <CreditDisplay variant="compact" />
        <UserButton />
      </header>
      <div className="p-6 max-w-5xl mx-auto">{children}</div>
    </main>
  );
}
