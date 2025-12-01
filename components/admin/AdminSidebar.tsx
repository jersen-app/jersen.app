"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Menu,
    LayoutDashboard, 
    FolderKanban, 
    Rocket, 
    Users,
    Settings,
    Shield,
    Building2,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/requests", label: "Production Requests", icon: Rocket },
    { href: "/admin/organizations", label: "Organizations", icon: Building2 },
    { href: "/admin/projects", label: "All Projects", icon: FolderKanban },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/waitlist", label: "Waitlist", icon: Clock },
    { href: "/admin/settings", label: "Platform Settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();

    return (
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
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                <Link
                    href="/dashboard"
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                    <LayoutDashboard className="h-4 w-4" />
                    Back to Dashboard
                </Link>
            </div>
        </nav>
    );
}

export function AdminSidebar() {
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
                            <Link 
                                href="/admin" 
                                className="flex items-center gap-2 text-xl font-bold tracking-tight" 
                                onClick={() => setOpen(false)}
                            >
                                <Shield className="h-5 w-5 text-violet-500" />
                                Admin
                            </Link>
                        </SheetTitle>
                    </SheetHeader>
                    <div className="p-4 overflow-y-auto">
                        <SidebarContent onNavigate={() => setOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
                <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
                    <Link href="/admin" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Shield className="h-5 w-5 text-violet-500" />
                        Admin
                    </Link>
                </div>
                <div className="p-4">
                    <SidebarContent />
                </div>
            </aside>
        </>
    );
}
