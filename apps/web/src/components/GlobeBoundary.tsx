"use client";

import { Component, type ReactNode } from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobeBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("skywave.globe.boundary", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center flex flex-col items-center gap-3">
          <div className="mono text-xs uppercase tracking-[0.3em] text-[color:var(--accent-hot)]">
            globe unavailable
          </div>
          <p className="mono text-sm text-[color:var(--muted)]">
            The 3D renderer hit an unexpected error. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mono text-xs uppercase tracking-wider px-3 py-1.5 rounded border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] transition"
          >
            reload
          </button>
        </div>
      </div>
    );
  }
}
