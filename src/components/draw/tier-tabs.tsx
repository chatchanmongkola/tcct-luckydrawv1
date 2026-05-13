type DrawTier = {
    id: string;
    tierName: string;
    quantity: number;
    wonCount: number;
    remaining: number;
    isComplete: boolean;
};

type TierTabsProps = {
    tiers: DrawTier[];
    selectedTierId: string | null;
    onSelect: (tierId: string) => void;
};

export function TierTabs({
    tiers,
    selectedTierId,
    onSelect,
}: TierTabsProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {tiers.map((tier) => {
                    const isSelectedTier = selectedTierId === tier.id;

                    const toneClass = tier.isComplete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : isSelectedTier
                                                    ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white text-slate-900";

                    const badgeClass = tier.isComplete
                        ? "bg-emerald-500 text-white"
                                                : isSelectedTier
                                                    ? "bg-white text-primary"
                          : "bg-blue-900 text-white";

                    const countClass = tier.isComplete
                        ? "text-emerald-600"
                                                : isSelectedTier
                          ? "text-blue-100"
                          : "text-slate-400";

                    return (
                        <button
                            key={tier.id}
                            type="button"
                            onClick={() => onSelect(tier.id)}
                            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${toneClass}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
                                    {tier.tierName}
                                </span>
                                {tier.isComplete && (
                                    <span className="text-base font-bold leading-none">✓</span>
                                )}
                            </div>
                            <div className="mt-2 flex items-end justify-between gap-2">
                                <span className="truncate text-sm font-semibold">
                                    {tier.remaining > 0
                                        ? `${tier.remaining} slots left`
                                        : "complete"}
                                </span>
                                <span className={`text-xs font-semibold ${countClass}`}>
                                    {tier.wonCount}/{tier.quantity}
                                </span>
                            </div>
                        </button>
                    );
                })}
        </div>
    );
}
