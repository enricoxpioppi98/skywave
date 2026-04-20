import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.ts";
import type { RawWsprSpot } from "./wspr.ts";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export interface SpotRow {
  id: number;
  observed_at: string;
  band: number;
  frequency_mhz: number;
  tx_sign: string;
  tx_lat: number;
  tx_lon: number;
  tx_grid: string;
  rx_sign: string;
  rx_lat: number;
  rx_lon: number;
  rx_grid: string;
  distance_km: number;
  azimuth: number | null;
  snr: number | null;
  power_dbm: number | null;
  drift: number | null;
}

export function toSpotRow(r: RawWsprSpot): SpotRow {
  // wspr.live returns time without a timezone. ClickHouse default is UTC.
  const observed_at = new Date(`${r.time.replace(" ", "T")}Z`).toISOString();
  return {
    id: Number(r.id),
    observed_at,
    band: r.band,
    frequency_mhz: Number(r.frequency) / 1_000_000,
    tx_sign: r.tx_sign,
    tx_lat: r.tx_lat,
    tx_lon: r.tx_lon,
    tx_grid: r.tx_loc,
    rx_sign: r.rx_sign,
    rx_lat: r.rx_lat,
    rx_lon: r.rx_lon,
    rx_grid: r.rx_loc,
    distance_km: r.distance,
    azimuth: r.azimuth ?? null,
    snr: r.snr ?? null,
    power_dbm: r.power ?? null,
    drift: r.drift ?? null,
  };
}

/**
 * Upsert a batch of spots, ignoring duplicates by id.
 * Returns the number of rows inserted.
 */
export async function upsertSpots(rows: SpotRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await getSupabase()
    .from("spots")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  return count ?? 0;
}

/** Returns the max observed_at in the table (ISO), or null if empty. */
export async function getMaxObservedAt(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("spots")
    .select("observed_at")
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.observed_at ?? null;
}

/** Deletes spots older than retention window. Returns rows deleted. */
export async function deleteOldSpots(cutoffIso: string): Promise<number> {
  const { error, count } = await getSupabase()
    .from("spots")
    .delete({ count: "exact" })
    .lt("observed_at", cutoffIso);
  if (error) throw error;
  return count ?? 0;
}
