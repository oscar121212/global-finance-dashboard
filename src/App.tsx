import { useCallback, useEffect, useState } from "react";
import CategorySection from "./components/CategorySection";
import MacroRadar from "./components/MacroRadar";
import { loadDashboard } from "./lib/dashboard";
import { hasLiveKeys } from "./lib/marketData";
import type { DashboardState } from "./types";

function scoreClass(score: number): string {
  if (score >= 65) return "";
  if (score <= 35) return "low";
  return "mid";
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

  const showApiHint = !hasLiveKeys();

  if (state.loading && state.categories.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading global market data…</p>
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
          <div className={`global-score ${scoreClass(state.globalScore)}`}>
            <span className="label">Global score</span>
            <span className={`value ${scoreClass(state.globalScore)}`}>
              {state.globalScore}
            </span>
          </div>
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
              Updated {new Date(state.lastRefresh).toLocaleString()}
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
    </div>
  );
}
