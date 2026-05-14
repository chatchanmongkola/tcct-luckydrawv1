"use client";

export default function DrawError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <section className="mx-auto mt-6 max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="text-lg font-bold text-rose-800">Draw Page Error</h2>
            <p className="mt-2 text-sm text-rose-700">{error.message}</p>
            <button
                type="button"
                onClick={() => reset()}
                className="mt-4 rounded-[6px] border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
                Try again
            </button>
        </section>
    );
}
