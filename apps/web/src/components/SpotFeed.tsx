"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import { bandColor, bandLabel } from "@/lib/bands";

export default function SpotFeed({
  spots,
  upstreamStalled = false,
}: {
  spots: Spot[];
  upstreamStalled?: boolean;
}) {
  // Relative times depend on the wall clock, which causes SSR/CSR hydration
  // mismatches. Track a client-only "now" that starts as null, populates on
  // mount, and ticks every 5s so timestamps stay fresh.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  if (spots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center mono text-xs">
        {upstreamStalled ? (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[color:var(--accent-hot)] uppercase tracking-wider">
              ⚠ wspr.live source stalled
            </span>
            <span className="text-[color:var(--muted)]">
              the upstream WSPR feed has stopped publishing
              <br />
              new spots will appear once it recovers
            </span>
          </div>
        ) : (
          <span className="text-[color:var(--muted)]">
            no spots yet on the selected bands — waiting for data…
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      {upstreamStalled && (
        <div
          className="px-4 py-2 border-b border-[color:var(--accent-hot)]/40 bg-[color:var(--accent-hot)]/10 mono text-[10px] text-[color:var(--accent-hot)] uppercase tracking-wider shrink-0"
          title="the public WSPR data source has stopped publishing recent spots — this is an upstream issue, not a skywave bug"
        >
          ⚠ wspr.live stalled · feed below may be stale
        </div>
      )}
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
            <span
              className="mono text-[10px] text-[color:var(--muted)] shrink-0"
              suppressHydrationWarning
            >
              {now != null ? formatRelative(s.observed_at, now) : ""}
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
    </>
  );
}

function formatRelative(iso: string, now: number): string {
  const diffSec = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(0, diffSec)}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
