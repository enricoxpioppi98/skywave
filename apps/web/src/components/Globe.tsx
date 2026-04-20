"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";
import type { Spot } from "@/lib/types";
import { bandColor } from "@/lib/bands";

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  observedAt: number;
  id: number;
}

const GLOBE_IMAGE = "//unpkg.com/three-globe/example/img/earth-night.jpg";
const ATMOSPHERE_COLOR = "#7ee3ff";

export default function Globe({
  spots,
  listeningPost,
}: {
  spots: Spot[];
  listeningPost: { lat: number; lon: number };
}) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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
      })),
    [spots],
  );

  const listeningPostData = useMemo(
    () => [
      {
        lat: listeningPost.lat,
        lng: listeningPost.lon,
        size: 0.6,
        color: "#7ee3ff",
      },
    ],
    [listeningPost],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
    }
    globeRef.current.pointOfView?.(
      { lat: listeningPost.lat, lng: listeningPost.lon, altitude: 2.5 },
      1500,
    );
  }, [listeningPost.lat, listeningPost.lon]);

  return (
    <div ref={containerRef} className="flex-1 relative">
      {size.w > 0 && (
        <GlobeGL
          ref={globeRef}
          width={size.w}
          height={size.h}
          globeImageUrl={GLOBE_IMAGE}
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor={ATMOSPHERE_COLOR}
          atmosphereAltitude={0.18}
          arcsData={arcs}
          arcColor="color"
          arcStroke={0.3}
          arcDashLength={0.5}
          arcDashGap={0.8}
          arcDashAnimateTime={3500}
          arcAltitudeAutoScale={0.4}
          pointsData={listeningPostData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointRadius={0.5}
          pointAltitude={0.01}
        />
      )}
    </div>
  );
}
