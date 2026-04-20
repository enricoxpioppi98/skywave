"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-12 mono text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)]">
        ← skywave
      </Link>

      <div className="w-full max-w-sm bg-[color:var(--panel)] border border-[color:var(--border)] rounded-lg p-8">
        <h1 className="text-xl font-semibold mb-2">sign in</h1>
        <p className="text-sm text-[color:var(--muted)] mb-6">
          We'll email you a magic link. No password.
        </p>

        {status === "sent" ? (
          <div className="mono text-sm text-[color:var(--accent)] bg-[color:var(--panel-2)] rounded p-4">
            → check <span className="text-[color:var(--foreground)]">{email}</span> for your link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded mono text-sm placeholder:text-[color:var(--muted)] focus:outline-none focus:border-[color:var(--accent)]"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="mono text-sm px-4 py-2 bg-[color:var(--accent)] text-black rounded font-medium hover:bg-white disabled:opacity-50 transition"
            >
              {status === "sending" ? "sending..." : "send magic link"}
            </button>
            {error && (
              <p className="mono text-xs text-[color:var(--accent-hot)]">{error}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
