"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
    AlertTriangle,
    Eye,
    Loader2,
    Plus,
    Play,
    MoreVertical,
    Pencil,
    Trash2,
    X,
} from "lucide-react";

import type { CampaignSummary } from "@/lib/campaigns";

type CampaignApiResponse =
    | { success: true; data: CampaignSummary[] }
    | { success: false; error: string; code: string };

function formatDate(isoString: string | null) {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(isoString));
}

function getCardAction(campaign: CampaignSummary) {
    const isFinished =
        campaign.status === "COMPLETED" ||
        campaign.status === "ARCHIVED" ||
        (campaign.totalPrizeQuantity > 0 &&
            campaign.drawnCount >= campaign.totalPrizeQuantity);

    if (isFinished) {
        return {
            label: "View History",
            icon: Eye,
            href: `/draw/${campaign.id}`,
            variant: "history" as const,
        };
    }

    return {
        label: "Open Draw",
        icon: Play,
        href: `/draw/${campaign.id}`,
        variant: "draw" as const,
    };
}

function CardMenu({
    campaign,
    onDeleteRequest,
}: {
    campaign: CampaignSummary;
    onDeleteRequest: (campaign: CampaignSummary) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-label="เมนูอีเวนต์"
                onClick={() => setOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-9 z-10 min-w-[160px] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-lg">
                    <Link
                        href={`/campaigns/${campaign.id}/edit`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <Pencil className="h-4 w-4" />
                        Edit Event
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onDeleteRequest(campaign);
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Event
                    </button>
                </div>
            )}
        </div>
    );
}

export function CampaignsClient() {
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<CampaignSummary | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadCampaigns = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/v1/campaigns", {
                cache: "no-store",
            });
            const payload = (await response.json()) as CampaignApiResponse;

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success ? "Unknown error" : payload.error,
                );
            }

            setCampaigns(payload.data);
        } catch {
            setError("โหลดรายการอีเวนต์ไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadCampaigns();
    }, []);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(
                `/api/v1/campaigns/${deleteTarget.id}`,
                {
                    method: "DELETE",
                },
            );

            if (!response.ok) {
                throw new Error("ไม่สามารถลบอีเวนต์ได้");
            }

            // Optimistic: remove from list immediately
            setCampaigns((prev) =>
                prev.filter((c) => c.id !== deleteTarget.id),
            );
            setDeleteTarget(null);
        } catch {
            setDeleteError("ลบอีเวนต์ไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Delete confirm modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteTarget(null);
                                    setDeleteError(null);
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <h2 className="mt-4 text-lg font-bold text-slate-900">
                            ลบ Event นี้?
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Event{" "}
                            <span className="font-semibold text-slate-800">
                                &ldquo;{deleteTarget.title}&rdquo;
                            </span>{" "}
                            จะถูกลบออกและไม่สามารถกู้คืนได้
                        </p>
                        {deleteError && (
                            <p className="mt-3 text-sm font-medium text-rose-600">
                                {deleteError}
                            </p>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteTarget(null);
                                    setDeleteError(null);
                                }}
                                disabled={isDeleting}
                                className="rounded-[4px] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmDelete()}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-2 rounded-[4px] bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                                {isDeleting && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                ลบ Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                        Events
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        จัดการ Lucky Draw Events ทั้งหมด
                    </p>
                </div>
                <Link
                    href="/campaigns/new"
                    className="inline-flex items-center gap-2 rounded-[4px] bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/80"
                >
                    <Plus className="h-4 w-4" />
                    Create New
                </Link>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-[284px] animate-pulse rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
                        >
                            <div className="flex items-start justify-between">
                                <div className="h-6 w-2/3 rounded bg-slate-200" />
                                <div className="h-6 w-6 rounded bg-slate-100" />
                            </div>
                            <div className="mt-3 h-4 w-28 rounded bg-slate-100" />
                            <div className="mt-5 h-px w-full bg-slate-100" />
                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="h-5 rounded bg-slate-100" />
                                <div className="h-5 rounded bg-slate-100" />
                                <div className="h-5 rounded bg-slate-100" />
                            </div>
                            <div className="mt-6 h-11 rounded-[4px] bg-slate-100" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <p className="text-sm font-medium text-rose-700">{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadCampaigns()}
                        className="mt-4 rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
                    >
                        ลองใหม่
                    </button>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
                    <p className="text-sm font-medium text-slate-700">
                        ยังไม่มีอีเวนต์
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        เริ่มต้นสร้าง Lucky Draw event แรกของคุณได้เลย
                    </p>
                    <Link
                        href="/campaigns/new"
                        className="mt-5 inline-flex rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
                    >
                        Create New
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {campaigns.map((campaign) => (
                        <article
                            key={campaign.id}
                            className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
                        >
                            <div className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-[24px] font-bold leading-tight text-slate-950">
                                            {campaign.title}
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Date:{" "}
                                            {formatDate(campaign.startsAt)}
                                        </p>
                                    </div>
                                    <CardMenu
                                        campaign={campaign}
                                        onDeleteRequest={setDeleteTarget}
                                    />
                                </div>
                                <div className="h-px w-full bg-slate-200/80" />

                                <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
                                    <div>
                                        <span className="font-medium">
                                            {campaign.participantsCount}
                                        </span>{" "}
                                        <span className="text-slate-500">
                                            participants
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {campaign.prizeCount}
                                        </span>{" "}
                                        <span className="text-slate-500">
                                            prizes
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {campaign.drawnCount}/
                                            {campaign.totalPrizeQuantity}
                                        </span>{" "}
                                        <span className="text-slate-500">
                                            drawn
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-1">
                                    {(() => {
                                        const action = getCardAction(campaign);
                                        const ActionIcon = action.icon;

                                        return (
                                            <Link
                                                href={action.href}
                                                className={
                                                    action.variant === "history"
                                                        ? "flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                                                        : "flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-secondary text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
                                                }
                                            >
                                                <ActionIcon className="h-4 w-4" />
                                                {action.label}
                                            </Link>
                                        );
                                    })()}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
