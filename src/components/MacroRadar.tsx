import type { CategorySummary, MetricResult } from "../types";

type RadarItem = {
  title: string;
  why: string;
  metricIds: string[];
  chartFocus: string;
};

const RADAR_ITEMS: RadarItem[] = [
  {
    title: "Liquidity & The Fed",
    why: "Druckenmiller often emphasizes that liquidity and central-bank policy can dominate fundamentals at major turning points.",
    metricIds: ["m2", "global-liq", "fed"],
    chartFocus: "M2, broad liquidity, Fed funds",
  },
  {
    title: "Rates & Yield Pressure",
    why: "Long rates influence equity multiples, credit creation, mortgages, and the cost of capital.",
    metricIds: ["us10y", "fed", "dxy"],
    chartFocus: "US 10Y, policy rates, dollar",
  },
  {
    title: "Dollar & Global Financial Conditions",
    why: "A strong dollar often tightens global liquidity and can pressure commodities, EM assets, and miners.",
    metricIds: ["dxy", "eurusd", "audusd"],
    chartFocus: "DXY, EUR/USD, AUD/USD",
  },
  {
    title: "Equity Trend & Leadership",
    why: "He is known for respecting price action and market leadership rather than arguing with the tape.",
    metricIds: ["spx", "ndx", "dji"],
    chartFocus: "S&P 500, Nasdaq, Dow",
  },
  {
    title: "Commodities & Cyclicals",
    why: "Copper, gold, oil, and miners help reveal whether markets are pricing growth, inflation, or stress.",
    metricIds: ["copper", "gold", "oil", "bhp"],
    chartFocus: "Copper, gold, crude, miners",
  },
  {
    title: "Volatility & Speculative Appetite",
    why: "VIX and high-beta assets help show whether investors are seeking risk or running for cover.",
    metricIds: ["vix", "btc", "nvda"],
    chartFocus: "VIX, BTC, high-beta tech",
  },
];

function findMetric(categories: CategorySummary[], id: string): MetricResult | undefined {
  for (const category of categories) {
    const metric = category.metrics.find((m) => m.instrument.id === id);
    if (metric) return metric;
  }
  return undefined;
}

function tone(score: number): "strong" | "neutral" | "weak" {
  if (score >= 65) return "strong";
  if (score <= 35) return "weak";
  return "neutral";
}

function label(score: number): string {
  if (score >= 65) return "Supportive";
  if (score <= 35) return "Warning";
  return "Mixed";
}

export default function MacroRadar({
  categories,
}: {
  categories: CategorySummary[];
}) {
  const cards = RADAR_ITEMS.map((item) => {
    const metrics = item.metricIds
      .map((id) => findMetric(categories, id))
      .filter((m): m is MetricResult => Boolean(m));

    const score =
      metrics.length === 0
        ? 50
        : Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);

    return { ...item, metrics, score, tone: tone(score) };
  });

  return (
    <section className="macro-radar" aria-labelledby="macro-radar-heading">
      <div className="macro-radar__intro">
        <p className="macro-radar__eyebrow">Stanley Druckenmiller-style macro radar</p>
        <h2 id="macro-radar-heading">Top-Down Conditions First</h2>
        <p>
          This is an inferred checklist based on his public comments: liquidity, central
          banks, rates, the dollar, price action, commodities, and risk appetite. It is
          not an official Druckenmiller model, but it captures the macro lens he is
          widely associated with.
        </p>
      </div>

      <div className="macro-radar__grid">
        {cards.map((card) => (
          <article className={`macro-radar__card ${card.tone}`} key={card.title}>
            <div className="macro-radar__score">
              <span>{card.score}</span>
              <small>{label(card.score)}</small>
            </div>
            <div>
              <h3>{card.title}</h3>
              <p>{card.why}</p>
              <span className="macro-radar__focus">Watch: {card.chartFocus}</span>
              {card.metrics.some((metric) => metric.isDemo) && (
                <span className="macro-radar__demo-note">
                  Includes proxy/demo data where live feeds are unavailable.
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
