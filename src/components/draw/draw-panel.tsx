"use client";

import Image from "next/image";
import { Download, Eye, Loader2 } from "lucide-react";

import { WinnerGrid } from "@/components/draw/winner-grid";

type DrawWinner = {
    participantId: string;
    employeeId: string;
    name: string | null;
    mobile: string | null;
};

type EligiblePreviewParticipant = {
    participantId: string;
    employeeId: string;
};

type DrawTier = {
    id: string;
    tierName: string;
    description: string | null;
    quantity: number;
    wonCount: number;
    remaining: number;
    isComplete: boolean;
};

type DrawPanelProps = {
    tier: DrawTier | null;
    mode: "ready" | "drawing" | "result" | "complete";
    isSubmitting: boolean;
    winners: DrawWinner[];
    drawingCandidates: EligiblePreviewParticipant[];
    slotStart: number;
    error: string | null;
    hasShownAllWinners: boolean;
    onDraw: () => void;
    onShowAllWinners: () => void;
    onExportCsv: () => void;
    onExportJpg: () => void;
};

export function DrawPanel({
    tier,
    mode,
    isSubmitting,
    winners,
    drawingCandidates,
    slotStart,
    error,
    hasShownAllWinners,
    onDraw,
    onShowAllWinners,
    onExportCsv,
    onExportJpg,
}: DrawPanelProps) {
    if (!tier) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900">
                    Draw completed
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    All prizes in this event have been fully drawn.
                </p>
            </section>
        );
    }

    const drawCount = Math.min(10, tier.remaining);
    const canDraw = tier.remaining > 0 && mode !== "drawing" && !isSubmitting;

    const statusText =
        mode === "drawing"
            ? "Drawing winners..."
            : tier.remaining === 0
              ? `${tier.tierName} complete`
              : `Ready to draw ${drawCount} winners`;

    const titleText =
        mode === "drawing"
            ? "Drawing in progress"
            : mode === "result"
              ? "Congratulations"
              : mode === "complete"
                ? `${tier.tierName} complete`
                : "Ready when you are";

    const helperText =
        mode === "ready"
            ? `Press the button below to draw ${drawCount} winner${drawCount > 1 ? "s" : ""} for ${tier.tierName}`
            : mode === "drawing"
              ? "The system is drawing winners."
              : mode === "result"
                ? ""
                : "You can view all winners in this tier.";

    const effectiveSlotStart =
        hasShownAllWinners && winners.length > 0 ? 1 : Math.max(1, slotStart);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {tier.tierName}
                </p>
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    Winners {tier.wonCount}/{tier.quantity}
                </div>
            </div>

            <div className="mt-6 text-center">
                <Image
                    src="/images/dice.svg"
                    alt="Dice"
                    width={100}
                    height={100}
                    className="mx-auto h-[100px] w-[100px]"
                    priority
                />
                <h2 className="mt-3 text-3xl font-black text-slate-950">
                    {titleText}
                </h2>
                {helperText ? (
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
                        {helperText}
                    </p>
                ) : null}
                {tier.description && (
                    <p className="mx-auto mt-1 max-w-2xl text-xs text-slate-400">
                        {tier.description}
                    </p>
                )}
            </div>

            <div className="mt-6" id="winner-capture-area">
                <WinnerGrid
                    winners={winners}
                    drawingCandidates={drawingCandidates}
                    drawCount={drawCount}
                    slotStart={effectiveSlotStart}
                    mode={mode}
                />
            </div>

            {error && (
                <p className="mt-4 text-sm font-semibold text-rose-600">
                    {error}
                </p>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <p className="text-sm font-semibold text-emerald-600">
                        • {statusText}
                    </p>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {tier.remaining === 0 && (
                            <button
                                type="button"
                                onClick={onShowAllWinners}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                            >
                                <Eye className="h-4 w-4" />
                                Show all winners in this prize
                            </button>
                        )}

                        {hasShownAllWinners && (
                            <>
                                <button
                                    type="button"
                                    onClick={onExportCsv}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                                >
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={onExportJpg}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                                >
                                    <Download className="h-4 w-4" />
                                    Export JPG
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onDraw}
                            disabled={!canDraw}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {isSubmitting && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Draw {drawCount} winners
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
