import { useCallback, useEffect, useState } from "react";
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

function scoreLabel(score: number): string {
  if (score >= 65) return "Supportive";
  if (score <= 35) return "Warning";
  return "Mixed";
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
      </div>
    );
  }

  return (
    <div className="app dashboard-app">
      <aside className="side-rail">
        <a className="side-logo" href="#">
          <span>G</span>
          <div>
            <strong>Global Health</strong>
            <small>Macro Terminal</small>
          </div>
        </a>
        <nav className="side-nav" aria-label="Dashboard sections">
          <a href="#score-panel">Dashboard</a>
          <a href="#macro-radar-heading">Macro Radar</a>
          {state.categories.map((cat) => (
            <a href={`#${cat.id}`} key={cat.id}>
              <span>{cat.title.replace("Major ", "").replace("Global ", "")}</span>
              <strong className={scoreClass(cat.averageScore)}>{cat.averageScore}</strong>
            </a>
          ))}
        </nav>
        <div className="side-footer">
          <span className={`badge ${state.dataMode}`}>{state.dataMode} data</span>
          {state.lastRefresh && (
            <small>Updated {formatUpdatedDate(state.lastRefresh)}</small>
          )}
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="terminal-alert">
          <span>Live macro terminal</span>
          <p>
            Scores blend 65% weekly trend and 35% daily timing. Extreme 0/100
            readings are intentionally rare.
          </p>
          <button
            type="button"
            className="btn"
            onClick={refresh}
            disabled={state.loading}
          >
            {state.loading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>

        {state.error && <div className="error-banner">{state.error}</div>}

        {showApiHint && (
          <div className="api-hint">
            <strong>Live data:</strong> Add API keys in <code>.env</code> —{" "}
            <code>VITE_FINNHUB_API_KEY</code> and/or <code>VITE_FRED_API_KEY</code>.
            Until then, scores use realistic <strong>demo</strong> series.
          </div>
        )}

        <header className="score-hero" id="score-panel">
          <a
            className={`global-score ${scoreClass(state.globalScore)}`}
            href="#/score"
            title="View bullish and bearish score breakdown"
          >
            <span className={`value ${scoreClass(state.globalScore)}`}>
              {state.globalScore}
            </span>
            <span className="label">/100</span>
          </a>
          <div className="score-hero__copy">
            <p className="eyebrow">Global Financial Health Score</p>
            <h1>{scoreLabel(state.globalScore)} conditions across world markets</h1>
            <p>
              A terminal-style read on liquidity, indices, FX, rates, commodities,
              crypto, miners, semiconductors, and central-bank policy.
            </p>
            <div className="hero-pills">
              <span>Weekly weighted</span>
              <span>Daily timing</span>
              <span>RSI</span>
              <span>MACD</span>
              <span>OBV</span>
              <span>Structure</span>
            </div>
          </div>
          <div className="score-hero__list" aria-label="Category scores">
            {state.categories.slice(0, 10).map((cat) => (
              <a href={`#${cat.id}`} key={cat.id}>
                <span>{cat.title.replace("Major ", "").replace("Global ", "")}</span>
                <strong className={scoreClass(cat.averageScore)}>
                  {cat.averageScore}
                </strong>
              </a>
            ))}
          </div>
        </header>

        <section className="category-overview" aria-label="Dashboard category overview">
          {state.categories.map((cat) => (
            <a className={`overview-card ${scoreClass(cat.averageScore)}`} href={`#${cat.id}`} key={cat.id}>
              <span>{cat.title}</span>
              <strong>{cat.averageScore}</strong>
              <small>{scoreLabel(cat.averageScore)}</small>
              <div className="overview-meter">
                <i style={{ width: `${cat.averageScore}%` }} />
              </div>
            </a>
          ))}
        </section>

        <MacroRadar categories={state.categories} />

        {state.categories.map((cat) => (
          <CategorySection key={cat.id} category={cat} />
        ))}

        <footer className="footer-note">
          Scores blend 65% weekly trend and 35% daily timing using trend, RSI,
          MACD, volume, structure, and position vs 100/200-period averages
          (inverted for VIX, rising yields, and strong USD where appropriate).
          Not financial advice. For education and research only.
        </footer>
      </main>
    </div>
  );
}
