import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

type AccessLogRow = {
    id: string;
    actorId: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    campaignId: string | null;
    metadata: unknown;
    createdAt: Date;
};

export type AccessLogMappedRow = AccessLogRow & {
    actorDisplay: string;
    campaignDisplay: string;
    targetDisplay: string;
};

export type AccessLogFilters = {
    action?: string | null;
    actorId?: string | null;
};

export type AccessLogListOptions = {
    limit?: number;
    offset?: number;
};

export type AccessLogFilterOptions = {
    actions: string[];
    users: Array<{ actorId: string; label: string }>;
};

type CreateAccessLogInput = {
    actorId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    campaignId?: string | null;
    metadata?: Record<string, unknown> | null;
};

let tableEnsured = false;

async function ensureAccessLogsTable() {
    if (tableEnsured) return;

    await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "access_logs" (
            "id" UUID PRIMARY KEY,
            "actor_id" UUID NULL,
            "action" TEXT NOT NULL,
            "target_type" TEXT NULL,
            "target_id" TEXT NULL,
            "campaign_id" UUID NULL,
            "metadata" JSONB NULL,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    tableEnsured = true;
}

export async function createAccessLog(input: CreateAccessLogInput) {
    await ensureAccessLogsTable();

    await db.$executeRawUnsafe(
        `
        INSERT INTO "access_logs"
            ("id", "actor_id", "action", "target_type", "target_id", "campaign_id", "metadata", "created_at")
        VALUES
            ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        `,
        randomUUID(),
        input.actorId ?? null,
        input.action,
        input.targetType ?? null,
        input.targetId ?? null,
        input.campaignId ?? null,
        JSON.stringify(input.metadata ?? null),
    );
}

export async function createAccessLogSafe(input: CreateAccessLogInput) {
    try {
        await createAccessLog(input);
    } catch (error) {
        console.error("Failed to create access log", error);
    }
}

export async function listAllAccessLogs(): Promise<AccessLogRow[]> {
    await ensureAccessLogsTable();

    const rows = (await db.$queryRawUnsafe(
        `
        SELECT
            "id",
            "actor_id" AS "actorId",
            "action",
            "target_type" AS "targetType",
            "target_id" AS "targetId",
            "campaign_id" AS "campaignId",
            "metadata",
            "created_at" AS "createdAt"
        FROM "access_logs"
        ORDER BY "created_at" DESC
        `,
    )) as AccessLogRow[];

    return rows;
}

function normalizeAccessLogFilters(filters?: AccessLogFilters) {
    const action = filters?.action?.trim() || null;
    const actorIdRaw = filters?.actorId?.trim() || null;
    const actorId =
        actorIdRaw &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            actorIdRaw,
        )
            ? actorIdRaw
            : null;

    return { action, actorId };
}

export async function countAccessLogs(filters?: AccessLogFilters): Promise<number> {
    await ensureAccessLogsTable();

    const normalized = normalizeAccessLogFilters(filters);
    const rows = (await db.$queryRawUnsafe(
        `
        SELECT COUNT(*)::int AS "count"
        FROM "access_logs" l
        WHERE ($1::text IS NULL OR l."action" = $1)
          AND ($2::uuid IS NULL OR l."actor_id" = $2::uuid)
        `,
        normalized.action,
        normalized.actorId,
    )) as Array<{ count: number }>;

    return rows[0]?.count ?? 0;
}

export async function listAccessLogsMapped(
    filters?: AccessLogFilters,
    options?: AccessLogListOptions,
): Promise<AccessLogMappedRow[]> {
    await ensureAccessLogsTable();

    const normalized = normalizeAccessLogFilters(filters);
    const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
    const offset = Math.max(0, options?.offset ?? 0);

    const rows = (await db.$queryRawUnsafe(
        `
        SELECT
            l."id",
            l."actor_id" AS "actorId",
            l."action",
            l."target_type" AS "targetType",
            l."target_id" AS "targetId",
            l."campaign_id" AS "campaignId",
            l."metadata",
            l."created_at" AS "createdAt",
            COALESCE(NULLIF(TRIM(u."name"), ''), u."username", u."email", l."actor_id"::text, '-') AS "actorDisplay",
            COALESCE(c."title", l."campaign_id"::text, '-') AS "campaignDisplay",
            CASE
                WHEN l."target_type" = 'campaign' THEN COALESCE(tc."title", l."target_id", '-')
                WHEN l."target_type" = 'user' THEN COALESCE(NULLIF(TRIM(tu."name"), ''), tu."username", tu."email", l."target_id", '-')
                WHEN l."target_type" = 'prize_tier' THEN COALESCE(tp."tier_name", l."target_id", '-')
                ELSE COALESCE(l."target_id", '-')
            END AS "targetDisplay"
        FROM "access_logs" l
        LEFT JOIN "users" u ON u."id" = l."actor_id"
        LEFT JOIN "campaigns" c ON c."id" = l."campaign_id"
        LEFT JOIN "campaigns" tc
            ON l."target_type" = 'campaign' AND tc."id"::text = l."target_id"
        LEFT JOIN "users" tu
            ON l."target_type" = 'user' AND tu."id"::text = l."target_id"
        LEFT JOIN "prize_tiers" tp
            ON l."target_type" = 'prize_tier' AND tp."id"::text = l."target_id"
        WHERE ($1::text IS NULL OR l."action" = $1)
          AND ($2::uuid IS NULL OR l."actor_id" = $2::uuid)
        ORDER BY l."created_at" DESC
        LIMIT $3 OFFSET $4
        `,
        normalized.action,
        normalized.actorId,
        limit,
        offset,
    )) as AccessLogMappedRow[];

    return rows;
}

export async function listAccessLogsMappedForExport(
    filters?: AccessLogFilters,
): Promise<AccessLogMappedRow[]> {
    await ensureAccessLogsTable();

    const normalized = normalizeAccessLogFilters(filters);

    const rows = (await db.$queryRawUnsafe(
        `
        SELECT
            l."id",
            l."actor_id" AS "actorId",
            l."action",
            l."target_type" AS "targetType",
            l."target_id" AS "targetId",
            l."campaign_id" AS "campaignId",
            l."metadata",
            l."created_at" AS "createdAt",
            COALESCE(NULLIF(TRIM(u."name"), ''), u."username", u."email", l."actor_id"::text, '-') AS "actorDisplay",
            COALESCE(c."title", l."campaign_id"::text, '-') AS "campaignDisplay",
            CASE
                WHEN l."target_type" = 'campaign' THEN COALESCE(tc."title", l."target_id", '-')
                WHEN l."target_type" = 'user' THEN COALESCE(NULLIF(TRIM(tu."name"), ''), tu."username", tu."email", l."target_id", '-')
                WHEN l."target_type" = 'prize_tier' THEN COALESCE(tp."tier_name", l."target_id", '-')
                ELSE COALESCE(l."target_id", '-')
            END AS "targetDisplay"
        FROM "access_logs" l
        LEFT JOIN "users" u ON u."id" = l."actor_id"
        LEFT JOIN "campaigns" c ON c."id" = l."campaign_id"
        LEFT JOIN "campaigns" tc
            ON l."target_type" = 'campaign' AND tc."id"::text = l."target_id"
        LEFT JOIN "users" tu
            ON l."target_type" = 'user' AND tu."id"::text = l."target_id"
        LEFT JOIN "prize_tiers" tp
            ON l."target_type" = 'prize_tier' AND tp."id"::text = l."target_id"
        WHERE ($1::text IS NULL OR l."action" = $1)
          AND ($2::uuid IS NULL OR l."actor_id" = $2::uuid)
        ORDER BY l."created_at" DESC
        `,
        normalized.action,
        normalized.actorId,
    )) as AccessLogMappedRow[];

    return rows;
}

export async function getAccessLogFilterOptions(): Promise<AccessLogFilterOptions> {
    await ensureAccessLogsTable();

    const actionRows = (await db.$queryRawUnsafe(
        `
        SELECT DISTINCT l."action"
        FROM "access_logs" l
        ORDER BY l."action" ASC
        `,
    )) as Array<{ action: string }>;

    const userRows = (await db.$queryRawUnsafe(
        `
        SELECT DISTINCT
            l."actor_id"::text AS "actorId",
            COALESCE(NULLIF(TRIM(u."name"), ''), u."username", u."email", l."actor_id"::text) AS "label"
        FROM "access_logs" l
        LEFT JOIN "users" u ON u."id" = l."actor_id"
        WHERE l."actor_id" IS NOT NULL
        ORDER BY "label" ASC
        `,
    )) as Array<{ actorId: string; label: string }>;

    return {
        actions: actionRows.map((row) => row.action),
        users: userRows,
    };
}
