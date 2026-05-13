"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";

import type { CampaignSummary } from "@/lib/campaigns";

// Extract date portion (YYYY-MM-DD) from ISO string for date input
function toDateInputValue(iso: string | null): string {
    if (!iso) return "";
    return iso.slice(0, 10);
}

export function EditForm({ campaign }: { campaign: CampaignSummary }) {
    const router = useRouter();

    const [title, setTitle] = useState(campaign.title);
    const [description, setDescription] = useState(campaign.description ?? "");
    const [eventDate, setEventDate] = useState(
        toDateInputValue(campaign.startsAt),
    );
    const [bannerPreview, setBannerPreview] = useState<string | null>(
        campaign.bannerUrl && !campaign.bannerUrl.startsWith("local://")
            ? campaign.bannerUrl
            : null,
    );
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onBannerChange = (file: File | null) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
            return;
        }
        if (bannerFile && bannerPreview) {
            URL.revokeObjectURL(bannerPreview);
        }
        setError(null);
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(file));
    };

    const onSave = async () => {
        if (!title.trim()) {
            setError("กรุณากรอกชื่อ Event");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/v1/campaigns/${campaign.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description: description || null,
                    startsAt: eventDate
                        ? new Date(eventDate).toISOString()
                        : null,
                    endsAt: eventDate
                        ? new Date(eventDate).toISOString()
                        : null,
                    bannerUrl: bannerFile
                        ? `local://${bannerFile.name}`
                        : campaign.bannerUrl,
                }),
            });

            if (!response.ok) {
                throw new Error("ไม่สามารถแก้ไข Event ได้");
            }

            router.push("/campaigns");
            router.refresh();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "เกิดข้อผิดพลาดระหว่างบันทึก",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                    Event details
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">
                            Event Name
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-[4px] border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary"
                            placeholder="เช่น Year End Lucky Draw 2026"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            Event Date
                        </label>
                        <input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="w-full rounded-[4px] border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-[4px] border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary"
                            placeholder="คำอธิบายอีเวนต์"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                        Event Banner
                    </label>
                    <p className="text-xs text-slate-500">
                        Recommended: 1440 × 265 px, PNG or JPG, Max 5 MB.
                    </p>
                    {!bannerPreview ? (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                            <ImagePlus className="h-5 w-5 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">
                                Upload banner (PNG/JPG)
                            </span>
                            <span className="text-xs text-slate-500">
                                ลากไฟล์มาวาง หรือกดเลือกไฟล์
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                    onBannerChange(e.target.files?.[0] ?? null)
                                }
                            />
                        </label>
                    ) : (
                        <div className="relative overflow-hidden rounded-[8px] border border-slate-200">
                            <Image
                                src={bannerPreview}
                                alt="Banner preview"
                                width={1200}
                                height={400}
                                className="h-48 w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (bannerFile && bannerPreview)
                                        URL.revokeObjectURL(bannerPreview);
                                    setBannerFile(null);
                                    setBannerPreview(null);
                                }}
                                className="absolute right-2 top-2 rounded-[4px] bg-white/90 p-1.5 text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <div className="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-[12px] border border-slate-200 bg-white/95 p-3 backdrop-blur">
                <button
                    type="button"
                    onClick={() => router.push("/campaigns")}
                    className="rounded-[4px] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    Back to Events
                </button>
                <button
                    type="button"
                    onClick={() => void onSave()}
                    disabled={isSubmitting || !title.trim()}
                    className="rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
