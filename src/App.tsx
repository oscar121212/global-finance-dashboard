import { useCallback, useEffect, useState } from "react";
import CategorySection from "./components/CategorySection";
import DetailPage, { type AppRoute } from "./components/DetailPage";
import MacroRadar from "./components/MacroRadar";
import { loadDashboard } from "./lib/dashboard";
import { buildMacroInsights, CHEAT_SHEET_PHASES } from "./lib/macroInsights";
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
  const insights = buildMacroInsights(state.categories);

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
            Scores blend daily, weekly, and monthly ratings equally. Bearish
            pressure indicators are separated from risk-supportive assets.
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
            <blockquote className="macro-quote">
              “{insights.summaryQuote}”
            </blockquote>
            <div className="hero-pills">
              <span>Daily</span>
              <span>Weekly</span>
              <span>Monthly</span>
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

        <section className="macro-intel-grid" aria-label="Macro intelligence summary">
          <article className="macro-intel-card">
            <p className="eyebrow">Ray Dalio-style quadrant</p>
            <h2>{insights.dalioQuadrant.title}</h2>
            <p>{insights.dalioQuadrant.description}</p>
            <div className="quadrant-map">
              {[
                "Rising growth / rising inflation",
                "Rising growth / falling inflation",
                "Falling growth / rising inflation",
                "Falling growth / falling inflation",
              ].map((quadrant) => (
                <span
                  className={quadrant === insights.dalioQuadrant.title ? "active" : ""}
                  key={quadrant}
                >
                  {quadrant}
                </span>
              ))}
            </div>
            <div className="macro-score-pair">
              <span>Growth proxy <strong>{insights.dalioQuadrant.growthScore}</strong></span>
              <span>Inflation pressure <strong>{insights.dalioQuadrant.inflationScore}</strong></span>
            </div>
          </article>

          <article className="macro-intel-card">
            <p className="eyebrow">Wall Street cheat-sheet inference</p>
            <h2>{insights.cheatSheet.phase}</h2>
            <p>{insights.cheatSheet.description}</p>
            <div className="phase-strip">
              {CHEAT_SHEET_PHASES.map((phase) => (
                <span
                  className={phase === insights.cheatSheet.phase ? "active" : ""}
                  key={phase}
                  title={phase}
                >
                  {phase}
                </span>
              ))}
            </div>
            <div className="macro-score-pair">
              <span>Psychology score <strong>{insights.cheatSheet.score}</strong></span>
              <span>Dashboard inference <strong>{scoreLabel(insights.cheatSheet.score)}</strong></span>
            </div>
          </article>
        </section>

        <section className="pressure-panel" aria-label="Bearish pressure indicators">
          <div>
            <p className="eyebrow">Bearish pressure tape</p>
            <h2>Stress Indicators Separated From Bullish Assets</h2>
            <p>
              These indicators are visually separated because high readings are usually
              bearish for global liquidity and risk appetite. Their contribution remains
              inverted inside the global health score.
            </p>
          </div>
          <div className="pressure-list">
            {insights.pressureMetrics.slice(0, 8).map(({ metric, pressureScore, reason }) => (
              <a href={`#/metric/${metric.instrument.id}`} key={metric.instrument.id}>
                <span>{metric.instrument.name}</span>
                <small>{reason}</small>
                <strong>{pressureScore}</strong>
              </a>
            ))}
          </div>
        </section>

        <MacroRadar categories={state.categories} />

        {state.categories.map((cat) => (
          <CategorySection key={cat.id} category={cat} />
        ))}

        <footer className="footer-note">
          Scores blend daily, weekly, and monthly ratings equally using trend, RSI,
          MACD, volume, structure, and position vs 100/200-period averages
          (inverted for VIX, rising yields, and strong USD where appropriate).
          Not financial advice. For education and research only.
        </footer>
      </main>
    </div>
  );
}
