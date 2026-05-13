import Link from "next/link";

interface EditCampaignPageProps {
  params: { id: string };
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = params;

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Edit Event
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">
          หน้าตัดแปลงอีเวนต์กำลังจะมา
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Campaign ID: {id}
        </p>
      </div>

      <p className="text-sm text-slate-600">
        Phase 3 จะต่อยอดให้หน้านี้เป็นฟอร์มแก้ไข event จริง
      </p>

      <Link
        href="/campaigns"
        className="inline-flex rounded-[4px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
      >
        กลับไปหน้า Events
      </Link>
    </div>
  );
}
