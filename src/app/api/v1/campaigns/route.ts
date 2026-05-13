import { fail, ok } from "@/lib/api-response";
import { listCampaignSummaries } from "@/lib/campaigns";

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
