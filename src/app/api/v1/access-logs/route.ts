import { z } from "zod";

import { auth } from "@/lib/auth";
import { createAccessLogSafe } from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";

const clientActionSchema = z.object({
    action: z
        .string()
        .min(3)
        .max(100)
        .regex(/^[A-Z0-9_]+$/, "Action must be UPPER_SNAKE_CASE."),
    campaignId: z.string().uuid().optional().nullable(),
    targetType: z.string().min(1).max(100).optional().nullable(),
    targetId: z.string().min(1).max(191).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }

        const json = await request.json();
        const parsed = clientActionSchema.safeParse(json);
        if (!parsed.success) {
            return fail("Invalid input.", "VALIDATION_ERROR", {
                status: 400,
            });
        }

        await createAccessLogSafe({
            actorId: session.user.id,
            action: parsed.data.action,
            campaignId: parsed.data.campaignId ?? null,
            targetType: parsed.data.targetType ?? null,
            targetId: parsed.data.targetId ?? null,
            metadata: parsed.data.metadata ?? null,
        });

        return ok({ logged: true });
    } catch (error) {
        console.error("Failed to record access log", error);
        return fail(
            "Failed to record access log.",
            "ACCESS_LOG_CREATE_FAILED",
            {
                status: 500,
            },
        );
    }
}
