import type { MetricResult } from "../types";

function scoreClass(score: number): string {
  if (score >= 65) return "";
  if (score <= 35) return "low";
  return "mid";
}

export default function MetricCard({ metric }: { metric: MetricResult }) {
  const { instrument, score, price, changePct, technical, narrative, isDemo } =
    metric;
  const cls = scoreClass(score);

  return (
    <article className="card">
      <div className="card-top">
        <div>
          <h3>
            <a className="card-link" href={`#/metric/${instrument.id}`}>
              {instrument.name}
            </a>
          </h3>
          <span className="symbol">{instrument.symbol}</span>
        </div>
        <div className={`score-ring ${cls}`} title="Health score 0–100">
          {score}
        </div>
      </div>

      <p className="explain">{instrument.explanation}</p>

      {(price !== undefined || changePct !== undefined) && (
        <div className="price-row">
          {price !== undefined && (
            <span>
              Level:{" "}
              <strong>
                {price < 10 ? price.toFixed(4) : price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </strong>
            </span>
          )}
          {changePct !== undefined && (
            <span className={changePct >= 0 ? "up" : "down"}>
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      <p className="ta">
        <strong>Technical:</strong> RSI {technical.rsi14.toFixed(1)} · 20d trend{" "}
        {technical.trend20} · vs SMA20 {technical.vsSma20}
      </p>

      <p className="ta" style={{ marginTop: "-0.25rem" }}>
        {narrative}
      </p>

      {isDemo && (
        <span className="badge demo" style={{ alignSelf: "flex-start" }}>
          Demo data
        </span>
      )}
    </article>
  );
}
