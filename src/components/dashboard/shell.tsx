"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

interface DashboardUser {
    name?: string | null;
    email?: string | null;
    role?: string | null;
}

interface DashboardShellProps {
    user: DashboardUser;
    children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, []);

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Open menu"
                            onClick={() => setIsOpen(true)}
                            className="text-slate-700 hover:bg-slate-100"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                TCCtech Event
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                                Lucky Draw
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-full bg-white px-3 py-1.5">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium text-slate-800">
                                {user.name ?? "Administrator"}
                            </p>
                            <p className="text-xs text-slate-500">
                                {user.role ?? "Admin"}
                            </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">
                            {(user.name ?? user.email ?? "A")
                                .slice(0, 1)
                                .toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <DashboardSidebar
                user={user}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                {children}
            </main>
        </div>
    );
}
