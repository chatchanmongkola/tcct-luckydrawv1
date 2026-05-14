import { fail, ok } from "@/lib/api-response";
import { drawRequestSchema } from "@/lib/validations";
import {
    DrawServiceError,
    executeDraw,
    getDrawState,
} from "@/services/draw.service";

type Params = { params: Promise<{ id: string }> };

function handleDrawError(error: unknown) {
    if (error instanceof DrawServiceError) {
        return fail(error.message, error.code, { status: error.status });
    }

    return fail("Unexpected draw system error.", "DRAW_INTERNAL_ERROR", {
        status: 500,
    });
}

export async function GET(_request: Request, { params }: Params) {
    try {
        const { id } = await params;
        const state = await getDrawState(id);
        return ok(state);
    } catch (error) {
        console.error("Failed to load draw state", error);
        return handleDrawError(error);
    }
}

export async function POST(request: Request, { params }: Params) {
    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = drawRequestSchema.safeParse(body);

        if (!parsed.success) {
            return fail("Invalid input.", "VALIDATION_ERROR", {
                status: 400,
            });
        }

        const result = await executeDraw(id, parsed.data.prizeTierId);
        return ok(result);
    } catch (error) {
        console.error("Failed to execute draw", error);
        return handleDrawError(error);
    }
}
