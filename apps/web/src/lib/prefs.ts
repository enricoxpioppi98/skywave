import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPreferences } from "@/lib/types";
import { DEFAULT_FAVORITE_BANDS } from "@/lib/bands";

/**
 * Load the current user's preferences, creating a default row if none exists.
 * Idempotent — safe to call on every request.
 */
export async function getOrCreatePreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserPreferences> {
  const existing = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.data) return existing.data as UserPreferences;

  const defaults = {
    user_id: userId,
    listening_post_grid: "FN31",
    favorite_bands: DEFAULT_FAVORITE_BANDS,
    callsign: null,
  };

  const inserted = await supabase
    .from("user_preferences")
    .insert(defaults)
    .select()
    .single();

  if (inserted.error) {
    // If someone else inserted between our check and ours (race),
    // fall back to a fresh read.
    const refetch = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (refetch.data) return refetch.data as UserPreferences;
    throw new Error(`Failed to create preferences: ${inserted.error.message}`);
  }

  return inserted.data as UserPreferences;
}
