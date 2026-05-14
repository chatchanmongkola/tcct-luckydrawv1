import { auth } from "@/lib/auth";
import {
    countAccessLogs,
    getAccessLogFilterOptions,
    listAccessLogsMapped,
} from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";
import { isStaffRole } from "@/lib/roles";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }

        if (isStaffRole(session.user.role)) {
            return fail(
                "You do not have permission to access settings.",
                "FORBIDDEN",
                {
                    status: 403,
                },
            );
        }

        const url = new URL(request.url);
        const action = url.searchParams.get("action");
        const actorId = url.searchParams.get("actorId");
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

        const safePage =
            Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
        const safePageSize =
            Number.isFinite(pageSize) && pageSize > 0
                ? Math.min(Math.floor(pageSize), 200)
                : 50;
        const offset = (safePage - 1) * safePageSize;

        const filters = {
            action,
            actorId,
        };

        const [total, rows, filterOptions] = await Promise.all([
            countAccessLogs(filters),
            listAccessLogsMapped(filters, {
                limit: safePageSize,
                offset,
            }),
            getAccessLogFilterOptions(),
        ]);

        return ok({
            rows,
            page: safePage,
            pageSize: safePageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / safePageSize)),
            filters: {
                action: action ?? "",
                actorId: actorId ?? "",
            },
            filterOptions,
        });
    } catch (error) {
        console.error("Failed to list access logs", error);
        return fail("Failed to load access logs.", "ACCESS_LOG_LIST_FAILED", {
            status: 500,
        });
    }
}
