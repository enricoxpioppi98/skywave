"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Spot, UserPreferences } from "@/lib/types";
import { BANDS } from "@/lib/bands";
import { gridToLatLon } from "@/lib/grid";
import { reverseGeocode, formatGeo, flag, type GeoInfo } from "@/lib/geocode";
import StatsPanel from "./StatsPanel";
import SpaceWeather from "./SpaceWeather";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-[color:var(--muted)] mono text-sm">
      loading globe…
    </div>
  ),
});

const SpotFeed = dynamic(() => import("./SpotFeed"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center p-6 text-center text-[color:var(--muted)] mono text-xs">
      loading spots…
    </div>
  ),
});

const SPOT_WINDOW_MINUTES = 30;
const MAX_SPOTS_IN_MEMORY = 2000;

/** A temporary "what is this station hearing / sending" override. */
export interface PeerLock {
  role: "rx" | "tx";
  sign: string;
  lat: number;
  lon: number;
}

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
  const [peer, setPeer] = useState<PeerLock | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const homeListeningPost = useMemo(
    () => gridToLatLon(prefs.listening_post_grid) ?? { lat: 0, lon: 0 },
    [prefs.listening_post_grid],
  );

  const activeListeningPost = peer
    ? { lat: peer.lat, lon: peer.lon }
    : homeListeningPost;

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

  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - SPOT_WINDOW_MINUTES * 60 * 1000;
      setSpots((prev) => prev.filter((s) => new Date(s.observed_at).getTime() >= cutoff));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Esc clears any active peer lock.
  useEffect(() => {
    if (!peer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPeer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peer]);

  const filtered = useMemo(() => {
    const byBand = spots.filter((s) => selectedBands.has(s.band));
    if (!peer) return byBand;
    return byBand.filter((s) =>
      peer.role === "rx" ? s.rx_sign === peer.sign : s.tx_sign === peer.sign,
    );
  }, [spots, selectedBands, peer]);

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

  const listenAsRx = useCallback((sign: string, lat: number, lon: number) => {
    setPeer({ role: "rx", sign, lat, lon });
  }, []);
  const trackTx = useCallback((sign: string, lat: number, lon: number) => {
    setPeer({ role: "tx", sign, lat, lon });
  }, []);
  const clearPeer = useCallback(() => setPeer(null), []);

  return (
    <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
      <aside className="md:w-80 md:border-r border-[color:var(--border)] bg-[color:var(--panel)]/30 flex flex-col min-h-0 max-h-[40vh] md:max-h-none md:h-full">
        <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
          <h2 className="mono text-xs uppercase tracking-widest text-[color:var(--muted)]">
            live spots
          </h2>
          <StatusDot status={status} />
        </div>
        <SpotFeed spots={filtered} />
      </aside>

      <section className="flex-1 relative flex flex-col min-h-[50vh] md:min-h-0">
        {/* Stacked top overlay: pills first, peer banner below. Guarantees no overlap when pills wrap. */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[92%] w-max pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap justify-center pointer-events-auto">
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
          {peer && (
            <div className="pointer-events-auto">
              <PeerBanner peer={peer} onClear={clearPeer} />
            </div>
          )}
        </div>

        <Globe
          spots={filtered}
          listeningPost={activeListeningPost}
          homeListeningPost={homeListeningPost}
          peer={peer}
          onListenAsRx={listenAsRx}
          onTrackTx={trackTx}
          onClearPeer={clearPeer}
        />
      </section>

      <aside className="md:w-72 md:border-l border-[color:var(--border)] bg-[color:var(--panel)]/30 flex flex-col min-h-0 md:h-full overflow-y-auto">
        <SpaceWeather />
        <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
          <h2 className="mono text-xs uppercase tracking-widest text-[color:var(--muted)]">
            activity
          </h2>
          <span className="mono text-[10px] text-[color:var(--muted)]">last {SPOT_WINDOW_MINUTES}m</span>
        </div>
        <StatsPanel spots={filtered} prefs={prefs} peer={peer} />
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

function PeerBanner({ peer, onClear }: { peer: PeerLock; onClear: () => void }) {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setGeo(null);
    reverseGeocode(peer.lat, peer.lon).then((g) => {
      if (!cancelled) {
        setGeo(g);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [peer.lat, peer.lon]);

  const headline =
    peer.role === "rx"
      ? `listening in from ${peer.sign}`
      : `tracking transmissions from ${peer.sign}`;
  const sub =
    peer.role === "rx"
      ? "showing only spots this station is receiving"
      : "showing only spots this station is transmitting";

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-[color:var(--panel)]/80 border border-[color:var(--accent)] backdrop-blur-sm shadow-lg shadow-[color:var(--accent)]/10 animate-fade-in">
      <div className="flex flex-col">
        <span className="mono text-xs text-[color:var(--accent)] uppercase tracking-wider">
          {headline}
        </span>
        <span className="mono text-[10px] text-[color:var(--muted)]">{sub}</span>
        <span className="mono text-[10px] text-[color:var(--foreground)] mt-0.5 flex items-center gap-1">
          <span aria-hidden>📍</span>
          {loading ? (
            <span className="text-[color:var(--muted)]">locating…</span>
          ) : (
            <>
              {geo && flag(geo.countryCode) && (
                <span>{flag(geo.countryCode)}</span>
              )}
              <span>{geo ? formatGeo(geo) : "unknown location"}</span>
              <span className="text-[color:var(--muted)] ml-1">
                {peer.lat.toFixed(2)}°, {peer.lon.toFixed(2)}°
              </span>
            </>
          )}
        </span>
      </div>
      <button
        onClick={onClear}
        className="mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent-hot)] hover:border-[color:var(--accent-hot)] transition"
      >
        clear ✕
      </button>
    </div>
  );
}
