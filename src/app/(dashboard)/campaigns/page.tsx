export default function CampaignsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        All Event
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        จัดการ Lucky Draw Events ทั้งหมด
                    </p>
                </div>
                <button
                    type="button"
                    className="rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
                >
                    + Create New
                </button>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
                Campaign cards will be implemented in Phase 2
            </div>
        </div>
    );
}
