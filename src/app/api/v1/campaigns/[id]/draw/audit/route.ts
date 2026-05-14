import { fail, ok } from "@/lib/api-response";
import {
    DrawServiceError,
    getCampaignDrawAudit,
} from "@/services/draw.service";

type Params = { params: Promise<{ id: string }> };

function handleAuditError(error: unknown) {
    if (error instanceof DrawServiceError) {
        return fail(error.message, error.code, { status: error.status });
    }

    return fail("Failed to load draw audit.", "DRAW_AUDIT_INTERNAL_ERROR", {
        status: 500,
    });
}

export async function GET(_request: Request, { params }: Params) {
    try {
        const { id } = await params;
        const audit = await getCampaignDrawAudit(id);
        return ok(audit);
    } catch (error) {
        console.error("Failed to load draw audit", error);
        return handleAuditError(error);
    }
}
