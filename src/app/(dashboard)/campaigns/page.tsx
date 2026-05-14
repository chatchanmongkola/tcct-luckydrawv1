import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";

import { CampaignsClient } from "./campaigns-client";

export default async function CampaignsPage() {
    const session = await auth();
    const canDeleteEvents = !isStaffRole(session?.user?.role);

    return <CampaignsClient canDeleteEvents={canDeleteEvents} />;
}
