// Reverse-geocoding via BigDataCloud's free `reverse-geocode-client` endpoint.
// No API key, CORS-enabled, ~1° accuracy for the fields we use.

export interface GeoInfo {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  continent: string | null;
}

interface BdcResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
  continent?: string;
}

const cache = new Map<string, GeoInfo>();

function key(lat: number, lon: number): string {
  // 0.2° = ~22 km — enough accuracy for city-level labels,
  // and collapses nearby spots into one cached lookup.
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoInfo> {
  const k = key(lat, lon);
  const cached = cache.get(k);
  if (cached) return cached;

  const url =
    `https://api-bdc.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`bdc ${res.status}`);
    const j: BdcResponse = await res.json();
    const out: GeoInfo = {
      city: (j.city || j.locality) ?? null,
      region: j.principalSubdivision ?? null,
      country: j.countryName ?? null,
      countryCode: j.countryCode ?? null,
      continent: j.continent ?? null,
    };
    cache.set(k, out);
    return out;
  } catch {
    const empty: GeoInfo = {
      city: null,
      region: null,
      country: null,
      countryCode: null,
      continent: null,
    };
    cache.set(k, empty);
    return empty;
  }
}

/** One-line "City, Region, Country" label, omitting nulls. */
export function formatGeo(g: GeoInfo): string {
  const parts: string[] = [];
  if (g.city) parts.push(g.city);
  if (g.region && g.region !== g.city) parts.push(g.region);
  if (g.country) parts.push(g.country);
  return parts.join(", ") || "unknown location";
}

/** Country-code flag emoji (ISO-3166 alpha-2). */
export function flag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const A = 0x1f1e6;
  const upper = countryCode.toUpperCase();
  return (
    String.fromCodePoint(A + (upper.charCodeAt(0) - "A".charCodeAt(0))) +
    String.fromCodePoint(A + (upper.charCodeAt(1) - "A".charCodeAt(0)))
  );
}
