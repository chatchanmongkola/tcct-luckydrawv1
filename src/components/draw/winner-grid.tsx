"use client";

import { useEffect, useMemo, useState } from "react";

type DrawWinner = {
    participantId: string;
    employeeId: string;
    name: string;
    mobile: string;
};

type WinnerGridProps = {
    winners: DrawWinner[];
    drawCount: number;
    mode: "ready" | "drawing" | "result" | "complete";
};

function randomEmployeeId() {
    const value = Math.floor(Math.random() * 9999) + 1;
    return `EMP${String(value).padStart(4, "0")}`;
}

export function WinnerGrid({ winners, drawCount, mode }: WinnerGridProps) {
    const [rollingIds, setRollingIds] = useState<string[]>([]);

    useEffect(() => {
        if (mode !== "drawing") {
            setRollingIds([]);
            return;
        }

        const generate = () =>
            Array.from({ length: drawCount }, () => randomEmployeeId());

        setRollingIds(generate());
        const interval = window.setInterval(() => {
            setRollingIds(generate());
        }, 120);

        return () => window.clearInterval(interval);
    }, [drawCount, mode]);

    const display = useMemo(() => {
        if (mode === "drawing") {
            return rollingIds.map((employeeId, index) => ({
                participantId: `rolling-${index}`,
                employeeId,
                name: "...",
                mobile: "",
            }));
        }

        if (winners.length) return winners;

        return Array.from({ length: drawCount }, (_, index) => ({
            participantId: `empty-${index}`,
            employeeId: "----",
            name: "Waiting",
            mobile: "",
        }));
    }, [drawCount, mode, rollingIds, winners]);

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {display.map((winner, index) => (
                <div
                    key={winner.participantId}
                    className={`rounded-xl border p-3 text-center ${
                        mode === "drawing"
                            ? "border-indigo-300 bg-indigo-50"
                            : winners.length
                              ? "border-primary bg-primary"
                              : "border-slate-200 bg-slate-50"
                    }`}
                >
                    <p
                        className={`text-[11px] font-semibold uppercase tracking-wide ${winners.length ? "text-white/80" : "text-slate-500"}`}
                    >
                        Slot {index + 1}
                    </p>
                    <p
                        className={`mt-1 text-lg font-black ${winners.length ? "text-white" : "text-slate-900"}`}
                    >
                        {winner.employeeId}
                    </p>
                    <p
                        className={`mt-1 truncate text-xs ${winners.length ? "text-white/80" : "text-slate-600"}`}
                    >
                        {winner.name}
                    </p>
                </div>
            ))}
        </div>
    );
}
