import { auth } from "@/lib/auth";
import { createAccessLogSafe } from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";
import { deleteCampaign, getCampaign, updateCampaign } from "@/lib/campaigns";
import { isStaffRole } from "@/lib/roles";
import { updateCampaignSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
    try {
        const { id } = await params;
        const campaign = await getCampaign(id);

        if (!campaign) {
            return fail("Event not found.", "CAMPAIGN_NOT_FOUND", {
                status: 404,
            });
        }

        return ok(campaign);
    } catch (error) {
        console.error("Failed to get campaign", error);
        return fail("Failed to load event.", "CAMPAIGN_GET_FAILED", {
            status: 500,
        });
    }
}

export async function PATCH(request: Request, { params }: Params) {
    try {
        const { id } = await params;
        const json = await request.json();
        const parsed = updateCampaignSchema.safeParse(json);

        if (!parsed.success) {
            return fail("Invalid input.", "VALIDATION_ERROR", {
                status: 400,
            });
        }

        const existing = await getCampaign(id);
        if (!existing) {
            return fail("Event not found.", "CAMPAIGN_NOT_FOUND", {
                status: 404,
            });
        }

        if (existing.status === "COMPLETED" || existing.status === "ARCHIVED") {
            return fail(
                "Completed events cannot be edited.",
                "CAMPAIGN_LOCKED",
                { status: 409 },
            );
        }

        const updated = await updateCampaign(id, parsed.data);

        const session = await auth();
        if (session?.user) {
            await createAccessLogSafe({
                actorId: session.user.id,
                action: "CAMPAIGN_EDIT",
                targetType: "campaign",
                targetId: id,
                campaignId: id,
                metadata: {
                    title: parsed.data.title,
                },
            });
        }

        return ok(updated);
    } catch (error) {
        console.error("Failed to update campaign", error);
        return fail("Failed to update event.", "CAMPAIGN_UPDATE_FAILED", {
            status: 500,
        });
    }
}

export async function DELETE(_req: Request, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }

        if (isStaffRole(session.user.role)) {
            return fail(
                "You do not have permission to delete events.",
                "FORBIDDEN",
                {
                    status: 403,
                },
            );
        }

        const body = await _req.json().catch(() => null);
        const password =
            typeof body?.password === "string" ? body.password.trim() : "";
        const deletePassword = process.env.DELETE_EVENT_PASSWORD ?? "Lucky";

        if (!password) {
            return fail("Delete password is required.", "PASSWORD_REQUIRED", {
                status: 400,
            });
        }

        if (password !== deletePassword) {
            return fail("Invalid delete password.", "INVALID_PASSWORD", {
                status: 403,
            });
        }

        const { id } = await params;

        const existing = await getCampaign(id);
        if (!existing) {
            return fail("Event not found.", "CAMPAIGN_NOT_FOUND", {
                status: 404,
            });
        }

        const deleted = await deleteCampaign(id);

        await createAccessLogSafe({
            actorId: session.user.id,
            action: "CAMPAIGN_DELETE",
            targetType: "campaign",
            targetId: id,
            campaignId: id,
            metadata: {
                title: existing.title,
            },
        });

        return ok(deleted);
    } catch (error) {
        console.error("Failed to delete campaign", error);
        return fail("Failed to delete event.", "CAMPAIGN_DELETE_FAILED", {
            status: 500,
        });
    }
}
