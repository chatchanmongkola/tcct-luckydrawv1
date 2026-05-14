"use client";

import { useState } from "react";

type ApiError = { success: false; error: string; code: string };

export function SettingsClient() {
    const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
    const [isClearingData, setIsClearingData] = useState(false);
    const [clearPassword, setClearPassword] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDownloadLogs = async () => {
        setIsDownloadingLogs(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch("/api/v1/settings/access-logs/export", {
                method: "GET",
            });

            if (!response.ok) {
                const payload = (await response.json()) as ApiError;
                throw new Error(payload.error || "Failed to download access logs.");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "access-logs.csv";
            link.click();
            URL.revokeObjectURL(url);

            setMessage("Access logs downloaded.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to download access logs.",
            );
        } finally {
            setIsDownloadingLogs(false);
        }
    };

    const handleClearData = async () => {
        if (!clearPassword.trim()) {
            setError("Clear-data password is required.");
            return;
        }

        const confirmed = window.confirm(
            "This will soft-delete all events and hide them from the Events page. Continue?",
        );
        if (!confirmed) return;

        setIsClearingData(true);
        setMessage(null);
        setError(null);

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
                | ApiError;

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success
                        ? "Failed to clear data."
                        : payload.error,
                );
            }

            setMessage(
                `Clear completed. Soft-deleted ${payload.data.campaigns} events.`,
            );
            setClearPassword("");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to clear data.",
            );
        } finally {
            setIsClearingData(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-950">Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Admin utilities and safeguards.
                </p>
            </div>

            {message ? (
                <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                </div>
            ) : null}
            {error ? (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}

            <section className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Sub Menu</h2>

                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => void handleDownloadLogs()}
                        disabled={isDownloadingLogs || isClearingData}
                        className="rounded-[8px] border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDownloadingLogs
                            ? "Downloading..."
                            : "Download All Access Log (CSV)"}
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleClearData()}
                        disabled={isClearingData || isDownloadingLogs}
                        className="rounded-[8px] border border-rose-300 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isClearingData
                            ? "Clearing..."
                            : "Clear All Data (Soft Delete All Event)"}
                    </button>
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="clear-all-password"
                        className="text-sm font-medium text-slate-700"
                    >
                        Clear Data Password (default: Lucky888)
                    </label>
                    <input
                        id="clear-all-password"
                        type="password"
                        value={clearPassword}
                        onChange={(e) => setClearPassword(e.target.value)}
                        className="w-full rounded-[4px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
                        placeholder="Enter clear-data password"
                    />
                </div>
            </section>
        </div>
    );
}
