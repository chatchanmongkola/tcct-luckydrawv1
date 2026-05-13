import { db } from "@/lib/db";

export type CampaignSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export async function listCampaignSummaries(): Promise<CampaignSummary[]> {
  const campaigns = await db.campaign.findMany({
    where: { isDeleted: false },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      bannerUrl: true,
      status: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
  });

  return campaigns.map((campaign) => ({
    ...campaign,
    status: campaign.status,
    startsAt: campaign.startsAt?.toISOString() ?? null,
    endsAt: campaign.endsAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
  }));
}
