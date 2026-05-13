import { randomInt, randomUUID } from "node:crypto";

import { db } from "@/lib/db";

const DRAW_BATCH_SIZE = 10;

type ServiceErrorCode =
    | "CAMPAIGN_NOT_FOUND"
    | "PRIZE_TIER_NOT_FOUND"
    | "PRIZE_TIER_COMPLETED"
    | "NO_ELIGIBLE_PARTICIPANTS";

export class DrawServiceError extends Error {
    code: ServiceErrorCode;
    status: number;

    constructor(code: ServiceErrorCode, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

export type DrawTierState = {
    id: string;
    tierName: string;
    description: string | null;
    quantity: number;
    sortOrder: number;
    wonCount: number;
    remaining: number;
    isComplete: boolean;
};

export type DrawOverview = {
    campaign: {
        id: string;
        title: string;
        bannerUrl: string | null;
        status: string;
    };
    totalParticipants: number;
    excludedWinners: number;
    currentTierId: string | null;
    tiers: DrawTierState[];
};

export type DrawWinner = {
    participantId: string;
    employeeId: string;
    name: string;
    mobile: string;
};

export type ExecuteDrawResult = {
    sessionId: string;
    prizeTierId: string;
    drawCount: number;
    remaining: number;
    isTierComplete: boolean;
    winners: DrawWinner[];
};

function pickRandomDistinct<T>(items: T[], count: number): T[] {
    const pool = [...items];
    const selected: T[] = [];

    for (let i = 0; i < count; i += 1) {
        const index = randomInt(0, pool.length);
        const [item] = pool.splice(index, 1);
        selected.push(item);
    }

    return selected;
}

export async function getDrawState(campaignId: string): Promise<DrawOverview> {
    const [campaign, totalParticipants, results] = await Promise.all([
        db.campaign.findFirst({
            where: { id: campaignId, isDeleted: false },
            select: {
                id: true,
                title: true,
                bannerUrl: true,
                status: true,
                prizeTiers: {
                    where: { isDeleted: false },
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                    select: {
                        id: true,
                        tierName: true,
                        description: true,
                        quantity: true,
                        sortOrder: true,
                    },
                },
            },
        }),
        db.participant.count({
            where: { campaignId, isDeleted: false },
        }),
        db.drawResult.groupBy({
            by: ["prizeTierId"],
            where: { campaignId },
            _count: { _all: true },
        }),
    ]);

    if (!campaign) {
        throw new DrawServiceError("CAMPAIGN_NOT_FOUND", "ไม่พบแคมเปญ", 404);
    }

    const wonCountMap = new Map<string, number>();
    for (const result of results) {
        wonCountMap.set(result.prizeTierId, result._count._all);
    }

    const tiers: DrawTierState[] = campaign.prizeTiers.map((tier) => {
        const wonCount = wonCountMap.get(tier.id) ?? 0;
        const remaining = Math.max(0, tier.quantity - wonCount);

        return {
            ...tier,
            wonCount,
            remaining,
            isComplete: remaining === 0,
        };
    });

    const currentTier = tiers.find((tier) => !tier.isComplete) ?? null;
    const excludedWinners = await db.drawResult.count({
        where: { campaignId },
    });

    return {
        campaign: {
            id: campaign.id,
            title: campaign.title,
            bannerUrl: campaign.bannerUrl,
            status: campaign.status,
        },
        totalParticipants,
        excludedWinners,
        currentTierId: currentTier?.id ?? null,
        tiers,
    };
}

export async function executeDraw(
    campaignId: string,
    prizeTierId: string,
): Promise<ExecuteDrawResult> {
    const campaign = await db.campaign.findFirst({
        where: { id: campaignId, isDeleted: false },
        select: { id: true, status: true },
    });

    if (!campaign) {
        throw new DrawServiceError("CAMPAIGN_NOT_FOUND", "ไม่พบแคมเปญ", 404);
    }

    const tier = await db.prizeTier.findFirst({
        where: { id: prizeTierId, campaignId, isDeleted: false },
        select: {
            id: true,
            quantity: true,
        },
    });

    if (!tier) {
        throw new DrawServiceError(
            "PRIZE_TIER_NOT_FOUND",
            "ไม่พบรางวัลที่เลือก",
            404,
        );
    }

    const wonCount = await db.drawResult.count({
        where: { campaignId, prizeTierId: tier.id },
    });

    const remaining = Math.max(0, tier.quantity - wonCount);
    if (remaining <= 0) {
        throw new DrawServiceError(
            "PRIZE_TIER_COMPLETED",
            "รางวัลนี้จับครบแล้ว",
            409,
        );
    }

    const alreadyWon = await db.drawResult.findMany({
        where: { campaignId },
        select: { participantId: true },
    });

    const excludedIds = alreadyWon.map((item) => item.participantId);
    const eligibleParticipants = await db.participant.findMany({
        where: {
            campaignId,
            isDeleted: false,
            id: {
                notIn: excludedIds,
            },
        },
        select: {
            id: true,
            employeeId: true,
            name: true,
            mobile: true,
        },
    });

    if (!eligibleParticipants.length) {
        throw new DrawServiceError(
            "NO_ELIGIBLE_PARTICIPANTS",
            "ไม่มีผู้เข้าร่วมที่สุ่มได้แล้ว",
            409,
        );
    }

    const drawCount = Math.min(
        DRAW_BATCH_SIZE,
        remaining,
        eligibleParticipants.length,
    );

    const winners = pickRandomDistinct(eligibleParticipants, drawCount);
    const nonce = randomUUID();

    const session = await db.$transaction(async (tx) => {
        if (campaign.status === "DRAFT") {
            await tx.campaign.update({
                where: { id: campaign.id },
                data: { status: "ACTIVE" },
            });
        }

        const createdSession = await tx.drawSession.create({
            data: {
                campaignId,
                prizeTierId: tier.id,
                state: "COMPLETED",
                nonce,
            },
            select: { id: true },
        });

        await tx.drawResult.createMany({
            data: winners.map((winner) => ({
                campaignId,
                drawSessionId: createdSession.id,
                participantId: winner.id,
                prizeTierId: tier.id,
            })),
        });

        const [drawnCount, prizeAgg] = await Promise.all([
            tx.drawResult.count({ where: { campaignId } }),
            tx.prizeTier.aggregate({
                where: { campaignId, isDeleted: false },
                _sum: { quantity: true },
            }),
        ]);

        const totalPrizeQuantity = prizeAgg._sum.quantity ?? 0;
        if (totalPrizeQuantity > 0 && drawnCount >= totalPrizeQuantity) {
            await tx.campaign.update({
                where: { id: campaign.id },
                data: { status: "COMPLETED" },
            });
        }

        return createdSession;
    });

    const newRemaining = Math.max(0, remaining - drawCount);

    return {
        sessionId: session.id,
        prizeTierId: tier.id,
        drawCount,
        remaining: newRemaining,
        isTierComplete: newRemaining === 0,
        winners: winners.map((winner) => ({
            participantId: winner.id,
            employeeId: winner.employeeId,
            name: winner.name,
            mobile: winner.mobile,
        })),
    };
}

export async function getTierWinners(
    campaignId: string,
    prizeTierId: string,
): Promise<DrawWinner[]> {
    const results = await db.drawResult.findMany({
        where: { campaignId, prizeTierId },
        orderBy: [{ createdAt: "asc" }],
        select: {
            participant: {
                select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    mobile: true,
                },
            },
        },
    });

    return results.map((item) => ({
        participantId: item.participant.id,
        employeeId: item.participant.employeeId,
        name: item.participant.name,
        mobile: item.participant.mobile,
    }));
}
