import type { MetricResult } from "../types";

function scoreClass(score: number): string {
  if (score >= 65) return "strong";
  if (score <= 35) return "low";
  return "mid";
}

export default function MetricCard({ metric }: { metric: MetricResult }) {
  const { instrument, score, dailyScore, weeklyScore, monthlyScore, price, changePct, technical, narrative, isDemo } =
    metric;
  const cls = scoreClass(score);
  const dailyCls = scoreClass(dailyScore);
  const weeklyCls = scoreClass(weeklyScore);
  const monthlyCls = scoreClass(monthlyScore);

  return (
    <article className={`card ${cls}`}>
      <div className="card-top">
        <div>
          <h3>
            <a className="card-link" href={`#/metric/${instrument.id}`}>
              {instrument.name}
            </a>
          </h3>
          <span className="symbol">{instrument.symbol}</span>
        </div>
        <div className="score-stack">
          <a
            className={`score-ring primary ${cls}`}
            href={`#/metric/${instrument.id}`}
            title="View blended score breakdown"
          >
            <span>{score}</span>
            <small>Blend</small>
          </a>
          <a
            className={`score-ring compact ${dailyCls}`}
            href={`#/metric/${instrument.id}`}
            title="View daily score breakdown"
          >
            <span>{dailyScore}</span>
            <small>Daily</small>
          </a>
          <a
            className={`score-ring compact ${weeklyCls}`}
            href={`#/metric/${instrument.id}`}
            title="View weekly score breakdown"
          >
            <span>{weeklyScore}</span>
            <small>Weekly</small>
          </a>
          <a
            className={`score-ring compact ${monthlyCls}`}
            href={`#/metric/${instrument.id}`}
            title="View monthly score breakdown"
          >
            <span>{monthlyScore}</span>
            <small>Monthly</small>
          </a>
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
        <strong>Daily technical:</strong> {technical.chartTrend} · RSI{" "}
        {technical.rsi14.toFixed(1)} · MACD {technical.macdBias} · volume{" "}
        {technical.obvTrend}
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
