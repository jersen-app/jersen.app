"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, Settings, Users, FolderKanban, Shield, X } from "lucide-react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isSuperAdmin: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings/roles", label: "Roles & Settings", icon: Settings },
];

function SidebarContent({ isSuperAdmin, onNavigate }: { isSuperAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="mb-6">
        <OrganizationSwitcher
          hidePersonal
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
          afterLeaveOrganizationUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-between border border-gray-200 dark:border-gray-800 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-900",
            },
          }}
        />
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-gray-900 bg-gray-100 dark:text-white dark:bg-gray-800"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {isSuperAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/admin"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
            >
              <Shield className="h-4 w-4" />
              Super Admin
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}

export function DashboardSidebar({ isSuperAdmin }: DashboardSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
            <SheetTitle>
              <Link href="/dashboard" className="text-xl font-bold tracking-tight" onClick={() => setOpen(false)}>
                Jersen
              </Link>
            </SheetTitle>
          </SheetHeader>
          <div className="p-4 overflow-y-auto">
            <SidebarContent isSuperAdmin={isSuperAdmin} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Jersen
          </Link>
        </div>
        <div className="p-4">
          <SidebarContent isSuperAdmin={isSuperAdmin} />
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton() {
  return null; // Placeholder - the button is rendered in DashboardSidebar
}
