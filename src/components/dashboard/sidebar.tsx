"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Calendar, Settings, LogOut, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
    user: { name?: string | null; email?: string | null; role?: string | null };
    isOpen: boolean;
    onClose: () => void;
}

const navItems = [
    { href: "/campaigns", label: "Events", icon: Calendar },
    { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function DashboardSidebar({ user, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-40 bg-slate-900/40"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            Menu
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                            Navigation
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close menu"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <nav className="flex-1 space-y-2 p-4">
                    {navItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-medium transition-colors",
                                pathname.startsWith(href)
                                    ? "bg-primary text-white"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            )}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="border-t border-slate-200 p-4">
                    <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2">
                        <p className="text-sm font-medium text-slate-800">
                            {user.name ?? "Administrator"}
                        </p>
                        <p className="text-xs text-slate-500">
                            {user.role ?? "Admin"}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-3"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <LogOut size={16} />
                        ออกจากระบบ
                    </Button>
                </div>
            </aside>
        </>
    );
}
