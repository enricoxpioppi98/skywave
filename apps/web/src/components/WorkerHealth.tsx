"use client";

import { useEffect, useMemo, useState } from "react";
import type { Spot } from "@/lib/types";

const FIVE_MIN_MS = 5 * 60 * 1000;

export default function WorkerHealth({ spots }: { spots: Spot[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const { lastSpotAgeSec, spotsInLast5Min, uniqueStations } = useMemo(() => {
    if (spots.length === 0 || now == null) {
      return { lastSpotAgeSec: null as number | null, spotsInLast5Min: 0, uniqueStations: 0 };
    }
    let maxObserved = 0;
    let recent = 0;
    const stations = new Set<string>();
    const cutoff = now - FIVE_MIN_MS;
    for (const s of spots) {
      const t = new Date(s.observed_at).getTime();
      if (t > maxObserved) maxObserved = t;
      if (t > cutoff) recent++;
      stations.add(s.tx_sign);
      stations.add(s.rx_sign);
    }
    return {
      lastSpotAgeSec: Math.max(0, Math.floor((now - maxObserved) / 1000)),
      spotsInLast5Min: recent,
      uniqueStations: stations.size,
    };
  }, [spots, now]);

  const color =
    lastSpotAgeSec == null || lastSpotAgeSec >= 180
      ? "var(--accent-hot)"
      : lastSpotAgeSec >= 60
        ? "var(--accent-warm)"
        : "var(--accent)";

  const ageLabel = lastSpotAgeSec == null ? "no data" : `last spot ${formatAge(lastSpotAgeSec)} ago`;

  return (
    <div
      className="px-4 py-2 border-b border-[color:var(--border)] flex items-center gap-2 mono text-[10px]"
      suppressHydrationWarning
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="uppercase tracking-wider" style={{ color }}>
        worker
      </span>
      <span className="text-[color:var(--muted)] truncate">
        {now == null
          ? "…"
          : `${ageLabel} · ${spotsInLast5Min.toLocaleString()} spots/5m · ${uniqueStations.toLocaleString()} stations`}
      </span>
    </div>
  );
}

function formatAge(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
