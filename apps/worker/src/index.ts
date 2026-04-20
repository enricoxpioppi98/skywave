// skywave worker — polls wspr.live, upserts into Supabase.
// Entry point; real logic is filled in during the worker build step.

function log(msg: string, extra?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), msg, ...extra };
  console.log(JSON.stringify(line));
}

async function main() {
  log("skywave.worker.boot");
  // TODO: initialize wspr client, supabase client, poll loop, retention loop
}

main().catch((err) => {
  log("skywave.worker.fatal", { error: String(err) });
  process.exit(1);
});
