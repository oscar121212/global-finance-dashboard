import { RADAR_ITEMS } from "./MacroRadar";
import LineChart from "./LineChart";
import type { CategorySummary, MetricResult } from "../types";

export type AppRoute =
  | { kind: "home" }
  | { kind: "score" }
  | { kind: "metric"; id: string }
  | { kind: "radar"; id: string };

type MetricInterpretation = {
  why: string;
  up: string;
  down: string;
};

const SPECIFIC_INTERPRETATIONS: Record<string, MetricInterpretation> = {
  m1: {
    why: "M1 is the narrowest money supply measure, so it captures the most liquid money available for spending or immediate use. It can move sharply when households, banks, or companies shift between cash-like balances and other assets.",
    up: "Rising M1 usually means more immediately spendable money is available. That can support short-term demand and risk appetite, although very fast growth may also point to inflation pressure or emergency liquidity creation.",
    down: "Falling M1 usually points to tighter immediate liquidity. For global finance that can mean less fuel for speculation, weaker demand, and more pressure on highly valued or highly leveraged assets.",
  },
  m2: {
    why: "M2 is a broader liquidity gauge than M1 because it includes savings deposits and money-market style balances. Many macro investors watch it because broad money growth often lines up with major risk-asset cycles.",
    up: "Rising M2 generally means easier liquidity. That tends to be supportive for equities, credit, commodities, crypto, and emerging markets if inflation and rates are not also rising too fast.",
    down: "Falling or stagnant M2 usually means liquidity is being drained. That can pressure equity valuations, reduce speculative activity, and make refinancing harder for weaker borrowers.",
  },
  m3: {
    why: "Official US M3 is discontinued, so this dashboard uses broad money as a practical proxy. The purpose is to capture whether the overall pool of money available to the economy is expanding or contracting.",
    up: "Rising broad money usually means looser financial conditions and more cash available to circulate through markets and the economy.",
    down: "Falling broad money usually means tighter conditions, less balance-sheet expansion, and a more difficult environment for speculative assets.",
  },
  "global-liq": {
    why: "Global liquidity is hard to measure in one clean series, so the dashboard uses dollar strength as a proxy. A weaker dollar often behaves like easier global liquidity because offshore borrowers and commodity buyers face less pressure.",
    up: "A rising score here means global conditions are becoming easier, often because the dollar is weakening or liquidity-sensitive assets are improving.",
    down: "A falling score means global conditions are tightening. That can pressure commodities, emerging markets, global trade, and USD debt borrowers.",
  },
  dxy: {
    why: "DXY measures US dollar strength against major currencies. The dollar is central to global funding, commodities, and cross-border debt, so a stronger dollar often tightens global financial conditions.",
    up: "A rising DXY means the US dollar is strengthening. That can pressure gold, copper, oil, emerging markets, and companies or countries with US-dollar debt.",
    down: "A falling DXY usually means easier global conditions. It often supports commodities, non-US equities, emerging markets, and risk appetite.",
  },
  gold: {
    why: "Gold is called a safe-haven asset because investors often buy it when they are worried about currencies, banks, inflation, war, or market stress. It is real-rate sensitive because gold pays no yield, so it becomes more attractive when inflation-adjusted bond returns fall.",
    up: "Rising gold can mean investors want protection from inflation, currency debasement, geopolitical risk, or falling real yields. For mining, it is usually positive for gold miners and exploration sentiment.",
    down: "Falling gold can mean real yields are rising, the US dollar is strong, or investors prefer growth assets. For global finance it can signal less demand for monetary protection, although it may also reflect tighter liquidity.",
  },
  silver: {
    why: "Silver is both a precious metal and an industrial metal. It can behave like gold during monetary stress, but it also responds to manufacturing, solar, and electronics demand.",
    up: "Rising silver can signal stronger industrial demand, inflation hedging, or speculative appetite in precious metals. It often helps sentiment toward smaller mining and exploration names.",
    down: "Falling silver can point to weaker industrial demand, a stronger dollar, rising real yields, or fading precious-metals speculation.",
  },
  copper: {
    why: "Copper is widely treated as a global growth barometer because it is used in construction, power grids, manufacturing, transport, and electrification.",
    up: "Rising copper usually points to stronger expectations for industrial demand, China activity, electrification spending, or supply tightness. It is generally positive for cyclicals and copper miners.",
    down: "Falling copper often points to weaker global growth, softer China demand, or risk-off conditions. It can be negative for miners and cyclical equities.",
  },
  oil: {
    why: "Oil is central to transport, energy costs, inflation, and geopolitics. It affects household spending, company margins, central-bank inflation risk, and producer-country revenues.",
    up: "Rising oil can signal stronger demand or supply stress. It can help energy producers, but it may hurt consumers, raise inflation pressure, and keep central banks tighter.",
    down: "Falling oil can ease inflation and help consumers, but sharp declines can also signal weak global demand or recession risk.",
  },
  vix: {
    why: "VIX reflects expected volatility in the S&P 500 options market. It is often called the market's fear gauge because it tends to spike when investors rush to buy protection.",
    up: "Rising VIX means fear and uncertainty are increasing. That is usually negative for risk assets and can signal stress in equities, credit, or liquidity.",
    down: "Falling VIX means markets are calmer and investors are demanding less protection. That usually supports risk appetite, although very low VIX can also signal complacency.",
  },
  us10y: {
    why: "The US 10-year yield is a benchmark discount rate for global markets. It influences equity valuations, mortgages, credit pricing, and the relative appeal of bonds versus stocks.",
    up: "Rising yields usually mean interest-rate expectations are moving higher or investors are demanding more compensation for inflation, debt supply, or risk. That is often negative for long-duration stocks, housing, credit, gold, and speculative assets because future cash flows are discounted at a higher rate. It can also pull money out of equities into bonds. If yields rise because growth is strong, cyclicals can initially handle it; if yields rise because inflation or debt stress is rising, global finance usually tightens. M2 may slow as borrowing becomes less attractive and banks/lenders become more cautious.",
    down: "Falling yields usually mean interest-rate expectations are moving lower. This can be positive for stocks, gold, housing, and liquidity-sensitive assets because discount rates and borrowing costs fall. It may also support M2 over time if easier policy encourages lending. But the reason matters: yields falling because inflation is cooling is usually constructive; yields falling because investors fear recession can mean defensive conditions, weaker earnings, and risk-off behavior.",
  },
  fed: {
    why: "The Fed funds rate is the base price of US dollar money. Because the dollar is the global reserve currency, Fed policy affects liquidity, capital flows, exchange rates, and risk appetite worldwide.",
    up: "A rising Fed rate means policy is tightening. That usually slows credit growth, supports the dollar, and pressures risk assets over time.",
    down: "A falling Fed rate means policy is easing. That can support liquidity and risk assets, although cuts during a crisis may also signal economic stress.",
  },
  btc: {
    why: "Bitcoin is a high-beta liquidity asset and a speculative store-of-value narrative. It often reacts quickly when global liquidity and risk appetite improve or deteriorate.",
    up: "Rising Bitcoin usually signals stronger speculative appetite and easier liquidity conditions. It can also reflect demand for alternatives to fiat currencies.",
    down: "Falling Bitcoin usually signals risk-off behavior, tighter liquidity, or fading speculative demand.",
  },
  eth: {
    why: "Ethereum reflects crypto liquidity, smart-contract activity, and appetite for higher-beta digital assets. It is more tied to network usage and risk sentiment than Bitcoin.",
    up: "Rising Ethereum usually means stronger crypto risk appetite, better liquidity, or improving expectations for blockchain activity.",
    down: "Falling Ethereum usually means weaker speculative appetite, tighter liquidity, or reduced confidence in crypto growth.",
  },
  sol: {
    why: "Solana is a high-beta crypto asset, so it often amplifies changes in speculative appetite. It can move faster than Bitcoin or Ethereum in risk-on and risk-off phases.",
    up: "Rising Solana usually points to strong speculative demand and risk-on behavior in digital assets.",
    down: "Falling Solana usually points to risk aversion or liquidity leaving the most speculative parts of crypto.",
  },
};

const CATEGORY_INTERPRETATIONS: Record<string, MetricInterpretation> = {
  liquidity: {
    why: "Liquidity indicators matter because markets usually perform better when money and credit are expanding. They help show whether the system has enough cash to support spending, lending, and speculation.",
    up: "If this rises, financial conditions are generally getting easier and risk assets may have more support.",
    down: "If this falls, financial conditions are generally tightening and markets may become more fragile.",
  },
  indices: {
    why: "Equity indices summarize broad investor risk appetite and earnings expectations. Trend strength helps show whether capital is flowing into or out of major markets.",
    up: "If this rises, investors are generally more confident about growth, profits, and liquidity.",
    down: "If this falls, investors are reducing risk or pricing weaker growth, tighter policy, or lower profits.",
  },
  fx: {
    why: "Currency pairs show relative strength between economies and central-bank policies. They also affect trade, commodity pricing, and capital flows.",
    up: "If this pair rises, the first currency is strengthening against the second. The macro meaning depends on the pair, but it usually reflects relative growth, rates, or risk sentiment.",
    down: "If this pair falls, the first currency is weakening against the second, often due to lower relative rates, weaker growth, or reduced investor demand.",
  },
  bonds: {
    why: "Bond yields are a core financial-conditions input because they set the discount rate for assets and the borrowing cost for households, governments, and companies.",
    up: "If yields rise, money is usually becoming more expensive. That can pressure equities, housing, credit, and long-duration assets.",
    down: "If yields fall, money is usually becoming cheaper, which can support valuations. But sharp falls can also mean investors fear recession.",
  },
  volatility: {
    why: "Volatility and dollar indicators reveal stress, hedging demand, and whether investors are comfortable taking risk.",
    up: "If this rises, it can mean stress or tighter conditions, especially for VIX or DXY.",
    down: "If this falls, it can mean calmer markets or easier global conditions, depending on the indicator.",
  },
  commodities: {
    why: "Commodities connect financial markets to real-world demand, inflation, supply shocks, and mining sector profitability.",
    up: "If this rises, it can signal stronger demand, supply shortages, inflation pressure, or better producer margins.",
    down: "If this falls, it can signal weaker demand, lower inflation pressure, or stress in cyclical sectors.",
  },
  tech: {
    why: "Large technology companies dominate major indices and are sensitive to liquidity, rates, growth expectations, and investor risk appetite.",
    up: "If this rises, it usually means investors are rewarding growth, AI/platform leadership, or easier financial conditions.",
    down: "If this falls, it can mean tighter rates, weaker growth expectations, or rotation away from high-valuation leaders.",
  },
  mining: {
    why: "Mining companies translate commodity prices into equity-market performance. They are useful for reading resource-sector risk appetite and global growth expectations.",
    up: "If this rises, investors are usually pricing stronger commodity demand, better margins, or improved mining-sector sentiment.",
    down: "If this falls, investors may be pricing weaker commodities, rising costs, political risk, or slower global growth.",
  },
  crypto: {
    why: "Crypto assets are high-beta liquidity gauges. They often respond quickly to changes in speculative appetite, dollar liquidity, and risk-taking.",
    up: "If this rises, risk appetite and speculative liquidity are usually improving.",
    down: "If this falls, liquidity may be tightening or investors may be moving away from speculative assets.",
  },
  rates: {
    why: "Policy rates are central-bank settings that influence borrowing costs, currencies, inflation, and risk appetite.",
    up: "If policy rates rise, central banks are tightening. That can cool inflation but usually pressures credit growth and asset valuations.",
    down: "If policy rates fall, central banks are easing. That can support markets, although cuts can also happen because growth is deteriorating.",
  },
};

function getMetricInterpretation(metric: MetricResult): MetricInterpretation {
  return (
    SPECIFIC_INTERPRETATIONS[metric.instrument.id] ??
    CATEGORY_INTERPRETATIONS[metric.instrument.category] ??
    {
      why: "This indicator is included because it helps describe one part of global financial conditions.",
      up: "If it rises, the implication depends on the asset, but it usually shows stronger demand or investor interest.",
      down: "If it falls, the implication depends on the asset, but it usually shows weaker demand or reduced investor interest.",
    }
  );
}

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

function getYAxisLabel(metric: MetricResult): string {
  const id = metric.instrument.id;
  const symbol = metric.instrument.symbol;

  if (id === "copper") return "US$/tonne";
  if (id === "gold" || id === "silver") return "US$/oz";
  if (id === "oil") return "US$/barrel";
  if (id === "iron" || id === "lithium") return "US$ proxy";
  if (metric.instrument.category === "bonds" || metric.instrument.category === "rates") return "% yield / policy rate";
  if (metric.instrument.category === "fx") return `${symbol} exchange rate`;
  if (metric.instrument.category === "crypto") return "US$";
  if (metric.instrument.category === "liquidity") return id === "global-liq" ? "DXY proxy" : "US$ billions";
  if (metric.instrument.category === "indices") return "Index points";
  if (metric.instrument.category === "tech" || metric.instrument.category === "mining") return "Share price (US$ / proxy)";
  if (metric.instrument.category === "volatility") return id === "vix" ? "VIX index" : "Index level";

  return "Metric level";
}

function MetricDetail({ metric }: { metric: MetricResult }) {
  const interpretation = getMetricInterpretation(metric);
  const yAxisLabel = getYAxisLabel(metric);

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

      <LineChart
        history={metric.history}
        title={metric.instrument.name}
        values={metric.closes}
        yAxisLabel={yAxisLabel}
      />

      <section className="detail-grid">
        <article className="detail-panel">
          <h2>What It Means</h2>
          <p>{metric.instrument.explanation}</p>
          <div className="meaning-block">
            <h3>Why this answer</h3>
            <p>{interpretation.why}</p>
          </div>
          <div className="meaning-block">
            <h3>If it rises</h3>
            <p>{interpretation.up}</p>
          </div>
          <div className="meaning-block">
            <h3>If it falls</h3>
            <p>{interpretation.down}</p>
          </div>
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

      {primary && (
        <LineChart
          history={primary.history}
          title={`${radar.title}: ${primary.instrument.name}`}
          values={primary.closes}
          yAxisLabel={getYAxisLabel(primary)}
        />
      )}

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

function GlobalScoreDetail({ categories }: { categories: CategorySummary[] }) {
  const metrics = categories
    .flatMap((category) => category.metrics)
    .sort((a, b) => b.score - a.score);
  const bullish = metrics.slice(0, 12);
  const bearish = [...metrics].sort((a, b) => a.score - b.score).slice(0, 12);
  const globalScore =
    metrics.length === 0
      ? 0
      : Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);

  return (
    <main className="detail-page">
      <a className="back-link" href="#">
        ← Back to dashboard
      </a>
      <header className="detail-hero">
        <div>
          <p className="detail-eyebrow">global score breakdown</p>
          <h1>Most Bullish vs Most Bearish Assets</h1>
          <p>
            The global score is the average of all instrument scores. This page shows which
            assets are pulling the dashboard higher and which are dragging it lower.
          </p>
        </div>
        <div className="detail-score">
          <span>{globalScore}</span>
          <small>{scoreLabel(globalScore)} / 100</small>
        </div>
      </header>

      <section className="score-columns">
        <article className="detail-panel">
          <h2>Most Bullish</h2>
          <p>
            These are the strongest current readings. High scores usually mean trend,
            momentum, and moving-average position are supportive.
          </p>
          <div className="rank-list">
            {bullish.map((metric, index) => (
              <a href={`#/metric/${metric.instrument.id}`} key={metric.instrument.id}>
                <span className="rank">{index + 1}</span>
                <span>
                  <strong>{metric.instrument.name}</strong>
                  <small>{metric.instrument.category} · {metric.instrument.symbol}</small>
                </span>
                <b>{metric.score}</b>
              </a>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <h2>Most Bearish</h2>
          <p>
            These are the weakest current readings. Low scores usually mean falling trend,
            weak momentum, or price below key averages.
          </p>
          <div className="rank-list bearish">
            {bearish.map((metric, index) => (
              <a href={`#/metric/${metric.instrument.id}`} key={metric.instrument.id}>
                <span className="rank">{index + 1}</span>
                <span>
                  <strong>{metric.instrument.name}</strong>
                  <small>{metric.instrument.category} · {metric.instrument.symbol}</small>
                </span>
                <b>{metric.score}</b>
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
  if (route.kind === "score") {
    return <GlobalScoreDetail categories={categories} />;
  }

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
