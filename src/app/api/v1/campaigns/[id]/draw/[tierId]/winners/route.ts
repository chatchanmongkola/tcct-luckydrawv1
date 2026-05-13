import { fail, ok } from "@/lib/api-response";
import { getTierWinners } from "@/services/draw.service";

type Params = { params: Promise<{ id: string; tierId: string }> };

export async function GET(_request: Request, { params }: Params) {
    try {
        const { id, tierId } = await params;
        const winners = await getTierWinners(id, tierId);
        return ok(winners);
    } catch (error) {
        console.error("Failed to list tier winners", error);
        return fail("ไม่สามารถดึงรายชื่อผู้ชนะได้", "DRAW_WINNERS_LIST_FAILED", {
            status: 500,
        });
    }
}
