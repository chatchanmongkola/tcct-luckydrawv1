import { fail, ok } from "@/lib/api-response";
import { deleteCampaign, getCampaign, updateCampaign } from "@/lib/campaigns";
import { updateCampaignSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
    try {
        const { id } = await params;
        const campaign = await getCampaign(id);

        if (!campaign) {
            return fail("ไม่พบอีเวนต์", "CAMPAIGN_NOT_FOUND", { status: 404 });
        }

        return ok(campaign);
    } catch (error) {
        console.error("Failed to get campaign", error);
        return fail("ไม่สามารถดึงข้อมูลอีเวนต์ได้", "CAMPAIGN_GET_FAILED", {
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
            return fail("ข้อมูลไม่ถูกต้อง", "VALIDATION_ERROR", {
                status: 400,
            });
        }

        const existing = await getCampaign(id);
        if (!existing) {
            return fail("ไม่พบอีเวนต์", "CAMPAIGN_NOT_FOUND", { status: 404 });
        }

        const updated = await updateCampaign(id, parsed.data);
        return ok(updated);
    } catch (error) {
        console.error("Failed to update campaign", error);
        return fail("ไม่สามารถแก้ไขอีเวนต์ได้", "CAMPAIGN_UPDATE_FAILED", {
            status: 500,
        });
    }
}

export async function DELETE(_req: Request, { params }: Params) {
    try {
        const { id } = await params;

        const existing = await getCampaign(id);
        if (!existing) {
            return fail("ไม่พบอีเวนต์", "CAMPAIGN_NOT_FOUND", { status: 404 });
        }

        const deleted = await deleteCampaign(id);
        return ok(deleted);
    } catch (error) {
        console.error("Failed to delete campaign", error);
        return fail("ไม่สามารถลบอีเวนต์ได้", "CAMPAIGN_DELETE_FAILED", {
            status: 500,
        });
    }
}
