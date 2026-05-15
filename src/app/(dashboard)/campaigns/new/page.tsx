"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Trash2, Upload, X } from "lucide-react";

import { uploadCampaignBanner } from "@/lib/banner-upload";

type ParticipantRow = {
    employee_id: string;
    name: string | null;
    mobile: string | null;
};

type PrizeTierRow = {
    id: string;
    tierName: string;
    description: string;
    quantity: number | "";
};

function parseCsv(text: string): ParticipantRow[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = lines[0]
        .split(",")
        .map((item) => item.trim().toLowerCase());

    // Validate header: must start with 'id' and optional 'name', 'mobile' in order
    if (headers.length === 0 || headers[0] !== "id") {
        throw new Error(
            "CSV header must start with 'id' (required). Optional: name, mobile",
        );
    }

    const validHeaders = ["id", "name", "mobile"];
    for (let i = 0; i < headers.length; i++) {
        if (headers[i] !== validHeaders[i]) {
            throw new Error(
                "CSV header columns must be in order: id, [name], [mobile]",
            );
        }
    }

    return lines.slice(1).map((line) => {
        const fields = line.split(",").map((item) => item.trim());

        const employee_id = fields[0];
        const name = fields.length > 1 && fields[1] ? fields[1] : null;
        const mobile = fields.length > 2 && fields[2] ? fields[2] : null;

        return {
            employee_id,
            name,
            mobile,
        };
    });
}

export default function NewCampaignPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [participantFileName, setParticipantFileName] = useState<
        string | null
    >(null);
    const [participantFileSize, setParticipantFileSize] = useState<
        number | null
    >(null);
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [prizeTiers, setPrizeTiers] = useState<PrizeTierRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const stats = useMemo(() => {
        const totalPrize = prizeTiers.reduce(
            (sum, tier) => sum + (tier.quantity === "" ? 0 : tier.quantity),
            0,
        );
        return {
            participants: participants.length,
            totalPrize,
            winners: `0/${totalPrize}`,
        };
    }, [participants.length, prizeTiers]);

    const canCreate = useMemo(() => {
        const hasTitle = !!title.trim();
        const hasEventDate = !!eventDate;
        const hasParticipants = participants.length > 0;
        const hasPrize = prizeTiers.length > 0;
        const allPrizeValid = prizeTiers.every(
            (tier) =>
                !!tier.tierName.trim() &&
                tier.quantity !== "" &&
                tier.quantity >= 1,
        );

        return (
            hasTitle &&
            hasEventDate &&
            hasParticipants &&
            hasPrize &&
            allPrizeValid
        );
    }, [title, eventDate, participants.length, prizeTiers]);

    const onBannerChange = (file: File | null) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Only image files are supported.");
            return;
        }

        if (bannerPreview) {
            URL.revokeObjectURL(bannerPreview);
        }

        setError(null);
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(file));
    };

    const onParticipantFileChange = async (file: File | null) => {
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = parseCsv(text);
            setParticipants(parsed);
            setParticipantFileName(file.name);
            setParticipantFileSize(file.size);
            setError(null);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to read CSV file.",
            );
        }
    };

    const addPrizeTier = () => {
        if (prizeTiers.length >= 5) {
            setError("You can add up to 5 prize tiers.");
            return;
        }

        setError(null);
        setPrizeTiers((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                tierName: "",
                description: "",
                quantity: 1,
            },
        ]);
    };

    const updatePrizeTier = (
        id: string,
        field: keyof Omit<PrizeTierRow, "id">,
        value: string | number,
    ) => {
        setPrizeTiers((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          [field]: value,
                      }
                    : item,
            ),
        );
    };

    const removePrizeTier = (id: string) => {
        setPrizeTiers((prev) => prev.filter((item) => item.id !== id));
    };

    const onSave = async () => {
        if (!title.trim()) {
            setError("Please enter event name.");
            return;
        }

        if (!participants.length) {
            setError("Please upload at least 1 participants CSV file.");
            return;
        }

        if (!prizeTiers.length) {
            setError("Please add at least 1 prize.");
            return;
        }

        if (
            prizeTiers.some(
                (tier) =>
                    !tier.tierName.trim() ||
                    tier.quantity === "" ||
                    tier.quantity < 1,
            )
        ) {
            setError("Please complete all prize tier fields.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const bannerUrl = bannerFile
                ? await uploadCampaignBanner(bannerFile)
                : null;

            const response = await fetch("/api/v1/campaigns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description: description || null,
                    startsAt: eventDate
                        ? new Date(eventDate).toISOString()
                        : null,
                    endsAt: eventDate
                        ? new Date(eventDate).toISOString()
                        : null,
                    bannerUrl,
                    participants,
                    prizeTiers: prizeTiers.map((tier, index) => ({
                        tierName: tier.tierName,
                        description: tier.description || null,
                        quantity: tier.quantity as number,
                        sortOrder: index + 1,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error("Unable to create event.");
            }

            router.push("/campaigns");
            router.refresh();
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "An error occurred while saving.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Create Event
                    </p>
                    <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
                        Create Lucky Draw Event
                    </h1>
                </div>
            </div>

            {!!participants.length && (
                <div className="grid gap-3 rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
                    <div>
                        <p className="text-xs text-slate-400">Participants</p>
                        <p className="text-xl font-bold text-slate-900">
                            {stats.participants}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">
                            Remaining prizes
                        </p>
                        <p className="text-xl font-bold text-slate-900">
                            {stats.totalPrize}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Winners</p>
                        <p className="text-xl font-bold text-slate-900">
                            {stats.winners}
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg text-slate-900">
                    <span className="font-bold text-slate-500">01</span>{" "}
                    <span className="font-bold">Event details</span>
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
                            className="w-full rounded-[4px] border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                            placeholder="e.g. Year End Lucky Draw 2026"
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
                            placeholder="Event description"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                        Event Banner
                    </label>
                    <p className="text-xs text-slate-500">
                        Recommended: 1440 × 265 px, PNG or JPG, Max 5 MB.
                        Displayed at the top of the draw screen.
                    </p>
                    {!bannerPreview ? (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                            <ImagePlus className="h-5 w-5 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">
                                Upload banner (PNG/JPG)
                            </span>
                            <span className="text-xs text-slate-500">
                                Drag and drop a file, or click to choose a file
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
                                    if (bannerPreview) {
                                        URL.revokeObjectURL(bannerPreview);
                                    }
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

            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h2 className="text-lg text-slate-900">
                        <span className="font-bold text-slate-500">02</span>{" "}
                        <span className="font-bold">Participants</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                        Upload a CSV file. Required: id. Optional: name, mobile
                    </p>
                </div>
                {!participantFileName ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                        <Upload className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">
                            Upload CSV
                        </span>
                        <span className="text-xs text-slate-500">
                            header: id[,name][,mobile]
                        </span>
                        <input
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) =>
                                void onParticipantFileChange(
                                    e.target.files?.[0] ?? null,
                                )
                            }
                        />
                    </label>
                ) : (
                    <div className="w-full md:w-1/2">
                        <div className="rounded-[12px] border border-emerald-400/70 bg-emerald-50/50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-emerald-600 text-white">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold leading-none text-slate-800">
                                            {participantFileName}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {participantFileSize
                                                ? `${(participantFileSize / 1024).toFixed(1)} KB`
                                                : "-"}
                                        </p>
                                    </div>
                                </div>
                                <label className="cursor-pointer text-sm font-medium text-emerald-700 hover:text-emerald-800">
                                    Replace
                                    <input
                                        type="file"
                                        accept=".csv,text/csv"
                                        className="hidden"
                                        onChange={(e) =>
                                            void onParticipantFileChange(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg text-slate-900">
                            <span className="font-bold text-slate-500">03</span>{" "}
                            <span className="font-bold">Prizes</span>
                        </h2>
                        <p className="text-xs text-slate-500">
                            Up to 5 prize tiers
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addPrizeTier}
                        disabled={prizeTiers.length >= 5}
                        className="rounded-[4px] bg-secondary px-3 py-2 text-xs font-semibold text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        + Add Prize
                    </button>
                </div>

                {!prizeTiers.length ? (
                    <div className="rounded-[8px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        No prizes yet
                    </div>
                ) : (
                    <div className="space-y-3">
                        {prizeTiers.map((tier, index) => (
                            <div
                                key={tier.id}
                                className="flex items-center gap-3"
                            >
                                {/* Number badge */}
                                <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[12px] bg-primary">
                                    <span className="text-2xl font-bold text-white">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>

                                {/* Gray container wrapping inputs + trash */}
                                <div className="flex flex-1 items-center gap-2 rounded-[12px] bg-slate-100 px-3 py-3">
                                    <input
                                        type="text"
                                        value={tier.tierName}
                                        placeholder="Tier name"
                                        className="flex-[2] rounded-[6px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                                        onChange={(e) =>
                                            updatePrizeTier(
                                                tier.id,
                                                "tierName",
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <input
                                        type="text"
                                        value={tier.description}
                                        placeholder="Prize description"
                                        className="flex-[3] rounded-[6px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                                        onChange={(e) =>
                                            updatePrizeTier(
                                                tier.id,
                                                "description",
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        value={tier.quantity}
                                        placeholder="Qty"
                                        className="w-20 shrink-0 rounded-[6px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                                        onChange={(e) =>
                                            updatePrizeTier(
                                                tier.id,
                                                "quantity",
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePrizeTier(tier.id)}
                                        className="shrink-0 rounded-[6px] p-2 text-slate-400 transition hover:bg-slate-200 hover:text-rose-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                    disabled={isSubmitting || !canCreate}
                    className="rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? "Creating..." : "Create"}
                </button>
            </div>
        </div>
    );
}
