import { RADAR_ITEMS } from "./MacroRadar";
import LineChart from "./LineChart";
import type { CategorySummary, MetricResult } from "../types";

export type AppRoute =
  | { kind: "home" }
  | { kind: "metric"; id: string }
  | { kind: "radar"; id: string };

function findMetric(categories: CategorySummary[], id: string): MetricResult | undefined {
  for (const category of categories) {
    const metric = category.metrics.find((m) => m.instrument.id === id);
    if (metric) return metric;
  }
  return undefined;
}

function scoreLabel(score: number): string {
  if (score >= 65) return "supportive";
  if (score <= 35) return "warning";
  return "mixed";
}

function formatLevel(value?: number): string {
  if (value === undefined) return "n/a";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function MetricDetail({ metric }: { metric: MetricResult }) {
  return (
    <main className="detail-page">
      <a className="back-link" href="#">
        ← Back to dashboard
      </a>
      <header className="detail-hero">
        <div>
          <p className="detail-eyebrow">{metric.instrument.category}</p>
          <h1>{metric.instrument.name}</h1>
          <p>{metric.instrument.explanation}</p>
        </div>
        <div className="detail-score">
          <span>{metric.score}</span>
          <small>{scoreLabel(metric.score)} / 100</small>
        </div>
      </header>

      <LineChart values={metric.closes} title={metric.instrument.name} />

      <section className="detail-grid">
        <article className="detail-panel">
          <h2>What It Means</h2>
          <p>{metric.instrument.explanation}</p>
          <p>
            Current level: <strong>{formatLevel(metric.price)}</strong>
            {metric.changePct !== undefined && (
              <>
                {" "}
                ({metric.changePct >= 0 ? "+" : ""}
                {metric.changePct.toFixed(2)}% latest change)
              </>
            )}
            .
          </p>
        </article>
        <article className="detail-panel">
          <h2>Technical Read</h2>
          <p>{metric.technical.summary}</p>
          <p>{metric.narrative}</p>
          {metric.isDemo && (
            <p className="detail-note">
              This page is using proxy/demo data because the live feed did not return enough
              history for this symbol.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

function RadarDetail({
  categories,
  id,
}: {
  categories: CategorySummary[];
  id: string;
}) {
  const radar = RADAR_ITEMS.find((item) => item.id === id);

  if (!radar) {
    return (
      <main className="detail-page">
        <a className="back-link" href="#">
          ← Back to dashboard
        </a>
        <p>Condition not found.</p>
      </main>
    );
  }

  const metrics = radar.metricIds
    .map((metricId) => findMetric(categories, metricId))
    .filter((m): m is MetricResult => Boolean(m));
  const score =
    metrics.length === 0
      ? 50
      : Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);
  const primary = metrics[0];

  return (
    <main className="detail-page">
      <a className="back-link" href="#">
        ← Back to dashboard
      </a>
      <header className="detail-hero">
        <div>
          <p className="detail-eyebrow">macro condition</p>
          <h1>{radar.title}</h1>
          <p>{radar.why}</p>
        </div>
        <div className="detail-score">
          <span>{score}</span>
          <small>{scoreLabel(score)} / 100</small>
        </div>
      </header>

      {primary && <LineChart values={primary.closes} title={`${radar.title}: ${primary.instrument.name}`} />}

      <section className="detail-grid">
        <article className="detail-panel">
          <h2>Why It Matters</h2>
          <p>
            This page groups the instruments that best represent this condition. The combined
            score averages those instrument scores, so it acts as a quick top-down read before
            you inspect the individual charts.
          </p>
          <p>
            Watch list: <strong>{radar.chartFocus}</strong>.
          </p>
        </article>
        <article className="detail-panel">
          <h2>Underlying Indicators</h2>
          <div className="detail-list">
            {metrics.map((metric) => (
              <a href={`#/metric/${metric.instrument.id}`} key={metric.instrument.id}>
                <span>{metric.instrument.name}</span>
                <strong>{metric.score}/100</strong>
              </a>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export default function DetailPage({
  categories,
  route,
}: {
  categories: CategorySummary[];
  route: AppRoute;
}) {
  if (route.kind === "metric") {
    const metric = findMetric(categories, route.id);
    if (metric) return <MetricDetail metric={metric} />;
    return (
      <main className="detail-page">
        <a className="back-link" href="#">
          ← Back to dashboard
        </a>
        <p>Metric not found.</p>
      </main>
    );
  }

  if (route.kind === "radar") {
    return <RadarDetail categories={categories} id={route.id} />;
  }

  return null;
}
