import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isAdminRole, isStaffRole } from "@/lib/roles";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    if (isStaffRole(session.user.role)) {
        redirect("/campaigns");
    }

    if (!isAdminRole(session.user.role) && session.user.role !== "USER") {
        redirect("/campaigns");
    }

    return <SettingsClient />;
}
