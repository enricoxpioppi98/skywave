function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Env ${name} must be an integer, got: ${raw}`);
  return parsed;
}

export const env = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  pollIntervalSec: int("POLL_INTERVAL_SEC", 30),
  retentionHours: int("RETENTION_HOURS", 6),
  batchLimit: int("BATCH_LIMIT", 2000),
};
