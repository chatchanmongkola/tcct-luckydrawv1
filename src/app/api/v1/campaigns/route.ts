import { fail, ok } from "@/lib/api-response";
import { createCampaign, listCampaignSummaries } from "@/lib/campaigns";
import { createCampaignSchema } from "@/lib/validations";

export async function GET() {
    try {
        const campaigns = await listCampaignSummaries();
        return ok(campaigns);
    } catch (error) {
        console.error("Failed to list campaigns", error);
        return fail("ไม่สามารถดึงรายการอีเวนต์ได้", "CAMPAIGN_LIST_FAILED", {
            status: 500,
        });
    }
}

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const parsed = createCampaignSchema.safeParse(json);

        if (!parsed.success) {
            return fail("ข้อมูลไม่ถูกต้อง", "VALIDATION_ERROR", {
                status: 400,
            });
        }

        const campaign = await createCampaign(parsed.data);
        return ok(campaign, { status: 201 });
    } catch (error) {
        console.error("Failed to create campaign", error);
        return fail("ไม่สามารถสร้างอีเวนต์ได้", "CAMPAIGN_CREATE_FAILED", {
            status: 500,
        });
    }
}
