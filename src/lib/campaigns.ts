import { db } from "@/lib/db";
import type { CreateCampaignInput } from "@/lib/validations";

export type CampaignSummary = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    bannerUrl: string | null;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
};

export async function listCampaignSummaries(): Promise<CampaignSummary[]> {
    const campaigns = await db.campaign.findMany({
        where: { isDeleted: false },
        orderBy: [{ createdAt: "desc" }],
        select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            bannerUrl: true,
            status: true,
            startsAt: true,
            endsAt: true,
            createdAt: true,
        },
    });

    return campaigns.map((campaign) => ({
        ...campaign,
        status: campaign.status,
        startsAt: campaign.startsAt?.toISOString() ?? null,
        endsAt: campaign.endsAt?.toISOString() ?? null,
        createdAt: campaign.createdAt.toISOString(),
    }));
}

function toSlug(input: string): string {
    const normalized = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return normalized || `campaign-${Date.now()}`;
}

async function generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = toSlug(title);
    const existing = await db.campaign.findMany({
        where: {
            slug: {
                startsWith: baseSlug,
            },
        },
        select: { slug: true },
    });

    if (!existing.length) {
        return baseSlug;
    }

    const existingSet = new Set(existing.map((item) => item.slug));
    let suffix = 2;
    let candidate = `${baseSlug}-${suffix}`;

    while (existingSet.has(candidate)) {
        suffix += 1;
        candidate = `${baseSlug}-${suffix}`;
    }

    return candidate;
}

export async function createCampaign(input: CreateCampaignInput): Promise<{ id: string; slug: string }> {
    const slug = await generateUniqueSlug(input.title);

    const created = await db.$transaction(async (tx) => {
        const campaign = await tx.campaign.create({
            data: {
                title: input.title,
                slug,
                description: input.description ?? null,
                bannerUrl: input.bannerUrl ?? null,
                startsAt: input.startsAt ? new Date(input.startsAt) : null,
                endsAt: input.endsAt ? new Date(input.endsAt) : null,
                status: "DRAFT",
            },
            select: { id: true, slug: true },
        });

        if (input.participants.length) {
            await tx.participant.createMany({
                data: input.participants.map((participant) => ({
                    campaignId: campaign.id,
                    employeeId: participant.employee_id,
                    name: participant.name,
                    mobile: participant.mobile,
                })),
            });
        }

        if (input.prizeTiers.length) {
            await tx.prizeTier.createMany({
                data: input.prizeTiers.map((prize) => ({
                    campaignId: campaign.id,
                    tierName: prize.tierName,
                    description: prize.description ?? null,
                    quantity: prize.quantity,
                    sortOrder: prize.sortOrder,
                })),
            });
        }

        return campaign;
    });

    return created;
}
