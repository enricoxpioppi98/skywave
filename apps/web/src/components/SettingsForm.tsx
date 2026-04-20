"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/lib/types";
import { BANDS } from "@/lib/bands";
import { isValidGrid } from "@/lib/grid";

export default function SettingsForm({ prefs }: { prefs: UserPreferences }) {
  const router = useRouter();
  const [grid, setGrid] = useState(prefs.listening_post_grid);
  const [callsign, setCallsign] = useState(prefs.callsign ?? "");
  const [bands, setBands] = useState<Set<number>>(new Set(prefs.favorite_bands));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const gridValid = isValidGrid(grid);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!gridValid) {
      setError("Grid must be 2, 4, or 6 Maidenhead characters (e.g. FN31 or FN31pr).");
      return;
    }
    if (bands.size === 0) {
      setError("Pick at least one band.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase
      .from("user_preferences")
      .update({
        listening_post_grid: grid.toUpperCase(),
        favorite_bands: Array.from(bands).sort((a, b) => a - b),
        callsign: callsign.trim() ? callsign.trim().toUpperCase() : null,
      })
      .eq("user_id", prefs.user_id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  const toggleBand = (band: number) => {
    setBands((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  };

  return (
    <form onSubmit={onSave} className="flex flex-col gap-8">
      <div>
        <label className="block mono text-xs uppercase tracking-widest text-[color:var(--muted)] mb-2">
          listening post (maidenhead grid)
        </label>
        <input
          type="text"
          required
          value={grid}
          onChange={(e) => setGrid(e.target.value)}
          placeholder="FN31pr"
          className="w-full max-w-xs px-3 py-2 bg-[color:var(--panel)] border border-[color:var(--border)] rounded mono text-sm uppercase tracking-wider focus:outline-none focus:border-[color:var(--accent)]"
        />
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          2, 4, or 6 chars. FN31 = NYC; EM42 = Chicago; CM87 = San Francisco; JO65 = Berlin.
          {!gridValid && grid.length > 0 && (
            <span className="text-[color:var(--accent-hot)]"> invalid grid</span>
          )}
        </p>
      </div>

      <div>
        <label className="block mono text-xs uppercase tracking-widest text-[color:var(--muted)] mb-2">
          favorite bands
        </label>
        <div className="flex gap-2 flex-wrap">
          {BANDS.map((b) => {
            const on = bands.has(b.band);
            return (
              <button
                key={b.band}
                type="button"
                onClick={() => toggleBand(b.band)}
                className="mono text-xs px-3 py-1.5 rounded border transition"
                style={{
                  color: on ? b.color : "var(--muted)",
                  borderColor: on ? b.color : "var(--border)",
                  background: on ? `${b.color}14` : "transparent",
                }}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block mono text-xs uppercase tracking-widest text-[color:var(--muted)] mb-2">
          callsign <span className="text-[color:var(--muted)] normal-case tracking-normal">(optional, for hams)</span>
        </label>
        <input
          type="text"
          value={callsign}
          onChange={(e) => setCallsign(e.target.value)}
          placeholder="K1ABC"
          className="w-full max-w-xs px-3 py-2 bg-[color:var(--panel)] border border-[color:var(--border)] rounded mono text-sm uppercase tracking-wider focus:outline-none focus:border-[color:var(--accent)]"
        />
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-[color:var(--border)]">
        <button
          type="submit"
          disabled={saving || !gridValid}
          className="mono text-sm px-5 py-2 bg-[color:var(--accent)] text-black rounded font-medium hover:bg-white disabled:opacity-50 transition"
        >
          {saving ? "saving..." : "save"}
        </button>
        {saved && <span className="mono text-xs text-[color:var(--accent)]">saved ✓</span>}
        {error && <span className="mono text-xs text-[color:var(--accent-hot)]">{error}</span>}
      </div>
    </form>
  );
}
