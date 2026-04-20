"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Spot, UserPreferences } from "@/lib/types";
import { BANDS, bandLabel } from "@/lib/bands";
import { gridToLatLon } from "@/lib/grid";
import SpotFeed from "./SpotFeed";
import StatsPanel from "./StatsPanel";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-[color:var(--muted)] mono text-sm">
      loading globe…
    </div>
  ),
});

const SPOT_WINDOW_MINUTES = 30;
const MAX_SPOTS_IN_MEMORY = 2000;

export default function Dashboard({
  initialSpots,
  prefs,
}: {
  initialSpots: Spot[];
  prefs: UserPreferences;
}) {
  const [spots, setSpots] = useState<Spot[]>(initialSpots);
  const [selectedBands, setSelectedBands] = useState<Set<number>>(
    new Set(prefs.favorite_bands),
  );
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);

  const listeningPost = useMemo(
    () => gridToLatLon(prefs.listening_post_grid) ?? { lat: 0, lon: 0 },
    [prefs.listening_post_grid],
  );

  // Realtime subscription to INSERTs on spots.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("spots:inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spots" },
        (payload: RealtimePostgresInsertPayload<Spot>) => {
          const next = payload.new;
          setSpots((prev) => {
            const merged = [next, ...prev];
            return merged.length > MAX_SPOTS_IN_MEMORY
              ? merged.slice(0, MAX_SPOTS_IN_MEMORY)
              : merged;
          });
        },
      )
      .subscribe((s: string) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Prune spots older than the window.
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - SPOT_WINDOW_MINUTES * 60 * 1000;
      setSpots((prev) => prev.filter((s) => new Date(s.observed_at).getTime() >= cutoff));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(
    () => spots.filter((s) => selectedBands.has(s.band)),
    [spots, selectedBands],
  );

  const toggleBand = (band: number) => {
    setSelectedBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  };

  const selectAll = () => setSelectedBands(new Set(BANDS.map((b) => b.band)));
  const selectNone = () => setSelectedBands(new Set());

  return (
    <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left rail: spot feed */}
      <aside className="md:w-80 md:border-r border-[color:var(--border)] bg-[color:var(--panel)]/30 flex flex-col max-h-[40vh] md:max-h-none">
        <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
          <h2 className="mono text-xs uppercase tracking-widest text-[color:var(--muted)]">
            live spots
          </h2>
          <StatusDot status={status} />
        </div>
        <SpotFeed spots={filtered} />
      </aside>

      {/* Center: globe */}
      <section className="flex-1 relative flex flex-col min-h-[50vh]">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 flex-wrap justify-center max-w-[90%]">
          <button
            onClick={selectAll}
            className="mono text-[10px] uppercase tracking-wider px-2 py-1 text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
          >
            all
          </button>
          {BANDS.map((b) => {
            const on = selectedBands.has(b.band);
            return (
              <button
                key={b.band}
                onClick={() => toggleBand(b.band)}
                className={`mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition`}
                style={{
                  color: on ? b.color : "var(--muted)",
                  borderColor: on ? b.color : "var(--border)",
                  background: on ? `${b.color}14` : "transparent",
                }}
              >
                {b.name}
              </button>
            );
          })}
          <button
            onClick={selectNone}
            className="mono text-[10px] uppercase tracking-wider px-2 py-1 text-[color:var(--muted)] hover:text-[color:var(--accent-hot)] transition"
          >
            none
          </button>
        </div>
        <Globe spots={filtered} listeningPost={listeningPost} />
      </section>

      {/* Right rail: stats */}
      <aside className="md:w-72 md:border-l border-[color:var(--border)] bg-[color:var(--panel)]/30 flex flex-col">
        <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
          <h2 className="mono text-xs uppercase tracking-widest text-[color:var(--muted)]">
            conditions
          </h2>
          <span className="mono text-[10px] text-[color:var(--muted)]">last {SPOT_WINDOW_MINUTES}m</span>
        </div>
        <StatsPanel spots={filtered} prefs={prefs} />
      </aside>
    </main>
  );
}

function StatusDot({ status }: { status: "connecting" | "live" | "error" }) {
  const color =
    status === "live" ? "var(--accent)" :
    status === "error" ? "var(--accent-hot)" : "var(--accent-warm)";
  const label = status === "live" ? "live" : status === "error" ? "offline" : "syncing";
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: color }}
      />
      <span className="mono text-[10px] uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// Export band list helper so Globe can use same color scheme without re-importing.
export { bandLabel };
