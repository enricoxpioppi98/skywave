// Minimal HTTP client for wspr.live (ClickHouse over HTTP GET).
// Docs: https://wspr.live — 20 req/min rate limit, SQL via ?query=<...>

const WSPR_ENDPOINT = "https://db1.wspr.live/";

export interface RawWsprSpot {
  id: string;          // UInt64 arrives as string in JSON to preserve precision
  time: string;        // "YYYY-MM-DD HH:MM:SS" (UTC)
  band: number;
  frequency: string;   // Hz as UInt64 string
  tx_sign: string;
  tx_lat: number;
  tx_lon: number;
  tx_loc: string;
  rx_sign: string;
  rx_lat: number;
  rx_lon: number;
  rx_loc: string;
  distance: number;    // km
  azimuth: number;
  snr: number;
  power: number;       // dBm
  drift: number;
}

/**
 * Fetch recent WSPR spots observed after the given ISO timestamp.
 * Inclusive-exclusive: returns rows where time > sinceUtcSeconds.
 */
export async function fetchSpotsSince(sinceUtcSeconds: number, limit: number): Promise<RawWsprSpot[]> {
  const sql =
    `SELECT id, time, band, frequency, tx_sign, tx_lat, tx_lon, tx_loc, ` +
    `rx_sign, rx_lat, rx_lon, rx_loc, distance, azimuth, snr, power, drift ` +
    `FROM wspr.rx ` +
    `WHERE time > toDateTime(${sinceUtcSeconds}) ` +
    `ORDER BY time ASC ` +
    `LIMIT ${limit} ` +
    `FORMAT JSONEachRow`;

  const url = `${WSPR_ENDPOINT}?query=${encodeURIComponent(sql)}`;
  const res = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "skywave/0.1 (https://github.com/)" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`wspr.live ${res.status}: ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  if (!text.trim()) return [];

  const rows: RawWsprSpot[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as RawWsprSpot);
    } catch (err) {
      // Skip malformed lines but log the first one for debugging.
      if (rows.length === 0) throw new Error(`wspr.live JSON parse: ${line.slice(0, 120)}`);
    }
  }
  return rows;
}
