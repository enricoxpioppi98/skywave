"use client";

import { useMemo } from "react";
import type { Spot, UserPreferences } from "@/lib/types";
import { BANDS, bandColor } from "@/lib/bands";
import type { PeerLock } from "./Dashboard";

export default function StatsPanel({
  spots,
  prefs,
  peer,
}: {
  spots: Spot[];
  prefs: UserPreferences;
  peer: PeerLock | null;
}) {
  const stats = useMemo(() => {
    const byBand = new Map<number, number>();
    let farthest = 0;
    let farthestSpot: Spot | null = null;
    const uniqueTx = new Set<string>();
    const uniqueRx = new Set<string>();

    for (const s of spots) {
      byBand.set(s.band, (byBand.get(s.band) ?? 0) + 1);
      if (s.distance_km > farthest) {
        farthest = s.distance_km;
        farthestSpot = s;
      }
      uniqueTx.add(s.tx_sign);
      uniqueRx.add(s.rx_sign);
    }

    return {
      total: spots.length,
      byBand: Array.from(byBand.entries()).sort((a, b) => b[1] - a[1]),
      farthest,
      farthestSpot,
      uniqueTx: uniqueTx.size,
      uniqueRx: uniqueRx.size,
    };
  }, [spots]);

  const maxBandCount = Math.max(1, ...stats.byBand.map(([, c]) => c));

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 mono text-xs">
      <section>
        <h3 className="text-[color:var(--muted)] uppercase tracking-widest text-[10px] mb-2">
          {peer ? (peer.role === "rx" ? "listening as" : "tracking") : "listening post"}
        </h3>
        {peer ? (
          <>
            <div className="text-lg font-semibold tracking-wide text-[color:var(--accent)]">
              {peer.sign}
            </div>
            <div className="text-[10px] text-[color:var(--muted)] mt-0.5">
              home: {prefs.listening_post_grid}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold tracking-wide">{prefs.listening_post_grid}</div>
            {prefs.callsign && (
              <div className="text-[color:var(--accent)] mt-1">{prefs.callsign}</div>
            )}
          </>
        )}
      </section>

      <StatRow label="active spots" value={stats.total.toLocaleString()} />
      <StatRow label="unique tx" value={stats.uniqueTx.toLocaleString()} />
      <StatRow label="unique rx" value={stats.uniqueRx.toLocaleString()} />
      <StatRow
        label="farthest"
        value={stats.farthest > 0 ? `${stats.farthest.toLocaleString()} km` : "—"}
        sub={
          stats.farthestSpot
            ? `${stats.farthestSpot.tx_sign} → ${stats.farthestSpot.rx_sign}`
            : undefined
        }
      />

      <section>
        <h3 className="text-[color:var(--muted)] uppercase tracking-widest text-[10px] mb-3">
          by band
        </h3>
        {stats.byBand.length === 0 ? (
          <div className="text-[color:var(--muted)]">—</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stats.byBand.map(([band, count]) => {
              const color = bandColor(band);
              const meta = BANDS.find((b) => b.band === band);
              return (
                <div key={band} className="flex items-center gap-2">
                  <span className="w-10" style={{ color }}>
                    {meta?.name ?? band}
                  </span>
                  <div className="flex-1 h-1.5 bg-[color:var(--panel-2)] rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(count / maxBandCount) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[color:var(--muted)]">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[color:var(--muted)] uppercase tracking-widest text-[10px] mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold tracking-wide">{value}</div>
      {sub && <div className="text-[10px] text-[color:var(--muted)] mt-0.5">{sub}</div>}
    </div>
  );
}
