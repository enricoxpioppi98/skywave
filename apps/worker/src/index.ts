import { env } from "./env.ts";
import { fetchRecentSpots } from "./wspr.ts";
import { deleteOldSpots, toSpotRow, upsertSpots } from "./supabase.ts";
import { log, logErr } from "./log.ts";

const RETENTION_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Fixed lookback window so we catch late-arriving spots that wspr.live
 * publishes out of wall-clock order. Each poll re-fetches the window;
 * upserts dedupe by primary key `id`.
 */
const LOOKBACK_SEC = 180; // 3 minutes

let stopping = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollOnce(): Promise<void> {
  const rows = await fetchRecentSpots(LOOKBACK_SEC, env.batchLimit);
  if (rows.length === 0) {
    log("skywave.poll.empty");
    return;
  }
  const mapped = rows.map(toSpotRow);
  const inserted = await upsertSpots(mapped);
  log("skywave.poll.ok", {
    fetched: rows.length,
    inserted,
    lookbackSec: LOOKBACK_SEC,
  });
}

async function pollLoop() {
  let backoffMs = 1000;
  const maxBackoffMs = 5 * 60 * 1000;

  while (!stopping) {
    try {
      await pollOnce();
      backoffMs = 1000;
      await sleep(env.pollIntervalSec * 1000);
    } catch (err) {
      logErr("skywave.poll.error", err, { backoffMs });
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
    }
  }
}

async function retentionLoop() {
  while (!stopping) {
    try {
      const cutoff = new Date(Date.now() - env.retentionHours * 3600 * 1000).toISOString();
      const deleted = await deleteOldSpots(cutoff);
      if (deleted > 0) log("skywave.retention.swept", { cutoff, deleted });
    } catch (err) {
      logErr("skywave.retention.error", err);
    }
    await sleep(RETENTION_INTERVAL_MS);
  }
}

function installSignalHandlers() {
  const shutdown = (signal: string) => {
    log("skywave.worker.shutdown", { signal });
    stopping = true;
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

async function main() {
  installSignalHandlers();
  log("skywave.worker.boot", {
    pollIntervalSec: env.pollIntervalSec,
    retentionHours: env.retentionHours,
    lookbackSec: LOOKBACK_SEC,
    batchLimit: env.batchLimit,
  });
  await Promise.all([pollLoop(), retentionLoop()]);
}

main().catch((err) => {
  logErr("skywave.worker.fatal", err);
  process.exit(1);
});
