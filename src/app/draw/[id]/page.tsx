import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getCampaign } from "@/lib/campaigns";
import { DrawClient } from "./draw-client";

type Props = { params: Promise<{ id: string }> };

export default async function DrawPage({ params }: Props) {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const { id } = await params;
    const campaign = await getCampaign(id);

    if (!campaign) {
        notFound();
    }

    return (
        <DrawClient
            campaignId={campaign.id}
            initialBannerUrl={campaign.bannerUrl}
        />
    );
}
