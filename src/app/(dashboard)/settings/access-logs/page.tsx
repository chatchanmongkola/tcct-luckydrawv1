import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";

import { AccessLogsClient } from "./access-logs-client";

export default async function AccessLogsPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    if (isStaffRole(session.user.role)) {
        redirect("/campaigns");
    }

    return <AccessLogsClient />;
}
