import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserPreferences } from "@/lib/types";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="flex-1 px-6 py-10 max-w-2xl w-full mx-auto">
      <h1 className="text-2xl font-semibold mb-2">settings</h1>
      <p className="text-sm text-[color:var(--muted)] mb-8">
        Pick your <span className="mono">listening post</span> — any Maidenhead grid on Earth — and the bands you care about.
      </p>
      <SettingsForm prefs={prefs as UserPreferences} />
    </main>
  );
}
