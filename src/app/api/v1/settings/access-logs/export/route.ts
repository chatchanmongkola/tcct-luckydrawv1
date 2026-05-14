import { auth } from "@/lib/auth";
import { createAccessLog, listAllAccessLogs } from "@/lib/access-logs";
import { fail } from "@/lib/api-response";
import { isStaffRole } from "@/lib/roles";

function toCsvCell(value: unknown) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }

        if (isStaffRole(session.user.role)) {
            return fail("You do not have permission to access settings.", "FORBIDDEN", {
                status: 403,
            });
        }

        await createAccessLog({
            actorId: session.user.id,
            action: "ACCESS_LOG_EXPORT",
            targetType: "access_logs",
            metadata: {
                source: "settings_export",
            },
        });

        const logs = await listAllAccessLogs();

        const header = [
            "id",
            "actor_id",
            "action",
            "target_type",
            "target_id",
            "campaign_id",
            "metadata",
            "created_at",
        ];

        const rows = logs.map((row) => [
            row.id,
            row.actorId,
            row.action,
            row.targetType,
            row.targetId,
            row.campaignId,
            JSON.stringify(row.metadata ?? null),
            new Date(row.createdAt).toISOString(),
        ]);

        const csv = [header, ...rows]
            .map((line) => line.map((cell) => toCsvCell(cell)).join(","))
            .join("\n");

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": "attachment; filename=access-logs.csv",
            },
        });
    } catch (error) {
        console.error("Failed to export access logs", error);
        return fail("Failed to export access logs.", "ACCESS_LOG_EXPORT_FAILED", {
            status: 500,
        });
    }
}
