"use client";

import { useEffect, useState } from "react";

export const WSPR_STALL_THRESHOLD_SEC = 15 * 60;
const PROBE_INTERVAL_MS = 2 * 60 * 1000;
const PROBE_TIMEOUT_MS = 10_000;

/**
 * Probes wspr.live's max(time) directly from the browser so the UI can tell
 * "our worker is broken" apart from "the public WSPR feed has gone quiet".
 * Returns seconds since the freshest upstream spot, or null while loading
 * or after a transient network/CORS failure.
 */
export function useWsprUpstreamAgeSec(): number | null {
  const [ageSec, setAgeSec] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const sql = "SELECT max(time) FROM wspr.rx FORMAT TabSeparated";
        const res = await fetch(
          `https://db1.wspr.live/?query=${encodeURIComponent(sql)}`,
          { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) },
        );
        if (!res.ok) return;
        const text = (await res.text()).trim();
        const ts = Date.parse(text.replace(" ", "T") + "Z");
        if (Number.isNaN(ts) || cancelled) return;
        setAgeSec(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
      } catch {
        // Transient failure — keep the prior reading rather than flapping.
      }
    };
    probe();
    const id = setInterval(probe, PROBE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return ageSec;
}
