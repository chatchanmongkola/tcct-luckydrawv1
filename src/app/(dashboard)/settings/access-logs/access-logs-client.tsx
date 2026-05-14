"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AccessLogRow = {
    id: string;
    actorId: string | null;
    actorDisplay: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    targetDisplay: string;
    campaignId: string | null;
    campaignDisplay: string;
    metadata: unknown;
    createdAt: string | Date;
};

type AccessLogListResponse = {
    success: true;
    data: {
        rows: AccessLogRow[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        filters: {
            action: string;
            actorId: string;
        };
        filterOptions: {
            actions: string[];
            users: Array<{ actorId: string; label: string }>;
        };
    };
};

type ApiError = { success: false; error: string; code: string };

const PAGE_SIZE = 50;

function formatTime(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
}

export function AccessLogsClient() {
    const [rows, setRows] = useState<AccessLogRow[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [users, setUsers] = useState<Array<{ actorId: string; label: string }>>(
        [],
    );
    const [selectedAction, setSelectedAction] = useState("");
    const [selectedActorId, setSelectedActorId] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedAction) params.set("action", selectedAction);
        if (selectedActorId) params.set("actorId", selectedActorId);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        return params.toString();
    }, [page, selectedAction, selectedActorId]);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/v1/settings/access-logs?${queryString}`, {
                cache: "no-store",
            });

            const payload = (await response.json()) as AccessLogListResponse | ApiError;
            if (!response.ok || !payload.success) {
                throw new Error(payload.success ? "Failed to load access logs." : payload.error);
            }

            setRows(payload.data.rows);
            setActions(payload.data.filterOptions.actions);
            setUsers(payload.data.filterOptions.users);
            setTotal(payload.data.total);
            setTotalPages(payload.data.totalPages);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load access logs.");
        } finally {
            setIsLoading(false);
        }
    }, [queryString]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    const handleExportCsv = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (selectedAction) params.set("action", selectedAction);
            if (selectedActorId) params.set("actorId", selectedActorId);

            const response = await fetch(
                `/api/v1/settings/access-logs/export?${params.toString()}`,
                {
                    method: "GET",
                },
            );

            if (!response.ok) {
                const payload = (await response.json()) as ApiError;
                throw new Error(payload.error || "Failed to export access logs.");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "access-logs.csv";
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export access logs.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-slate-950">Access Logs</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review all system actions and export by current filter.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void handleExportCsv()}
                    disabled={isExporting || isLoading}
                    className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isExporting ? "Exporting..." : "Export CSV"}
                </button>
            </div>

            {error ? (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadLogs()}
                        className="mt-2 rounded-[6px] border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            <section className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="space-y-1.5 text-sm text-slate-700">
                        <span className="font-medium">Filter by Action</span>
                        <select
                            value={selectedAction}
                            onChange={(event) => {
                                setSelectedAction(event.target.value);
                                setPage(1);
                            }}
                            className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm text-slate-800"
                        >
                            <option value="">All actions</option>
                            {actions.map((action) => (
                                <option key={action} value={action}>
                                    {action}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1.5 text-sm text-slate-700">
                        <span className="font-medium">Filter by User</span>
                        <select
                            value={selectedActorId}
                            onChange={(event) => {
                                setSelectedActorId(event.target.value);
                                setPage(1);
                            }}
                            className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm text-slate-800"
                        >
                            <option value="">All users</option>
                            {users.map((user) => (
                                <option key={user.actorId} value={user.actorId}>
                                    {user.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedAction("");
                                setSelectedActorId("");
                                setPage(1);
                            }}
                            className="h-[42px] w-full rounded-[6px] border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Reset filters
                        </button>
                    </div>
                </div>

                <div className="text-sm text-slate-500">Total {total} records</div>

                <div className="overflow-x-auto rounded-[10px] border border-slate-200">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Time</th>
                                <th className="px-3 py-2 font-semibold">Action</th>
                                <th className="px-3 py-2 font-semibold">User</th>
                                <th className="px-3 py-2 font-semibold">Campaign</th>
                                <th className="px-3 py-2 font-semibold">Target</th>
                                <th className="px-3 py-2 font-semibold">Metadata</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-8 text-center text-slate-500"
                                    >
                                        Loading access logs...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-8 text-center text-slate-500"
                                    >
                                        No access logs found for current filter.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-t border-slate-100 text-slate-700"
                                    >
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {formatTime(row.createdAt)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-900">
                                            {row.action}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {row.actorDisplay}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {row.campaignDisplay}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-slate-900">
                                                {row.targetDisplay}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {row.targetType || "-"}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500">
                                            <pre className="max-w-[360px] overflow-x-auto whitespace-pre-wrap break-all">
                                                {JSON.stringify(row.metadata ?? null)}
                                            </pre>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={page <= 1 || isLoading}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        className="rounded-[6px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Prev
                    </button>
                    <span className="text-sm text-slate-600">
                        Page {page} / {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages || isLoading}
                        onClick={() =>
                            setPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        className="rounded-[6px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Next
                    </button>
                </div>
            </section>
        </div>
    );
}
