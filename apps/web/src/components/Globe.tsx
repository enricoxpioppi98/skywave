"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";
import type { Spot } from "@/lib/types";
import { bandColor, bandLabel } from "@/lib/bands";
import { subSolarPoint, terminatorPath } from "@/lib/sun";

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
  role: "listening-post" | "tx" | "rx" | "sun";
  radius: number;
  altitude: number;
}

interface RingDatum {
  id: string;
  lat: number;
  lng: number;
  color: string;
  createdAt: number;
}

const GLOBE_IMAGE_HIRES = "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800_geo.jpg";
const GLOBE_IMAGE_FALLBACK = "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BUMP_IMAGE = "//unpkg.com/three-globe/example/img/earth-topology.png";
const ATMOSPHERE_COLOR = "#7ee3ff";
const SUN_COLOR = "#ffd166";
const TERMINATOR_COLOR = "#ffbb5c";
const RING_LIFETIME_MS = 5000;

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
  if (p.role === "sun") {
    return `
      <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; padding: 6px 10px; background: rgba(10,14,26,0.92); border: 1px solid ${p.color}; border-radius: 4px; color: #e6e9f2; backdrop-filter: blur(6px);">
        <div style="color: ${p.color}; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;">☀ subsolar point</div>
        <div>directly under the sun right now</div>
      </div>
    `;
  }
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
  const prevSpotIdsRef = useRef<Set<number>>(new Set(spots.map((s) => s.id)));
  const isFirstSpotsRenderRef = useRef(true);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [globeImage, setGlobeImage] = useState(GLOBE_IMAGE_HIRES);
  const [sunPos, setSunPos] = useState(() => subSolarPoint());
  const [rings, setRings] = useState<RingDatum[]>([]);

  // Keep the globe legible even when thousands of spots pile up on busy bands.
  const arcs: Arc[] = useMemo(() => {
    const capped = spots.length > 250 ? spots.slice(0, 250) : spots;
    return capped.map((s) => ({
      startLat: s.tx_lat,
      startLng: s.tx_lon,
      endLat: s.rx_lat,
      endLng: s.rx_lon,
      color: bandColor(s.band),
      observedAt: new Date(s.observed_at).getTime(),
      id: s.id,
      spot: s,
    }));
  }, [spots]);

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
      {
        lat: sunPos.lat,
        lng: sunPos.lon,
        color: SUN_COLOR,
        label: "sun",
        role: "sun",
        radius: 0.9,
        altitude: 0.04,
      },
    ];
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
  }, [spots, listeningPost, sunPos]);

  // Day/night terminator as a great circle path.
  // NB: do NOT attach a `color` field to the datum — the color is supplied via
  // the `pathColor` accessor below, returning a two-element array so three-globe
  // takes the gradient branch (safe against its color2ShaderArr undefined-trim bug).
  const terminator = useMemo(() => {
    const path = terminatorPath(sunPos, 180);
    const coords = path.map(([lon, lat]) => [lat, lon, 0.005] as [number, number, number]);
    return [{ path: coords }];
  }, [sunPos]);

  // Tick sun position every 60 s.
  useEffect(() => {
    const id = setInterval(() => setSunPos(subSolarPoint()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Emit a pulse ring for each *new* spot (realtime arrival).
  useEffect(() => {
    if (isFirstSpotsRenderRef.current) {
      // Skip pulsing for the initial SSR payload — only realtime arrivals pulse.
      prevSpotIdsRef.current = new Set(spots.map((s) => s.id));
      isFirstSpotsRenderRef.current = false;
      return;
    }
    const fresh: RingDatum[] = [];
    for (const s of spots) {
      if (!prevSpotIdsRef.current.has(s.id)) {
        fresh.push({
          id: `${s.id}-${s.rx_lat}-${s.rx_lon}`,
          lat: s.rx_lat,
          lng: s.rx_lon,
          color: bandColor(s.band),
          createdAt: Date.now(),
        });
      }
    }
    prevSpotIdsRef.current = new Set(spots.map((s) => s.id));
    if (fresh.length > 0) {
      setRings((prev) => [...prev, ...fresh].slice(-50));
    }
  }, [spots]);

  // Sweep expired rings.
  useEffect(() => {
    if (rings.length === 0) return;
    const id = setInterval(() => {
      const cutoff = Date.now() - RING_LIFETIME_MS;
      setRings((prev) => prev.filter((r) => r.createdAt > cutoff));
    }, 1000);
    return () => clearInterval(id);
  }, [rings.length]);

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

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls?.();
    if (controls) controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || size.w === 0) return;
    g.pointOfView?.(
      { lat: listeningPost.lat, lng: listeningPost.lon, altitude: 2.2 },
      1500,
    );
  }, [listeningPost.lat, listeningPost.lon, size.w]);

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
      if (p.role === "sun") return;
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

  const flyToSun = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    setAutoRotate(false);
    g.pointOfView?.({ lat: sunPos.lat, lng: sunPos.lon, altitude: 2.2 }, 1200);
  }, [sunPos.lat, sunPos.lon]);

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
        arcStroke={0.35}
        arcDashLength={0.012}
        arcDashGap={0.05}
        arcDashAnimateTime={7000}
        arcAltitudeAutoScale={0.22}
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
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringColor={((r: RingDatum) => r.color) as unknown as never}
        ringMaxRadius={4}
        ringPropagationSpeed={1.2}
        ringRepeatPeriod={1400}
        ringAltitude={0.005}
        ringResolution={64}
        pathsData={terminator}
        pathPoints="path"
        pathPointLat={((pt: [number, number, number]) => pt[0]) as unknown as never}
        pathPointLng={((pt: [number, number, number]) => pt[1]) as unknown as never}
        pathPointAlt={((pt: [number, number, number]) => pt[2]) as unknown as never}
        pathColor={(() => [TERMINATOR_COLOR, TERMINATOR_COLOR]) as unknown as never}
        pathStroke={0.3}
        pathDashLength={0.08}
        pathDashGap={0.04}
        pathDashAnimateTime={12000}
        pathTransitionDuration={0}
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
        <button
          onClick={flyToSun}
          className="mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded border bg-[color:var(--panel)]/70 backdrop-blur-sm text-[color:var(--muted)] border-[color:var(--border)] hover:text-[color:var(--accent-warm)] hover:border-[color:var(--accent-warm)] transition"
          title="fly to the sun's subsolar point"
        >
          ☀ sun
        </button>
      </div>

      <div className="absolute bottom-3 left-4 z-10 mono text-[10px] text-[color:var(--muted)] pointer-events-none max-w-xs">
        drag to rotate · scroll to zoom · click an arc to listen in · the dashed line is the day/night terminator
      </div>
    </div>
  );
}
