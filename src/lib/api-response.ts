import { NextResponse } from "next/server";

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string; code: string };

export function ok<T>(data: T, init?: ResponseInit) {
    return NextResponse.json<ApiSuccess<T>>({ success: true, data }, init);
}

export function fail(
    error: string,
    code: string,
    init?: Omit<ResponseInit, "status"> & { status?: number },
) {
    const status = init?.status ?? 400;
    return NextResponse.json<ApiError>(
        { success: false, error, code },
        { ...init, status },
    );
}
