import { notFound } from "next/navigation";

import { getCampaign } from "@/lib/campaigns";
import { EditForm } from "./edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditCampaignPage({ params }: Props) {
    const { id } = await params;
    const campaign = await getCampaign(id);

    if (!campaign) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-6">
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Edit Event
                </p>
                <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
                    {campaign.title}
                </h1>
            </div>

            <EditForm campaign={campaign} />
        </div>
    );
}
