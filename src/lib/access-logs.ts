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
