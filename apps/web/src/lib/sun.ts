// Sub-solar point + terminator great circle.
// Low-precision astronomical formulas — accurate to ~1° for our visualization.

const DEG = Math.PI / 180;

/** Returns the sub-solar point (lat/lon on Earth directly under the sun). */
export function subSolarPoint(now: Date = new Date()): { lat: number; lon: number } {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear =
    (now.getTime() - startOfYear) / 86_400_000 +
    now.getUTCHours() / 24 +
    now.getUTCMinutes() / 1440;

  // Simple declination approximation (Cooper 1969 / standard textbook).
  const decl =
    23.44 * Math.sin(((360 / 365.25) * (dayOfYear - 81)) * DEG);

  // Sub-solar longitude: moves west at 15°/hr, anchored at UTC solar noon = 0°.
  const utcH =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  let lon = -15 * (utcH - 12);
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat: decl, lon };
}

/**
 * Sample N points around the day/night terminator — the great circle 90° from
 * the sub-solar point. Returns [lon, lat] pairs suitable for a path on a globe.
 */
export function terminatorPath(
  subSolar: { lat: number; lon: number },
  samples = 180,
): Array<[number, number]> {
  const latRad = subSolar.lat * DEG;
  const lonRad = subSolar.lon * DEG;

  // Unit vector pointing to the sun in ECEF coords.
  const S = [
    Math.cos(latRad) * Math.cos(lonRad),
    Math.cos(latRad) * Math.sin(lonRad),
    Math.sin(latRad),
  ];

  // Two orthonormal vectors perpendicular to S.
  // U: in equatorial plane, rotated 90° from sun longitude.
  const U = [-Math.sin(lonRad), Math.cos(lonRad), 0];
  // V = S × U
  const V = [
    S[1] * U[2] - S[2] * U[1],
    S[2] * U[0] - S[0] * U[2],
    S[0] * U[1] - S[1] * U[0],
  ];

  const path: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i++) {
    const phi = (i / samples) * 2 * Math.PI;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const x = U[0] * c + V[0] * s;
    const y = U[1] * c + V[1] * s;
    const z = U[2] * c + V[2] * s;
    const lat = Math.asin(z) / DEG;
    const lon = Math.atan2(y, x) / DEG;
    path.push([lon, lat]);
  }
  return path;
}

/**
 * Sample a filled polygon covering the *night* hemisphere, for a dim shading
 * overlay. Returns GeoJSON-style coordinates [[lon, lat], ...]. Uses a dense
 * grid sampling for visual smoothness.
 */
export function nightHemispherePolygon(
  subSolar: { lat: number; lon: number },
  samples = 180,
): Array<[number, number]> {
  // Antipode of sub-solar point is the sub-antisolar point — pole of night.
  const anti = { lat: -subSolar.lat, lon: subSolar.lon + 180 };
  const normalizedLon = anti.lon > 180 ? anti.lon - 360 : anti.lon;

  // Take the terminator as the polygon outline — it wraps the night hemisphere.
  return terminatorPath({ lat: -subSolar.lat, lon: normalizedLon }, samples);
}
