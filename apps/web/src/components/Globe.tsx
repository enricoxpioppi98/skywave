"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";
import type { Spot } from "@/lib/types";
import { bandColor, bandLabel } from "@/lib/bands";

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  observedAt: number;
  id: number;
  spot: Spot;
}

interface PointDatum {
  lat: number;
  lng: number;
  color: string;
  label: string;
  role: "listening-post" | "tx" | "rx";
  radius: number;
  altitude: number;
}

// High-res NASA Black Marble night lights — 3600x1800
const GLOBE_IMAGE_HIRES = "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800_geo.jpg";
// Fallback if NASA CDN is slow / CORS-blocked
const GLOBE_IMAGE_FALLBACK = "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BUMP_IMAGE = "//unpkg.com/three-globe/example/img/earth-topology.png";
const ATMOSPHERE_COLOR = "#7ee3ff";

function mid(a: number, b: number) {
  return (a + b) / 2;
}

function formatRelative(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return `${Math.max(0, diffSec)}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function arcLabelHtml(a: Arc): string {
  const s = a.spot;
  const snr = s.snr != null ? `${s.snr > 0 ? "+" : ""}${s.snr} dB` : "—";
  const pwr = s.power_dbm != null ? `${s.power_dbm} dBm` : "—";
  return `
    <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; padding: 8px 10px; background: rgba(10,14,26,0.92); border: 1px solid ${a.color}; border-radius: 4px; color: #e6e9f2; backdrop-filter: blur(6px); min-width: 180px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
        <span style="color: ${a.color}; font-weight: 600;">${bandLabel(s.band)}</span>
        <span style="color: #6b7490;">${formatRelative(a.observedAt)} ago</span>
      </div>
      <div style="font-size: 12px; color: #e6e9f2;">
        ${s.tx_sign} → ${s.rx_sign}
      </div>
      <div style="color: #6b7490; margin-top: 4px;">
        ${s.distance_km.toLocaleString()} km · snr ${snr} · ${pwr}
      </div>
    </div>
  `;
}

function pointLabelHtml(p: PointDatum): string {
  return `
    <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; padding: 6px 10px; background: rgba(10,14,26,0.92); border: 1px solid ${p.color}; border-radius: 4px; color: #e6e9f2; backdrop-filter: blur(6px);">
      <div style="color: ${p.color}; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;">${p.role.replace("-", " ")}</div>
      <div>${p.label}</div>
    </div>
  `;
}

export default function Globe({
  spots,
  listeningPost,
  homeListeningPost,
  onListenAsRx,
  onTrackTx,
}: {
  spots: Spot[];
  listeningPost: { lat: number; lon: number };
  homeListeningPost: { lat: number; lon: number };
  onListenAsRx: (sign: string, lat: number, lon: number) => void;
  onTrackTx: (sign: string, lat: number, lon: number) => void;
}) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [globeImage, setGlobeImage] = useState(GLOBE_IMAGE_HIRES);

  const arcs: Arc[] = useMemo(
    () =>
      spots.map((s) => ({
        startLat: s.tx_lat,
        startLng: s.tx_lon,
        endLat: s.rx_lat,
        endLng: s.rx_lon,
        color: bandColor(s.band),
        observedAt: new Date(s.observed_at).getTime(),
        id: s.id,
        spot: s,
      })),
    [spots],
  );

  // Listening-post pulse + deduped tx/rx endpoints colored by band.
  const points: PointDatum[] = useMemo(() => {
    const out: PointDatum[] = [
      {
        lat: listeningPost.lat,
        lng: listeningPost.lon,
        color: "#7ee3ff",
        label: "your listening post",
        role: "listening-post",
        radius: 0.55,
        altitude: 0.01,
      },
    ];
    // Deduplicate tx/rx endpoints so we don't draw thousands of overlapping points.
    const seen = new Set<string>();
    for (const s of spots) {
      const tKey = `T:${s.tx_sign}:${s.tx_lat.toFixed(2)}:${s.tx_lon.toFixed(2)}`;
      if (!seen.has(tKey)) {
        seen.add(tKey);
        out.push({
          lat: s.tx_lat,
          lng: s.tx_lon,
          color: bandColor(s.band),
          label: s.tx_sign,
          role: "tx",
          radius: 0.18,
          altitude: 0.003,
        });
      }
      const rKey = `R:${s.rx_sign}:${s.rx_lat.toFixed(2)}:${s.rx_lon.toFixed(2)}`;
      if (!seen.has(rKey)) {
        seen.add(rKey);
        out.push({
          lat: s.rx_lat,
          lng: s.rx_lon,
          color: bandColor(s.band),
          label: s.rx_sign,
          role: "rx",
          radius: 0.18,
          altitude: 0.003,
        });
      }
    }
    return out;
  }, [spots, listeningPost]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(200, Math.floor(rect.width));
      const h = Math.max(200, Math.floor(rect.height));
      setSize({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // One-time init: camera, controls, and "stop auto-rotate on user interaction".
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls?.();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 110;
      controls.maxDistance = 500;
      controls.zoomSpeed = 0.8;
      controls.rotateSpeed = 0.6;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.35;
      const stop = () => setAutoRotate(false);
      controls.addEventListener("start", stop);
      return () => controls.removeEventListener("start", stop);
    }
  }, [autoRotate, size.w]);

  // Sync autoRotate state into controls whenever it flips.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls?.();
    if (controls) controls.autoRotate = autoRotate;
  }, [autoRotate]);

  // Center on listening post once the globe is sized.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || size.w === 0) return;
    g.pointOfView?.(
      { lat: listeningPost.lat, lng: listeningPost.lon, altitude: 2.2 },
      1500,
    );
  }, [listeningPost.lat, listeningPost.lon, size.w]);

  // Fallback if the NASA hi-res image fails to load.
  useEffect(() => {
    if (globeImage !== GLOBE_IMAGE_HIRES) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => setGlobeImage(GLOBE_IMAGE_FALLBACK);
    img.src = GLOBE_IMAGE_HIRES;
  }, [globeImage]);

  const onArcClick = useCallback(
    (arc: object) => {
      const a = arc as Arc;
      const g = globeRef.current;
      if (!g) return;
      setAutoRotate(false);
      // "Listen in" from this arc's receiver.
      onListenAsRx(a.spot.rx_sign, a.spot.rx_lat, a.spot.rx_lon);
      g.pointOfView?.(
        { lat: a.spot.rx_lat, lng: a.spot.rx_lon, altitude: 1.6 },
        1200,
      );
    },
    [onListenAsRx],
  );

  const onPointClick = useCallback(
    (pt: object) => {
      const p = pt as PointDatum;
      const g = globeRef.current;
      if (!g) return;
      setAutoRotate(false);
      if (p.role === "rx") onListenAsRx(p.label, p.lat, p.lng);
      else if (p.role === "tx") onTrackTx(p.label, p.lat, p.lng);
      g.pointOfView?.({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 1000);
    },
    [onListenAsRx, onTrackTx],
  );

  const recenterOnListeningPost = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView?.(
      { lat: homeListeningPost.lat, lng: homeListeningPost.lon, altitude: 2.2 },
      1000,
    );
  }, [homeListeningPost.lat, homeListeningPost.lon]);

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <GlobeGL
        ref={globeRef}
        width={size.w}
        height={size.h}
        globeImageUrl={globeImage}
        bumpImageUrl={BUMP_IMAGE}
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor={ATMOSPHERE_COLOR}
        atmosphereAltitude={0.2}
        arcsData={arcs}
        arcColor={((a: Arc) => a.color) as unknown as never}
        arcStroke={0.6}
        arcDashLength={0.9}
        arcDashGap={0.2}
        arcDashAnimateTime={3000}
        arcAltitudeAutoScale={0.5}
        arcCircularResolution={64}
        arcsTransitionDuration={0}
        arcLabel={((a: Arc) => arcLabelHtml(a)) as unknown as never}
        onArcClick={onArcClick}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius={((p: PointDatum) => p.radius) as unknown as never}
        pointAltitude={((p: PointDatum) => p.altitude) as unknown as never}
        pointLabel={((p: PointDatum) => pointLabelHtml(p)) as unknown as never}
        onPointClick={onPointClick}
        pointResolution={16}
      />

      {/* Floating control dock — bottom-right */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className="mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded border bg-[color:var(--panel)]/70 backdrop-blur-sm hover:border-[color:var(--accent)] transition"
          style={{
            color: autoRotate ? "var(--accent)" : "var(--muted)",
            borderColor: autoRotate ? "var(--accent)" : "var(--border)",
          }}
          title={autoRotate ? "stop rotation" : "auto-rotate"}
        >
          {autoRotate ? "◐ rotating" : "◐ paused"}
        </button>
        <button
          onClick={recenterOnListeningPost}
          className="mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded border bg-[color:var(--panel)]/70 backdrop-blur-sm text-[color:var(--muted)] border-[color:var(--border)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] transition"
          title="recenter on your listening post"
        >
          ⊕ recenter
        </button>
      </div>

      <div className="absolute bottom-3 left-4 z-10 mono text-[10px] text-[color:var(--muted)] pointer-events-none max-w-xs">
        drag to rotate · scroll to zoom · click an arc to listen in from its receiver
      </div>
    </div>
  );
}
