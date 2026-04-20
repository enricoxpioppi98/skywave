"use client";

import { useEffect, useState } from "react";

// NOAA SWPC public endpoints. No auth, CORS-enabled.
const SFI_URL = "https://services.swpc.noaa.gov/json/f107_cm_flux.json";
const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";

interface Conditions {
  sfi: number | null;      // 10.7cm solar flux
  kp: number | null;       // planetary K-index (0–9)
  updated: string | null;  // ISO
}

/**
 * Translate SFI + Kp into a plain-English HF propagation rating.
 * Rough rules of thumb used by the amateur radio community.
 */
function assess({ sfi, kp }: Conditions): { rating: string; color: string; reason: string } {
  if (sfi == null || kp == null) {
    return { rating: "unknown", color: "var(--muted)", reason: "fetching data…" };
  }
  if (kp >= 5) {
    return {
      rating: "stormy",
      color: "var(--accent-hot)",
      reason: "geomagnetic storm — HF absorbed on high latitudes",
    };
  }
  if (sfi >= 150 && kp <= 3) {
    return {
      rating: "excellent",
      color: "var(--accent)",
      reason: "high solar flux, quiet geomag — all HF bands favor DX",
    };
  }
  if (sfi >= 120 && kp <= 3) {
    return {
      rating: "good",
      color: "var(--accent)",
      reason: "healthy ionization, upper HF open",
    };
  }
  if (sfi >= 90) {
    return {
      rating: "fair",
      color: "var(--accent-warm)",
      reason: "20m/40m reliable, higher bands inconsistent",
    };
  }
  return {
    rating: "poor",
    color: "var(--accent-warm)",
    reason: "low solar flux — lower bands preferred",
  };
}

async function fetchConditions(): Promise<Conditions> {
  try {
    const [sfiRes, kpRes] = await Promise.all([
      fetch(SFI_URL, { cache: "no-store" }),
      fetch(KP_URL, { cache: "no-store" }),
    ]);
    const sfiJson: Array<{ time_tag?: string; flux?: number; f10_7?: number }> =
      sfiRes.ok ? await sfiRes.json() : [];
    const kpJson: Array<{ time_tag?: string; kp_index?: number }> =
      kpRes.ok ? await kpRes.json() : [];

    const latestSfi = sfiJson.length > 0 ? sfiJson[sfiJson.length - 1] : null;
    const latestKp = kpJson.length > 0 ? kpJson[kpJson.length - 1] : null;

    return {
      sfi: latestSfi ? (latestSfi.flux ?? latestSfi.f10_7 ?? null) : null,
      kp: latestKp?.kp_index ?? null,
      updated: latestKp?.time_tag ?? latestSfi?.time_tag ?? null,
    };
  } catch {
    return { sfi: null, kp: null, updated: null };
  }
}

export default function SpaceWeather() {
  const [cond, setCond] = useState<Conditions>({ sfi: null, kp: null, updated: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const c = await fetchConditions();
      if (!cancelled) {
        setCond(c);
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const { rating, color, reason } = assess(cond);

  return (
    <div className="border-b border-[color:var(--border)] p-4 flex flex-col gap-3 mono text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-[color:var(--muted)] uppercase tracking-widest text-[10px]">
          space weather
        </h3>
        <a
          href="https://www.swpc.noaa.gov"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-[color:var(--muted)] hover:text-[color:var(--accent)]"
          title="data: NOAA SWPC"
        >
          noaa ↗
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="solar flux" value={cond.sfi != null ? Math.round(cond.sfi).toString() : "—"} unit="SFU" />
        <Metric
          label="k-index"
          value={cond.kp != null ? cond.kp.toFixed(1) : "—"}
          unit={cond.kp != null ? kpWord(cond.kp) : ""}
        />
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[color:var(--border)]">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
        <span className="uppercase tracking-wider font-semibold" style={{ color }}>
          {loading ? "loading…" : rating}
        </span>
      </div>
      <p className="text-[10px] text-[color:var(--muted)] leading-snug">{reason}</p>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-[color:var(--muted)] uppercase tracking-wider text-[9px] mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold tracking-wide">{value}</span>
        <span className="text-[9px] text-[color:var(--muted)] uppercase">{unit}</span>
      </div>
    </div>
  );
}

function kpWord(kp: number): string {
  if (kp < 2) return "quiet";
  if (kp < 3) return "unsettled";
  if (kp < 4) return "active";
  if (kp < 5) return "minor";
  if (kp < 6) return "storm";
  return "severe";
}
