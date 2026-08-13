"use client";

import type { StatsRecord } from "@/core/types";

export default function RunHistoryTable({ stats }: { stats: StatsRecord[] }) {
  if (stats.length === 0) return null;

  return (
    <details className="mt-6 rounded-lg border border-border">
      <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">
        Run history ({stats.length})
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">Seconds</th>
              <th className="px-4 py-2 font-medium">TTFT</th>
              <th className="px-4 py-2 font-medium">Out tokens</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2">{s.provider}</td>
                <td className="px-4 py-2">{s.model}</td>
                <td className="px-4 py-2">{s.seconds}</td>
                <td className="px-4 py-2">{s.ttft ?? "—"}</td>
                <td className="px-4 py-2">{s.outTokens ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
