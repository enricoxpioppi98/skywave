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

  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
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
