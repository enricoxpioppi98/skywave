export function log(msg: string, extra?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), msg, ...extra };
  console.log(JSON.stringify(line));
}

export function logErr(msg: string, err: unknown, extra?: Record<string, unknown>) {
  const errorStr = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  log(msg, { level: "error", error: errorStr, ...extra });
}
