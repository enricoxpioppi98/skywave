import { env } from "./env.ts";
import { fetchSpotsSince } from "./wspr.ts";
import { deleteOldSpots, getMaxObservedAt, toSpotRow, upsertSpots } from "./supabase.ts";
import { log, logErr } from "./log.ts";

const RETENTION_INTERVAL_MS = 5 * 60 * 1000;

let stopping = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initialCursor(): Promise<number> {
  const lastIso = await getMaxObservedAt();
  if (lastIso) {
    const secs = Math.floor(new Date(lastIso).getTime() / 1000);
    log("skywave.worker.resume", { fromIso: lastIso });
    return secs;
  }
  const twoMinAgo = Math.floor(Date.now() / 1000) - 120;
  log("skywave.worker.cold_start", { fromUtc: new Date(twoMinAgo * 1000).toISOString() });
  return twoMinAgo;
}

async function pollOnce(cursor: number): Promise<number> {
  const rows = await fetchSpotsSince(cursor, env.batchLimit);
  if (rows.length === 0) {
    log("skywave.poll.empty", { cursor });
    return cursor;
  }
  const mapped = rows.map(toSpotRow);
  const inserted = await upsertSpots(mapped);
  const newCursor = Math.max(
    ...mapped.map((r) => Math.floor(new Date(r.observed_at).getTime() / 1000)),
  );
  log("skywave.poll.ok", {
    fetched: rows.length,
    inserted,
    fromUtc: new Date(cursor * 1000).toISOString(),
    toUtc: new Date(newCursor * 1000).toISOString(),
  });
  return newCursor;
}

async function pollLoop() {
  let cursor = await initialCursor();
  let backoffMs = 1000;
  const maxBackoffMs = 5 * 60 * 1000;

  while (!stopping) {
    try {
      cursor = await pollOnce(cursor);
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
  });
  await Promise.all([pollLoop(), retentionLoop()]);
}

main().catch((err) => {
  logErr("skywave.worker.fatal", err);
  process.exit(1);
});
