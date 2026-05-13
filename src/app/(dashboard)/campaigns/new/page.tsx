import Link from "next/link";

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Create Event
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          หน้าสร้างอีเวนต์กำลังจะมา
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Phase 2 จะต่อยอดไปสู่ฟอร์มสร้างแคมเปญจริงในขั้นถัดไป
        </p>
      </div>

      <Link
        href="/campaigns"
        className="inline-flex rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
      >
        กลับไปหน้า Events
      </Link>
    </div>
  );
}
