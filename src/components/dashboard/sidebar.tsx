"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Calendar, Settings, LogOut, X, ChevronDown } from "lucide-react";

import { isAdminRole, isStaffRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
    user: { name?: string | null; email?: string | null; role?: string | null };
    isOpen: boolean;
    onClose: () => void;
}

const navItems = [{ href: "/campaigns", label: "Events", icon: Calendar }];

export function DashboardSidebar({ user, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(
        pathname.startsWith("/settings"),
    );
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [clearPassword, setClearPassword] = useState("");
    const [isClearingData, setIsClearingData] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    useEffect(() => {
        if (pathname.startsWith("/settings")) {
            setIsSettingsExpanded(true);
        }
    }, [pathname]);

    const isStaff = isStaffRole(user.role);
    const isAdmin = isAdminRole(user.role);

    const handleSignOut = async () => {
        try {
            await fetch("/api/v1/access-logs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "AUTH_LOGOUT",
                    targetType: "user",
                }),
            });
        } catch {
            // Ignore logging failures and continue with sign-out.
        }

        await signOut({ callbackUrl: "/login" });
    };

    const handleClearData = async () => {
        if (!clearPassword.trim()) {
            setActionError("Clear-data password is required.");
            return;
        }

        setIsClearingData(true);
        setActionError(null);
        setActionMessage(null);

        try {
            const response = await fetch("/api/v1/settings/clear-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    password: clearPassword,
                }),
            });

            const payload = (await response.json()) as
                | { success: true; data: { campaigns: number } }
                | { success: false; error: string };

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success
                        ? "Failed to clear all data."
                        : payload.error,
                );
            }

            setActionMessage(
                `Clear completed. Soft-deleted ${payload.data.campaigns} events.`,
            );
            setIsClearModalOpen(false);
            setClearPassword("");

            // Reload the campaigns page to show updated data
            setTimeout(() => {
                router.push("/campaigns");
            }, 500);
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : "Failed to clear all data.",
            );
        } finally {
            setIsClearingData(false);
        }
    };

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

                    {!isStaff ? (
                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={() =>
                                    setIsSettingsExpanded((prev) => !prev)
                                }
                                className={cn(
                                    "flex w-full items-center justify-between rounded-[4px] px-3 py-2.5 text-sm font-medium transition-colors",
                                    pathname.startsWith("/settings")
                                        ? "bg-primary text-white"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                )}
                            >
                                <span className="flex items-center gap-3">
                                    <Settings size={16} />
                                    Settings
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={cn(
                                        "transition-transform",
                                        isSettingsExpanded
                                            ? "rotate-180"
                                            : "rotate-0",
                                    )}
                                />
                            </button>

                            {isSettingsExpanded ? (
                                <div className="ml-7 space-y-1 border-l border-slate-200 pl-3">
                                    <Link
                                        href="/settings/access-logs"
                                        onClick={onClose}
                                        className={cn(
                                            "block rounded-[4px] px-2 py-1.5 text-sm transition-colors",
                                            pathname.startsWith(
                                                "/settings/access-logs",
                                            )
                                                ? "bg-slate-100 font-semibold text-slate-900"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                        )}
                                    >
                                        Download All Access Log
                                    </Link>
                                    {isAdmin ? (
                                        <Link
                                            href="/settings/users"
                                            onClick={onClose}
                                            className={cn(
                                                "block rounded-[4px] px-2 py-1.5 text-sm transition-colors",
                                                pathname.startsWith(
                                                    "/settings/users",
                                                )
                                                    ? "bg-slate-100 font-semibold text-slate-900"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                            )}
                                        >
                                            User Management
                                        </Link>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsClearModalOpen(true);
                                            setActionError(null);
                                        }}
                                        className="block w-full rounded-[4px] px-2 py-1.5 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
                                    >
                                        Clear All Data
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
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
                        onClick={() => void handleSignOut()}
                    >
                        <LogOut size={16} />
                        Sign out
                    </Button>
                </div>
            </aside>

            {isClearModalOpen ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
                    <div className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">
                            Clear All Data
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Enter clear-data password to confirm soft-delete all
                            events.
                        </p>

                        <div className="mt-4 space-y-1.5">
                            <label
                                htmlFor="clear-all-data-password"
                                className="text-sm font-medium text-slate-700"
                            >
                                Clear-data password
                            </label>
                            <input
                                id="clear-all-data-password"
                                type="password"
                                value={clearPassword}
                                onChange={(event) =>
                                    setClearPassword(event.target.value)
                                }
                                className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
                                placeholder="Enter clear-data password"
                            />
                        </div>

                        {actionError ? (
                            <p className="mt-3 text-sm text-rose-700">
                                {actionError}
                            </p>
                        ) : null}

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsClearModalOpen(false);
                                    setClearPassword("");
                                    setActionError(null);
                                }}
                                disabled={isClearingData}
                                className="rounded-[6px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleClearData()}
                                disabled={isClearingData}
                                className="rounded-[6px] border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isClearingData ? "Clearing..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {actionMessage ? (
                <div className="fixed bottom-4 right-4 z-[60] rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg">
                    {actionMessage}
                </div>
            ) : null}
        </>
    );
}
