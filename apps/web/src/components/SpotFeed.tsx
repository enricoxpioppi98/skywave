"use client";

import type { Spot } from "@/lib/types";
import { bandColor, bandLabel } from "@/lib/bands";

export default function SpotFeed({ spots }: { spots: Spot[] }) {
  if (spots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-[color:var(--muted)] mono text-xs">
        no spots yet on the selected bands — waiting for data…
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-[color:var(--border)]">
      {spots.slice(0, 200).map((s) => (
        <li key={s.id} className="px-4 py-2.5 hover:bg-[color:var(--panel-2)]/50 transition animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="mono text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                style={{
                  color: bandColor(s.band),
                  background: `${bandColor(s.band)}18`,
                }}
              >
                {bandLabel(s.band)}
              </span>
              <span className="mono text-xs truncate">
                <span className="text-[color:var(--foreground)]">{s.tx_sign}</span>
                <span className="text-[color:var(--muted)]"> → </span>
                <span className="text-[color:var(--foreground)]">{s.rx_sign}</span>
              </span>
            </div>
            <span className="mono text-[10px] text-[color:var(--muted)] shrink-0">
              {formatRelative(s.observed_at)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] mono text-[color:var(--muted)]">
            <span>{s.distance_km.toLocaleString()} km</span>
            {s.snr != null && <span>snr {s.snr > 0 ? `+${s.snr}` : s.snr} dB</span>}
            {s.power_dbm != null && <span>{s.power_dbm} dBm</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(0, diffSec)}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
