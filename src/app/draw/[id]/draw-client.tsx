"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { DrawPanel } from "@/components/draw/draw-panel";
import { TierTabs } from "@/components/draw/tier-tabs";

type DrawTier = {
    id: string;
    tierName: string;
    description: string | null;
    quantity: number;
    sortOrder: number;
    wonCount: number;
    remaining: number;
    isComplete: boolean;
};

type DrawOverview = {
    campaign: {
        id: string;
        title: string;
        bannerUrl: string | null;
        status: string;
    };
    totalParticipants: number;
    excludedWinners: number;
    currentTierId: string | null;
    tiers: DrawTier[];
};

type DrawWinner = {
    participantId: string;
    employeeId: string;
    name: string;
    mobile: string;
};

type DrawResponse = {
    sessionId: string;
    prizeTierId: string;
    drawCount: number;
    remaining: number;
    isTierComplete: boolean;
    winners: DrawWinner[];
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string; code: string };

function isUsableBanner(url: string | null) {
    return !!url && !url.startsWith("local://");
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

export function DrawClient({
    campaignId,
    initialBannerUrl,
}: {
    campaignId: string;
    initialBannerUrl: string | null;
}) {
    const router = useRouter();
    const [overview, setOverview] = useState<DrawOverview | null>(null);
    const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
    const [mode, setMode] = useState<
        "ready" | "drawing" | "result" | "complete"
    >("ready");
    const [winners, setWinners] = useState<DrawWinner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasShownAllWinners, setHasShownAllWinners] = useState(false);
    const previousTierIdRef = useRef<string | null>(null);

    const loadState = useCallback(async () => {
        const response = await fetch(`/api/v1/campaigns/${campaignId}/draw`, {
            cache: "no-store",
        });
        const payload = (await response.json()) as
            | ApiSuccess<DrawOverview>
            | ApiError;

        if (!response.ok || !payload.success) {
            throw new Error(
                payload.success ? "Draw state failed" : payload.error,
            );
        }

        setOverview(payload.data);
        setSelectedTierId((prev) => {
            if (prev && payload.data.tiers.some((tier) => tier.id === prev)) {
                return prev;
            }
            return payload.data.currentTierId;
        });
    }, [campaignId]);

    useEffect(() => {
        const run = async () => {
            setIsLoading(true);
            setError(null);
            try {
                await loadState();
            } catch {
                setError("โหลดข้อมูลหน้าสุ่มไม่สำเร็จ");
            } finally {
                setIsLoading(false);
            }
        };

        void run();
    }, [loadState]);

    const selectedTier = useMemo(() => {
        if (!overview || !selectedTierId) return null;
        return (
            overview.tiers.find((tier) => tier.id === selectedTierId) ?? null
        );
    }, [overview, selectedTierId]);

    useEffect(() => {
        if (!selectedTierId) {
            previousTierIdRef.current = null;
            setMode("complete");
            setWinners([]);
            return;
        }

        if (previousTierIdRef.current === selectedTierId) {
            return;
        }

        previousTierIdRef.current = selectedTierId;

        const tier = overview?.tiers.find((item) => item.id === selectedTierId);
        if (!tier) return;

        setWinners([]);
        setHasShownAllWinners(false);
        setMode(tier.remaining === 0 ? "complete" : "ready");
    }, [overview, selectedTierId]);

    const runDraw = async () => {
        if (!selectedTier || selectedTier.remaining <= 0) return;

        setIsSubmitting(true);
        setError(null);
        setMode("drawing");
        setWinners([]);
        setHasShownAllWinners(false);

        const drawStartedAt = Date.now();

        try {
            const response = await fetch(
                `/api/v1/campaigns/${campaignId}/draw`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ prizeTierId: selectedTier.id }),
                },
            );
            const payload = (await response.json()) as
                | ApiSuccess<DrawResponse>
                | ApiError;

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success ? "Draw failed" : payload.error,
                );
            }

            const elapsed = Date.now() - drawStartedAt;
            const minAnimation = 1800;
            if (elapsed < minAnimation) {
                await new Promise((resolve) => {
                    window.setTimeout(resolve, minAnimation - elapsed);
                });
            }

            setWinners(payload.data.winners);
            setMode(payload.data.remaining === 0 ? "complete" : "result");
            await loadState();
        } catch (err) {
            setError(err instanceof Error ? err.message : "สุ่มไม่สำเร็จ");
            setMode("ready");
        } finally {
            setIsSubmitting(false);
        }
    };

    const showAllWinners = async () => {
        if (!selectedTier) return;

        setError(null);
        try {
            const response = await fetch(
                `/api/v1/campaigns/${campaignId}/draw/${selectedTier.id}/winners`,
                { cache: "no-store" },
            );
            const payload = (await response.json()) as
                | ApiSuccess<DrawWinner[]>
                | ApiError;

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success ? "Load winners failed" : payload.error,
                );
            }

            setWinners(payload.data);
            setMode("complete");
            setHasShownAllWinners(true);
        } catch {
            setError("ไม่สามารถโหลดรายชื่อผู้ชนะทั้งหมดได้");
        }
    };

    const exportWinnersCsv = () => {
        if (!selectedTier || !winners.length) return;

        const exportedAt = new Date();
        const exportedAtIso = exportedAt.toISOString();
        const fileStamp = toTimestampForFile(exportedAt);

        const header = ["employee_id", "name", "mobile", "exported_at"];
        const rows = winners.map((winner) => [
            winner.employeeId,
            winner.name,
            winner.mobile,
            exportedAtIso,
        ]);
        const csvContent = [header, ...rows]
            .map((row) =>
                row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedTier.tierName.replace(/\s+/g, "-").toLowerCase()}-winners-${fileStamp}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportWinnersJpg = () => {
        if (!selectedTier || !winners.length) return;

        const exportedAt = new Date();
        const exportedAtIso = exportedAt.toISOString();
        const fileStamp = toTimestampForFile(exportedAt);

        const columns = 5;
        const cardWidth = 260;
        const cardHeight = 120;
        const gap = 20;
        const padding = 40;
        const titleHeight = 120;
        const rows = Math.ceil(winners.length / columns);
        const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
        const height =
            titleHeight +
            padding +
            rows * cardHeight +
            Math.max(0, rows - 1) * gap +
            padding;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 42px ui-sans-serif, system-ui, -apple-system";
        ctx.fillText(`${selectedTier.tierName} Winners`, padding, 65);

        ctx.fillStyle = "#64748b";
        ctx.font = "500 22px ui-sans-serif, system-ui, -apple-system";
        ctx.fillText(`Total winners: ${winners.length}`, padding, 98);
        ctx.fillText(`Exported at: ${exportedAtIso}`, padding, 124);

        winners.forEach((winner, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = padding + col * (cardWidth + gap);
            const y = titleHeight + padding + row * (cardHeight + gap);

            ctx.fillStyle = "#0b1f8f";
            ctx.fillRect(x, y, cardWidth, cardHeight);

            ctx.fillStyle = "#ffffff";
            ctx.font = "700 34px ui-sans-serif, system-ui, -apple-system";
            ctx.fillText(winner.employeeId, x + 16, y + 52);

            ctx.font = "500 20px ui-sans-serif, system-ui, -apple-system";
            ctx.fillStyle = "#dbeafe";
            ctx.fillText(winner.name, x + 16, y + 85);
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${selectedTier.tierName.replace(/\s+/g, "-").toLowerCase()}-winners-${fileStamp}.jpg`;
        link.click();
    };

    const bannerUrl = overview?.campaign.bannerUrl ?? initialBannerUrl;

    return (
        <div className="min-h-screen bg-slate-100 pb-8">
            <header className="relative h-[150px] max-h-[150px] w-full overflow-hidden bg-slate-900">
                {isUsableBanner(bannerUrl) ? (
                    <Image
                        src={bannerUrl as string}
                        alt="Campaign banner"
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_#334155,_#0f172a_55%,_#020617)]" />
                )}

                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-4 right-4 top-4 flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            router.push("/campaigns");
                            router.refresh();
                        }}
                        aria-label="Close draw"
                        className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto mt-5 w-full max-w-6xl space-y-4 px-4">
                {isLoading ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Loading draw state...
                        </p>
                    </section>
                ) : !overview ? (
                    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
                        <p className="text-sm font-semibold text-rose-700">
                            {error ?? "ไม่พบข้อมูลหน้าสุ่ม"}
                        </p>
                    </section>
                ) : (
                    <>
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <TierTabs
                                tiers={overview.tiers}
                                selectedTierId={selectedTierId}
                                onSelect={setSelectedTierId}
                            />
                        </section>

                        <DrawPanel
                            tier={selectedTier}
                            mode={mode}
                            isSubmitting={isSubmitting}
                            winners={winners}
                            error={error}
                            hasShownAllWinners={hasShownAllWinners}
                            onDraw={() => void runDraw()}
                            onShowAllWinners={() => void showAllWinners()}
                            onExportCsv={exportWinnersCsv}
                            onExportJpg={() => void exportWinnersJpg()}
                        />
                    </>
                )}
            </main>
        </div>
    );
}
