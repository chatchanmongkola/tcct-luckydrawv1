import { auth } from "@/lib/auth";
import { createAccessLog } from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";
import { db } from "@/lib/db";
import { isStaffRole } from "@/lib/roles";

export async function POST(request: Request) {
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

        const body = await request.json().catch(() => null);
        const password =
            typeof body?.password === "string" ? body.password.trim() : "";
        const clearDataPassword =
            process.env.CLEAR_ALL_DATA_PASSWORD ?? "Lucky888";

        if (!password) {
            return fail("Clear-data password is required.", "PASSWORD_REQUIRED", {
                status: 400,
            });
        }

        if (password !== clearDataPassword) {
            return fail("Invalid clear-data password.", "INVALID_PASSWORD", {
                status: 403,
            });
        }

        const [campaignResult, participantResult, prizeTierResult] =
            await db.$transaction([
                db.campaign.updateMany({
                    where: { isDeleted: false },
                    data: { isDeleted: true, status: "ARCHIVED" },
                }),
                db.participant.updateMany({
                    where: { isDeleted: false },
                    data: { isDeleted: true },
                }),
                db.prizeTier.updateMany({
                    where: { isDeleted: false },
                    data: { isDeleted: true },
                }),
            ]);

        await createAccessLog({
            actorId: session.user.id,
            action: "CLEAR_ALL_DATA",
            targetType: "campaign",
            metadata: {
                campaigns: campaignResult.count,
                participants: participantResult.count,
                prizeTiers: prizeTierResult.count,
            },
        });

        return ok({
            campaigns: campaignResult.count,
            participants: participantResult.count,
            prizeTiers: prizeTierResult.count,
        });
    } catch (error) {
        console.error("Failed to clear all data", error);
        return fail("Failed to clear all data.", "CLEAR_ALL_DATA_FAILED", {
            status: 500,
        });
    }
}
