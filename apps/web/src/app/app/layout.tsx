import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_FAVORITE_BANDS } from "@/lib/bands";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ensure preferences row exists — create default on first login.
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prefs) {
    await supabase.from("user_preferences").insert({
      user_id: user.id,
      listening_post_grid: "FN31",
      favorite_bands: DEFAULT_FAVORITE_BANDS,
      callsign: null,
    });
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--panel)]/50 backdrop-blur-sm">
        <Link href="/app" className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-warm)]" />
          <span className="mono text-sm tracking-widest uppercase">skywave</span>
        </Link>
        <nav className="flex items-center gap-5 mono text-xs text-[color:var(--muted)]">
          <Link href="/app" className="hover:text-[color:var(--accent)]">live</Link>
          <Link href="/app/settings" className="hover:text-[color:var(--accent)]">settings</Link>
          <span className="text-[color:var(--border)]">|</span>
          <span className="text-[color:var(--muted)]">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="hover:text-[color:var(--accent-hot)]">sign out</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
