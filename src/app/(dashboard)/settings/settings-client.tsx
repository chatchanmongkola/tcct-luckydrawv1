"use client";

export function SettingsClient() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-950">Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Use the Settings submenu in the sidebar for admin actions.
                </p>
            </div>

            <section className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Admin Menu</h2>
                <p className="text-sm text-slate-600">
                    Open sidebar menu, expand Settings, then choose:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>Download All Access Log</li>
                    <li>Clear All Data</li>
                </ul>
            </section>
        </div>
    );
}
