import { auth } from "@/lib/auth";
import { createAccessLogSafe } from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";
import { createCampaign, listCampaignSummaries } from "@/lib/campaigns";
import { createCampaignSchema } from "@/lib/validations";

export async function GET() {
    try {
        const campaigns = await listCampaignSummaries();
        return ok(campaigns);
    } catch (error) {
        console.error("Failed to list campaigns", error);
        return fail("Failed to load events.", "CAMPAIGN_LIST_FAILED", {
            status: 500,
        });
    }
}

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const parsed = createCampaignSchema.safeParse(json);

        if (!parsed.success) {
            return fail("Invalid input.", "VALIDATION_ERROR", {
                status: 400,
            });
        }

        const campaign = await createCampaign(parsed.data);

        const session = await auth();
        if (session?.user) {
            await createAccessLogSafe({
                actorId: session.user.id,
                action: "CAMPAIGN_CREATE",
                targetType: "campaign",
                targetId: campaign.id,
                campaignId: campaign.id,
                metadata: {
                    title: parsed.data.title,
                },
            });
        }

        return ok(campaign, { status: 201 });
    } catch (error) {
        console.error("Failed to create campaign", error);
        return fail("Failed to create event.", "CAMPAIGN_CREATE_FAILED", {
            status: 500,
        });
    }
}
