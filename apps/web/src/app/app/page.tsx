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

  // Keep a 2-hour rolling window so the dashboard still has something to show
  // during transient upstream outages (wspr.live occasionally goes quiet for
  // 30–60 min). Client-side prune in Dashboard matches.
  const since = new Date(Date.now() - 120 * 60 * 1000).toISOString();
  const { data: spots } = await supabase
    .from("spots")
    .select("*")
    .gt("observed_at", since)
    .order("observed_at", { ascending: false })
    .limit(2000);

  return (
    <Dashboard
      initialSpots={(spots ?? []) as Spot[]}
      prefs={prefs}
    />
  );
}
