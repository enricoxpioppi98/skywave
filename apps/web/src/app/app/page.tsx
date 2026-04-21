import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Spot } from "@/lib/types";
import { getOrCreatePreferences } from "@/lib/prefs";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const prefs = await getOrCreatePreferences(supabase, user.id);

  // Fetch the most recent spots available up to the retention ceiling. Using
  // a count-based query (not a time-window) so the dashboard stays populated
  // when wspr.live has a multi-hour outage — we just show whatever's freshest
  // in our 6-hour retention pool.
  const { data: spots } = await supabase
    .from("spots")
    .select("*")
    .order("observed_at", { ascending: false })
    .limit(2000);

  return (
    <Dashboard
      initialSpots={(spots ?? []) as Spot[]}
      prefs={prefs}
    />
  );
}
