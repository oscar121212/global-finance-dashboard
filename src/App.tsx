import { useCallback, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import CategorySection from "./components/CategorySection";
import DetailPage, { type AppRoute } from "./components/DetailPage";
import MacroRadar from "./components/MacroRadar";
import { loadDashboard } from "./lib/dashboard";
import { hasLiveKeys } from "./lib/marketData";
import type { DashboardState } from "./types";

function scoreClass(score: number): string {
  if (score >= 65) return "strong";
  if (score <= 35) return "low";
  return "mid";
}

function formatUpdatedDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function parseRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [kind, id] = hash.split("/");
  if (kind === "score") return { kind: "score" };
  if (kind === "metric" && id) return { kind: "metric", id };
  if (kind === "radar" && id) return { kind: "radar", id };
  return { kind: "home" };
}

export default function App() {
  const [state, setState] = useState<DashboardState>({
    categories: [],
    globalScore: 0,
    lastRefresh: "",
    loading: true,
    error: null,
    dataMode: "demo",
  });
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loadDashboard();
      setState({
        ...data,
        loading: false,
        error: null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load dashboard",
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const showApiHint = !hasLiveKeys();

  if (state.loading && state.categories.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading global market data…</p>
      </div>
    );
  }

  if (route.kind !== "home") {
    return (
      <div className="app">
        <DetailPage categories={state.categories} route={route} />
        <Analytics />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Global Financial Health Dashboard</h1>
          <p className="subtitle">
            Scored view of liquidity, indices, FX, bonds, volatility, commodities,
            tech, mining, crypto, and policy rates — each ranked 0–100 with
            technical context and plain-English explanations.
          </p>
        </div>
        <div className="header-actions">
          <a
            className={`global-score ${scoreClass(state.globalScore)}`}
            href="#/score"
            title="View bullish and bearish score breakdown"
          >
            <span className="label">Global score</span>
            <span className={`value ${scoreClass(state.globalScore)}`}>
              {state.globalScore}
            </span>
            <span className="score-hint">View leaders</span>
          </a>
          <button
            type="button"
            className="btn"
            onClick={refresh}
            disabled={state.loading}
          >
            {state.loading ? "Refreshing…" : "Refresh"}
          </button>
          <span className={`badge ${state.dataMode}`}>{state.dataMode} data</span>
          {state.lastRefresh && (
            <span className="meta">
              Updated {formatUpdatedDate(state.lastRefresh)}
            </span>
          )}
        </div>
      </header>

      {state.error && <div className="error-banner">{state.error}</div>}

      {showApiHint && (
        <div className="api-hint">
          <strong>Live data:</strong> Add API keys in <code>.env</code> —{" "}
          <code>VITE_FINNHUB_API_KEY</code> (free at finnhub.io) and/or{" "}
          <code>VITE_FRED_API_KEY</code> (free at fred.stlouisfed.org). Until
          then, scores use realistic <strong>demo</strong> series so you can
          preview the full dashboard.
        </div>
      )}

      <MacroRadar categories={state.categories} />

      {state.categories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}

      <footer className="footer-note">
        Scores combine trend, RSI, and position vs 20/50-day averages (inverted
        for VIX, rising yields, and strong USD where appropriate). Not financial
        advice. For education and research only.
      </footer>
      <Analytics />
    </div>
  );
}
