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
    name: string | null;
    mobile: string | null;
};

export type ExecuteDrawResult = {
    sessionId: string;
    prizeTierId: string;
    drawCount: number;
    remaining: number;
    isTierComplete: boolean;
    audit: {
        algorithm: string;
        nonce: string;
        drawnAt: string;
        batchSize: number;
        eligibleCountBeforeDraw: number;
    };
    winners: DrawWinner[];
};

export type CampaignHistoryTier = {
    id: string;
    tierName: string;
    description: string | null;
    quantity: number;
    sortOrder: number;
    wonCount: number;
    isComplete: boolean;
    winners: Array<
        DrawWinner & {
            drawnAt: string;
            drawSessionId: string;
            nonce: string;
        }
    >;
    sessions: Array<{
        id: string;
        nonce: string;
        drawnAt: string;
        winnerCount: number;
    }>;
};

export type CampaignHistory = {
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
    tiers: CampaignHistoryTier[];
};

export type CampaignDrawAudit = {
    campaignId: string;
    sessions: Array<{
        sessionId: string;
        prizeTierId: string;
        prizeTierName: string;
        nonce: string;
        drawnAt: string;
        winnerCount: number;
        algorithm: string;
    }>;
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
        throw new DrawServiceError(
            "CAMPAIGN_NOT_FOUND",
            "Campaign not found.",
            404,
        );
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
        throw new DrawServiceError(
            "CAMPAIGN_NOT_FOUND",
            "Campaign not found.",
            404,
        );
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
            "Selected prize tier not found.",
            404,
        );
    }

    const txResult = await db.$transaction(async (tx) => {
        // Lock by campaign+tier to prevent overlapping draws for the same bucket.
        await tx.$executeRawUnsafe(
            `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
            campaignId,
            tier.id,
        );

        const wonCount = await tx.drawResult.count({
            where: { campaignId, prizeTierId: tier.id },
        });

        const remaining = Math.max(0, tier.quantity - wonCount);
        if (remaining <= 0) {
            throw new DrawServiceError(
                "PRIZE_TIER_COMPLETED",
                "This prize tier is already completed.",
                409,
            );
        }

        const alreadyWon = await tx.drawResult.findMany({
            where: { campaignId },
            select: { participantId: true },
        });

        const excludedIds = alreadyWon.map((item) => item.participantId);
        const eligibleParticipants = await tx.participant.findMany({
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
                "No eligible participants remaining.",
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
            select: { id: true, nonce: true, drawnAt: true },
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

        return {
            session: createdSession,
            winners,
            drawCount,
            remainingAfter: Math.max(0, remaining - drawCount),
            eligibleCountBeforeDraw: eligibleParticipants.length,
        };
    });

    return {
        sessionId: txResult.session.id,
        prizeTierId: tier.id,
        drawCount: txResult.drawCount,
        remaining: txResult.remainingAfter,
        isTierComplete: txResult.remainingAfter === 0,
        audit: {
            algorithm: "node:crypto.randomInt",
            nonce: txResult.session.nonce,
            drawnAt: txResult.session.drawnAt.toISOString(),
            batchSize: DRAW_BATCH_SIZE,
            eligibleCountBeforeDraw: txResult.eligibleCountBeforeDraw,
        },
        winners: txResult.winners.map((winner) => ({
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

export async function getCampaignHistory(
    campaignId: string,
): Promise<CampaignHistory> {
    const [campaign, participantsCount, sessions] = await Promise.all([
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
                drawResults: {
                    orderBy: [{ createdAt: "asc" }],
                    select: {
                        drawSessionId: true,
                        prizeTierId: true,
                        createdAt: true,
                        drawSession: {
                            select: {
                                nonce: true,
                            },
                        },
                        participant: {
                            select: {
                                id: true,
                                employeeId: true,
                                name: true,
                                mobile: true,
                            },
                        },
                    },
                },
            },
        }),
        db.participant.count({
            where: { campaignId, isDeleted: false },
        }),
        db.drawSession.findMany({
            where: { campaignId },
            orderBy: [{ drawnAt: "asc" }],
            select: {
                id: true,
                prizeTierId: true,
                nonce: true,
                drawnAt: true,
                _count: {
                    select: {
                        results: true,
                    },
                },
            },
        }),
    ]);

    if (!campaign) {
        throw new DrawServiceError(
            "CAMPAIGN_NOT_FOUND",
            "Campaign not found.",
            404,
        );
    }

    const winnerMap = new Map<string, CampaignHistoryTier["winners"]>();
    for (const result of campaign.drawResults) {
        const current = winnerMap.get(result.prizeTierId) ?? [];
        current.push({
            participantId: result.participant.id,
            employeeId: result.participant.employeeId,
            name: result.participant.name,
            mobile: result.participant.mobile,
            drawnAt: result.createdAt.toISOString(),
            drawSessionId: result.drawSessionId,
            nonce: result.drawSession.nonce,
        });
        winnerMap.set(result.prizeTierId, current);
    }

    const sessionMap = new Map<string, CampaignHistoryTier["sessions"]>();
    for (const session of sessions) {
        const current = sessionMap.get(session.prizeTierId) ?? [];
        current.push({
            id: session.id,
            nonce: session.nonce,
            drawnAt: session.drawnAt.toISOString(),
            winnerCount: session._count.results,
        });
        sessionMap.set(session.prizeTierId, current);
    }

    const tiers: CampaignHistoryTier[] = campaign.prizeTiers.map((tier) => {
        const winners = winnerMap.get(tier.id) ?? [];
        return {
            id: tier.id,
            tierName: tier.tierName,
            description: tier.description,
            quantity: tier.quantity,
            sortOrder: tier.sortOrder,
            wonCount: winners.length,
            isComplete: winners.length >= tier.quantity,
            winners,
            sessions: sessionMap.get(tier.id) ?? [],
        };
    });

    const totalPrizes = tiers.reduce((sum, tier) => sum + tier.quantity, 0);
    const totalDrawn = tiers.reduce((sum, tier) => sum + tier.wonCount, 0);

    return {
        campaign: {
            id: campaign.id,
            title: campaign.title,
            bannerUrl: campaign.bannerUrl,
            status: campaign.status,
        },
        totals: {
            participants: participantsCount,
            tiers: tiers.length,
            prizes: totalPrizes,
            drawn: totalDrawn,
        },
        tiers,
    };
}

export async function getCampaignDrawAudit(
    campaignId: string,
): Promise<CampaignDrawAudit> {
    const campaign = await db.campaign.findFirst({
        where: { id: campaignId, isDeleted: false },
        select: { id: true },
    });

    if (!campaign) {
        throw new DrawServiceError(
            "CAMPAIGN_NOT_FOUND",
            "Campaign not found.",
            404,
        );
    }

    const sessions = await db.drawSession.findMany({
        where: { campaignId },
        orderBy: [{ drawnAt: "asc" }],
        select: {
            id: true,
            nonce: true,
            drawnAt: true,
            prizeTierId: true,
            prizeTier: {
                select: {
                    tierName: true,
                },
            },
            _count: {
                select: {
                    results: true,
                },
            },
        },
    });

    return {
        campaignId,
        sessions: sessions.map((session) => ({
            sessionId: session.id,
            prizeTierId: session.prizeTierId,
            prizeTierName: session.prizeTier.tierName,
            nonce: session.nonce,
            drawnAt: session.drawnAt.toISOString(),
            winnerCount: session._count.results,
            algorithm: "node:crypto.randomInt",
        })),
    };
}
