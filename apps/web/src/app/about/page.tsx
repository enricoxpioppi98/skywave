import Link from "next/link";
import { BANDS } from "@/lib/bands";

export const metadata = {
  title: "about — skywave",
  description:
    "What you're looking at: a real-time map of amateur-radio signals bouncing through the ionosphere.",
};

export default function AboutPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-[color:var(--border)]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-warm)]" />
          <span className="mono text-sm tracking-widest uppercase">skywave</span>
        </Link>
        <nav className="flex items-center gap-5 mono text-xs text-[color:var(--muted)]">
          <Link href="/" className="hover:text-[color:var(--accent)]">home</Link>
          <Link href="/login" className="hover:text-[color:var(--accent)]">sign in</Link>
          <a
            href="https://github.com/enricoxpioppi98/skywave"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[color:var(--accent)]"
          >
            github ↗
          </a>
        </nav>
      </header>

      <article className="flex-1 overflow-y-auto px-6 md:px-10 py-12 max-w-3xl w-full mx-auto">
        <p className="mono text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] mb-3">
          about
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-8">
          What am I looking at?
        </h1>

        <Section>
          <p>
            Every few seconds, somewhere on Earth, a tiny radio transmitter sends a
            100-second tone burst on a specific shortwave frequency — less than 1 watt of
            power, not loud enough to run a single Christmas bulb. A few thousand
            kilometers away, another station decodes it and posts a report to a public
            database. That's one <em>spot</em>.
          </p>
          <p>
            skywave plots those spots, live, as arcs on a globe. Each arc is one signal
            that climbed into the sky, bounced off a charged layer of the upper atmosphere
            (the <em>ionosphere</em>), and came down on a receiver on the other side of
            an ocean. You're watching the atmosphere itself carry radio waves in real
            time.
          </p>
        </Section>

        <Section title="What is WSPR?">
          <p>
            WSPR — "Weak Signal Propagation Reporter", pronounced "whisper" — is a digital
            radio mode invented by Nobel laureate Joe Taylor (K1JT). It encodes a
            callsign, a grid square, and a power level into a 110.6-second message that
            occupies only 6 Hz of bandwidth.
          </p>
          <p>
            Because it's so narrow and redundant, receivers can pull WSPR signals out of
            noise 30 dB below what voice communication would need. Amateur radio operators
            worldwide run WSPR beacons 24/7 to probe the state of the ionosphere — and
            every one of their reports is public.
          </p>
          <p className="text-sm text-[color:var(--muted)]">
            Our upstream data source is{" "}
            <a
              href="https://wspr.live"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--accent)] underline decoration-dotted"
            >
              wspr.live
            </a>
            , a public ClickHouse mirror of the global WSPRnet reception-report stream.
          </p>
        </Section>

        <Section title="How to read the globe">
          <BandLegend />
          <dl className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <LegendRow
              term="arc"
              body="One reception event. Color = frequency band; altitude = distance + band, so overlapping great-circles stratify instead of stacking."
            />
            <LegendRow
              term="particles"
              body="Each arc streams as ~55 micro-dots flowing from the transmitter toward the receiver. Motion = direction of the signal."
            />
            <LegendRow
              term="dashed warm-yellow line"
              body="The day/night terminator. HF propagation reshapes dramatically across it — some bands open at sunset, others only work in daylight."
            />
            <LegendRow
              term="☀ glowing disc"
              body="The subsolar point — the spot on Earth directly under the sun right now, recomputed every minute."
            />
            <LegendRow
              term="cyan pulsing dot"
              body="Your listening post. Pick any Maidenhead grid square in settings; the view orients around it."
            />
            <LegendRow
              term="ring pulse"
              body="A brief expanding circle at a receiver means a new spot just arrived via Supabase Realtime — latency from reception to your screen is under a minute."
            />
          </dl>
        </Section>

        <Section title="Why bands open and close">
          <p>
            The ionosphere is charged by sunlight and distorted by solar wind. Two numbers
            summarize its mood:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Solar Flux Index (SFI)</strong> — roughly, how much UV is hitting the
              upper atmosphere. Higher = more ionization = higher-frequency bands (10m, 15m,
              20m) open for long-distance skip.
            </li>
            <li>
              <strong>Kp index</strong> — a 0-to-9 scale of geomagnetic disturbance.
              Low Kp = stable propagation. High Kp = geomagnetic storm, polar HF absorbed,
              auroras visible at lower latitudes.
            </li>
          </ul>
          <p>
            The right sidebar on the dashboard polls NOAA SWPC every 5 minutes for both
            numbers and translates them into a plain-English propagation rating.
          </p>
        </Section>

        <Section title="Interacting">
          <ul className="space-y-2 text-sm">
            <li><KBD>drag</KBD> rotate the globe</li>
            <li><KBD>scroll</KBD> zoom</li>
            <li><KBD>click arc</KBD> "listen in" from its receiver — feed filters to that station, banner shows its city + flag</li>
            <li><KBD>click tx</KBD> track transmissions from a station instead</li>
            <li><KBD>esc</KBD> or <KBD>click empty globe</KBD> clear the lock</li>
            <li><KBD>band pills</KBD> top of globe, toggle which frequencies are shown</li>
          </ul>
        </Section>

        <Section title="Privacy &amp; data">
          <p>
            All WSPR reception reports are already public — we just mirror a rolling 6-hour
            window into Supabase and push Realtime updates. The only thing skywave stores
            about <em>you</em> is your email (for the magic link) and your preferences
            (grid square, favorite bands, optional callsign). Supabase Row-Level Security
            makes sure you can only read your own preferences; no one else on the site can.
          </p>
          <p className="text-xs text-[color:var(--muted)]">
            No tracking pixels. No analytics. No cookies beyond the auth session.
          </p>
        </Section>

        <Section title="Tech stack">
          <ul className="grid grid-cols-2 gap-y-1.5 text-xs mono text-[color:var(--muted)]">
            <li>Next.js 16 + React 19</li>
            <li>Tailwind 4</li>
            <li>react-globe.gl (Three.js)</li>
            <li>Supabase (Postgres + Realtime + Auth + RLS)</li>
            <li>Node.js worker on Railway</li>
            <li>Vercel (web)</li>
            <li>NOAA SWPC (space weather)</li>
            <li>BigDataCloud (reverse geocoding)</li>
          </ul>
          <p className="pt-2">
            Built for MPCS 51238 · Design, Build, Ship · Spring 2026. Source:{" "}
            <a
              href="https://github.com/enricoxpioppi98/skywave"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--accent)] underline decoration-dotted"
            >
              github.com/enricoxpioppi98/skywave
            </a>
            .
          </p>
        </Section>

        <div className="pt-8 flex items-center gap-4 border-t border-[color:var(--border)] mt-12">
          <Link
            href="/login"
            className="mono text-sm px-5 py-3 bg-[color:var(--accent)] text-black rounded-md font-medium hover:bg-white transition"
          >
            sign in & explore
          </Link>
          <Link
            href="/"
            className="mono text-sm px-5 py-3 text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
          >
            ← back to home
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      {title && (
        <h2 className="mono text-xs uppercase tracking-widest text-[color:var(--muted)] mb-3">
          {title}
        </h2>
      )}
      <div className="text-[color:var(--foreground)] leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function LegendRow({ term, body }: { term: string; body: string }) {
  return (
    <div>
      <dt className="mono text-xs text-[color:var(--accent)] mb-0.5 uppercase tracking-wider">
        {term}
      </dt>
      <dd className="text-[color:var(--muted)] text-sm leading-snug">{body}</dd>
    </div>
  );
}

function KBD({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--accent)] mx-0.5">
      {children}
    </kbd>
  );
}

function BandLegend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BANDS.map((b) => (
        <span
          key={b.band}
          className="mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border flex items-center gap-1.5"
          style={{
            color: b.color,
            borderColor: b.color,
            background: `${b.color}14`,
          }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: b.color }}
          />
          {b.name}
        </span>
      ))}
    </div>
  );
}
