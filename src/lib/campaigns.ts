import { db } from "@/lib/db";
import type {
    CreateCampaignInput,
    UpdateCampaignInput,
} from "@/lib/validations";

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
    participantsCount: number;
    prizeCount: number;
    drawnCount: number;
    totalPrizeQuantity: number;
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
            participants: {
                where: { isDeleted: false },
                select: { id: true },
            },
            prizeTiers: {
                where: { isDeleted: false },
                select: { id: true, quantity: true },
            },
            drawResults: {
                select: { id: true },
            },
        },
    });

    return campaigns.map((campaign) => {
        const totalPrizeQuantity = campaign.prizeTiers.reduce(
            (sum, tier) => sum + tier.quantity,
            0,
        );

        return {
            id: campaign.id,
            title: campaign.title,
            slug: campaign.slug,
            description: campaign.description,
            bannerUrl: campaign.bannerUrl,
            status: campaign.status,
            startsAt: campaign.startsAt?.toISOString() ?? null,
            endsAt: campaign.endsAt?.toISOString() ?? null,
            createdAt: campaign.createdAt.toISOString(),
            participantsCount: campaign.participants.length,
            prizeCount: campaign.prizeTiers.length,
            drawnCount: campaign.drawResults.length,
            totalPrizeQuantity,
        };
    });
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

export async function createCampaign(
    input: CreateCampaignInput,
): Promise<{ id: string; slug: string }> {
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

export async function getCampaign(id: string): Promise<CampaignSummary | null> {
    const campaign = await db.campaign.findFirst({
        where: { id, isDeleted: false },
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
            participants: {
                where: { isDeleted: false },
                select: { id: true },
            },
            prizeTiers: {
                where: { isDeleted: false },
                select: { id: true, quantity: true },
            },
            drawResults: {
                select: { id: true },
            },
        },
    });

    if (!campaign) return null;

    const totalPrizeQuantity = campaign.prizeTiers.reduce(
        (sum, tier) => sum + tier.quantity,
        0,
    );

    return {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        description: campaign.description,
        bannerUrl: campaign.bannerUrl,
        status: campaign.status,
        startsAt: campaign.startsAt?.toISOString() ?? null,
        endsAt: campaign.endsAt?.toISOString() ?? null,
        createdAt: campaign.createdAt.toISOString(),
        participantsCount: campaign.participants.length,
        prizeCount: campaign.prizeTiers.length,
        drawnCount: campaign.drawResults.length,
        totalPrizeQuantity,
    };
}

export async function updateCampaign(
    id: string,
    input: UpdateCampaignInput,
): Promise<{ id: string }> {
    const updated = await db.campaign.update({
        where: { id, isDeleted: false },
        data: {
            title: input.title,
            description: input.description ?? null,
            bannerUrl: input.bannerUrl ?? null,
            startsAt: input.startsAt ? new Date(input.startsAt) : null,
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
        },
        select: { id: true },
    });

    return updated;
}

export async function deleteCampaign(id: string): Promise<{ id: string }> {
    const updated = await db.campaign.update({
        where: { id, isDeleted: false },
        data: { isDeleted: true },
        select: { id: true },
    });

    return updated;
}
