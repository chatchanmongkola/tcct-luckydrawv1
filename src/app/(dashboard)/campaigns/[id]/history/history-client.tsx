"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Winner = {
    participantId: string;
    employeeId: string;
    name: string;
    mobile: string;
    drawnAt: string;
};

type HistoryTier = {
    id: string;
    tierName: string;
    description: string | null;
    quantity: number;
    sortOrder: number;
    wonCount: number;
    isComplete: boolean;
    winners: Winner[];
};

type HistoryData = {
    campaign: {
        id: string;
        title: string;
        bannerUrl: string | null;
        status: string;
    };
    totals: {
        participants: number;
        tiers: number;
        prizes: number;
        drawn: number;
    };
    tiers: HistoryTier[];
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string; code: string };

function formatTimestamp(iso: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date(iso));
}

function toTimestampForFile(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export function HistoryClient({
    campaignId,
    initialTitle,
}: {
    campaignId: string;
    initialTitle: string;
}) {
    const [data, setData] = useState<HistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const logClientAction = async (
        action: "HISTORY_EXPORT_CSV" | "HISTORY_EXPORT_JPG",
        metadata: Record<string, unknown>,
    ) => {
        try {
            await fetch("/api/v1/access-logs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action,
                    campaignId,
                    targetType: "campaign",
                    targetId: campaignId,
                    metadata,
                }),
            });
        } catch {
            // Ignore client-side logging failures to keep export flow smooth.
        }
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/v1/campaigns/${campaignId}/history`,
                    {
                        cache: "no-store",
                    },
                );
                const payload = (await response.json()) as
                    | ApiSuccess<HistoryData>
                    | ApiError;

                if (!response.ok || !payload.success) {
                    throw new Error(
                        payload.success ? "Unknown error" : payload.error,
                    );
                }

                setData(payload.data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load history.",
                );
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, [campaignId]);

    const exportAllCsv = () => {
        if (!data) return;

        const exportedAt = new Date();
        const exportedAtIso = exportedAt.toISOString();
        const fileStamp = toTimestampForFile(exportedAt);

        const header = [
            "event_name",
            "prize_tier",
            "employee_id",
            "name",
            "mobile",
            "drawn_at",
            "exported_at",
        ];
        const rows = data.tiers.flatMap((tier) =>
            tier.winners.map((winner) => [
                data.campaign.title,
                tier.tierName,
                winner.employeeId,
                winner.name,
                winner.mobile,
                winner.drawnAt,
                exportedAtIso,
            ]),
        );

        const csvContent = [header, ...rows]
            .map((row) =>
                row
                    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                    .join(","),
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${initialTitle.replace(/\s+/g, "-").toLowerCase()}-history-${fileStamp}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        void logClientAction("HISTORY_EXPORT_CSV", {
            tierCount: data.tiers.length,
            winnerCount: data.tiers.reduce(
                (sum, tier) => sum + tier.winners.length,
                0,
            ),
        });
    };

    const exportAllJpg = () => {
        if (!data) return;

        const exportedAt = new Date();
        const exportedAtIso = exportedAt.toISOString();
        const fileStamp = toTimestampForFile(exportedAt);

        const allDrawnTimes = data.tiers.flatMap((tier) =>
            tier.winners.map((winner) => new Date(winner.drawnAt).getTime()),
        );
        const completeAtIso = allDrawnTimes.length
            ? new Date(Math.max(...allDrawnTimes)).toISOString()
            : null;

        const columns = 5;
        const cardWidth = 230;
        const cardHeight = 70;
        const gap = 12;
        const padding = 36;
        const sectionHeaderHeight = 94;
        const titleHeight = 210;
        const tierSpacing = 30;

        const sections = data.tiers.map((tier) => {
            const rows = Math.max(1, Math.ceil(tier.winners.length / columns));
            const height =
                sectionHeaderHeight + rows * cardHeight + (rows - 1) * 6;
            return { tier, rows, height };
        });

        const contentHeight = sections.reduce(
            (sum, section) => sum + section.height,
            0,
        );

        const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
        const height =
            titleHeight +
            padding +
            contentHeight +
            Math.max(0, sections.length - 1) * tierSpacing +
            padding;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#334155";
        ctx.font = "600 20px ui-sans-serif, system-ui, -apple-system";
        ctx.fillText(`Event: ${initialTitle}`, padding, 44);

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 42px ui-sans-serif, system-ui, -apple-system";
        ctx.fillText(`${initialTitle} History`, padding, 84);

        ctx.fillStyle = "#64748b";
        ctx.font = "500 20px ui-sans-serif, system-ui, -apple-system";
        ctx.fillText(
            `Exported at: ${formatTimestamp(exportedAtIso)}`,
            padding,
            122,
        );
        ctx.fillText(
            `Complete at: ${completeAtIso ? formatTimestamp(completeAtIso) : "-"}`,
            padding,
            150,
        );

        let currentY = titleHeight;
        sections.forEach(({ tier }) => {
            const tierDrawnTimes = tier.winners.map((winner) =>
                new Date(winner.drawnAt).getTime(),
            );
            const tierDrawnAtIso = tierDrawnTimes.length
                ? new Date(Math.max(...tierDrawnTimes)).toISOString()
                : null;

            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(
                padding - 12,
                currentY - 8,
                width - padding * 2 + 24,
                86,
            );

            ctx.fillStyle = "#0f172a";
            ctx.font = "700 28px ui-sans-serif, system-ui, -apple-system";
            ctx.fillText(`${tier.tierName}`, padding, currentY + 28);

            ctx.fillStyle = "#64748b";
            ctx.font = "600 20px ui-sans-serif, system-ui, -apple-system";
            ctx.fillText(
                `${tier.wonCount}/${tier.quantity}`,
                width - padding - 100,
                currentY + 28,
            );

            ctx.fillStyle = "#64748b";
            ctx.font = "500 16px ui-sans-serif, system-ui, -apple-system";
            ctx.fillText(
                `Drawn at: ${tierDrawnAtIso ? formatTimestamp(tierDrawnAtIso) : "-"}`,
                padding,
                currentY + 56,
            );

            const winners = tier.winners.length
                ? tier.winners
                : [
                      {
                          participantId: "none",
                          employeeId: "-",
                          name: "No winner yet",
                          mobile: "",
                          drawnAt: "",
                      },
                  ];

            winners.forEach((winner, index) => {
                const row = Math.floor(index / columns);
                const col = index % columns;
                const x = padding + col * (cardWidth + gap);
                const y =
                    currentY + sectionHeaderHeight + row * (cardHeight + 6);

                ctx.fillStyle = "#ffffff";
                ctx.strokeStyle = "#cbd5e1";
                ctx.lineWidth = 1;
                ctx.fillRect(x, y, cardWidth, cardHeight);
                ctx.strokeRect(x, y, cardWidth, cardHeight);

                ctx.fillStyle = "#0f172a";
                ctx.font = "700 18px ui-sans-serif, system-ui, -apple-system";
                ctx.fillText(winner.employeeId, x + 8, y + 30);

                ctx.fillStyle = "#334155";
                ctx.font = "500 13px ui-sans-serif, system-ui, -apple-system";
                ctx.fillText(winner.name, x + 8, y + 52);
            });

            const rows = Math.max(1, Math.ceil(tier.winners.length / columns));
            currentY +=
                sectionHeaderHeight +
                rows * cardHeight +
                (rows - 1) * 6 +
                tierSpacing;
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${initialTitle.replace(/\s+/g, "-").toLowerCase()}-history-${fileStamp}.jpg`;
        link.click();

        void logClientAction("HISTORY_EXPORT_JPG", {
            tierCount: data.tiers.length,
            winnerCount: data.tiers.reduce(
                (sum, tier) => sum + tier.winners.length,
                0,
            ),
        });
    };

    if (isLoading) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Loading history...</p>
            </section>
        );
    }

    if (error || !data) {
        return (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
                <p className="text-sm font-semibold text-rose-700">
                    {error ?? "History data not found."}
                </p>
            </section>
        );
    }

    return (
        <div className="space-y-5">
            <section className="relative h-[150px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
                {data.campaign.bannerUrl &&
                !data.campaign.bannerUrl.startsWith("local://") ? (
                    <Image
                        src={data.campaign.bannerUrl}
                        alt="Campaign banner"
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_#334155,_#0f172a_55%,_#020617)]" />
                )}
                <div className="absolute inset-0 bg-black/25" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-black text-slate-950">
                            {data.campaign.title} History
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Drawn {data.totals.drawn}/{data.totals.prizes}{" "}
                            prizes • {data.totals.tiers} tiers
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href="/campaigns"
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Back to Events
                        </Link>
                        <button
                            type="button"
                            onClick={exportAllCsv}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Export CSV
                        </button>
                        <button
                            type="button"
                            onClick={exportAllJpg}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Export JPG
                        </button>
                    </div>
                </div>
            </section>

            {data.tiers.map((tier) => (
                <section
                    key={tier.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                        <h2 className="text-2xl font-black text-slate-950">
                            <span className="text-xl font-semibold text-slate-600">
                                {tier.tierName} -{" "}
                            </span>
                            {tier.description ?? tier.tierName}
                        </h2>
                        <span className="text-4xl font-black text-slate-900">
                            {tier.wonCount}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        {tier.winners.length === 0 ? (
                            <div className="col-span-full rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-500">
                                No winners in this tier yet.
                            </div>
                        ) : (
                            tier.winners.map((winner) => (
                                <div
                                    key={`${tier.id}-${winner.participantId}`}
                                    className="rounded-md border border-slate-300 bg-white px-2 py-2 text-center"
                                >
                                    <p className="text-sm font-bold text-slate-900">
                                        {winner.employeeId}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-slate-600">
                                        {winner.name}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            ))}
        </div>
    );
}
