import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-warm)] animate-pulse" />
          <span className="mono text-lg tracking-wider uppercase">skywave</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link
            href="/about"
            className="mono text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
          >
            about
          </Link>
          <Link
            href="/login"
            className="mono text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
          >
            sign in →
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex flex-col justify-center px-8 pb-24 max-w-4xl mx-auto w-full">
        <p className="mono text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] mb-6">
          Real-time HF propagation map
        </p>
        <h1 className="text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight mb-8">
          Watch the ionosphere
          <br />
          <span className="text-[color:var(--muted)]">reshape itself,</span> live.
        </h1>
        <p className="text-lg text-[color:var(--muted)] max-w-2xl leading-relaxed mb-10">
          Amateur radio operators around the world transmit tiny beacons — under a watt — on
          specific shortwave frequencies. Other stations decode them. Every successful reception
          is a signal that bounced through the sky, off a layer of atmosphere charged by the sun.
          <br /><br />
          skywave plots them, live, as they arrive.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="mono text-sm px-5 py-3 bg-[color:var(--accent)] text-black rounded-md font-medium hover:bg-white transition"
          >
            sign in with email
          </Link>
          <Link
            href="/about"
            className="mono text-sm px-5 py-3 border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] rounded-md transition"
          >
            what is this?
          </Link>
        </div>
      </section>

      <footer className="px-8 py-6 mono text-xs text-[color:var(--muted)] border-t border-[color:var(--border)]">
        MPCS 51238 · Design, Build, Ship · Spring 2026
      </footer>
    </main>
  );
}
