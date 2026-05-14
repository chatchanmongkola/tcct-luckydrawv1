import { notFound } from "next/navigation";

import { getCampaign } from "@/lib/campaigns";
import { HistoryClient } from "./history-client";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignHistoryPage({ params }: Props) {
    const { id } = await params;
    const campaign = await getCampaign(id);

    if (!campaign) {
        notFound();
    }

    return <HistoryClient campaignId={id} initialTitle={campaign.title} />;
}
