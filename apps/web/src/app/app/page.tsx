import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Spot, UserPreferences } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: spots } = await supabase
    .from("spots")
    .select("*")
    .gt("observed_at", since)
    .order("observed_at", { ascending: false })
    .limit(500);

  return (
    <Dashboard
      initialSpots={(spots ?? []) as Spot[]}
      prefs={prefs as UserPreferences}
    />
  );
}
