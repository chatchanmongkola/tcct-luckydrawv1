import { fail, ok } from "@/lib/api-response";
import {
    DrawServiceError,
    getCampaignHistory,
} from "@/services/draw.service";

type Params = { params: Promise<{ id: string }> };

function handleHistoryError(error: unknown) {
    if (error instanceof DrawServiceError) {
        return fail(error.message, error.code, { status: error.status });
    }

    return fail("Failed to load draw history.", "HISTORY_INTERNAL_ERROR", {
        status: 500,
    });
}

export async function GET(_request: Request, { params }: Params) {
    try {
        const { id } = await params;
        const history = await getCampaignHistory(id);
        return ok(history);
    } catch (error) {
        console.error("Failed to load campaign history", error);
        return handleHistoryError(error);
    }
}
