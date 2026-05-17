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
  m2: {
    why: "M2 is a broader liquidity gauge than M1 because it includes savings deposits and money-market style balances. Many macro investors watch it because broad money growth often lines up with major risk-asset cycles.",
    up: "Rising M2 generally means easier liquidity. That tends to be supportive for equities, credit, commodities, crypto, and emerging markets if inflation and rates are not also rising too fast.",
    down: "Falling or stagnant M2 usually means liquidity is being drained. That can pressure equity valuations, reduce speculative activity, and make refinancing harder for weaker borrowers.",
  },
  "china-m2": {
    why: "China M2 is important because Chinese credit growth has historically been a major driver of construction, property activity, industrial demand, and commodity cycles.",
    up: "Rising China M2 usually means easier Chinese liquidity and stronger potential support for copper, iron ore, energy demand, Asian equities, and global cyclicals.",
    down: "Falling or weak China M2 usually points to tighter Chinese credit conditions. That can pressure commodities, miners, Asian growth sentiment, and companies exposed to China demand.",
  },
  "japan-m2": {
    why: "Japan M2 helps describe yen-system liquidity. Japan is important globally because low Japanese rates and abundant liquidity often support carry trades and international capital flows.",
    up: "Rising Japan M2 can support domestic liquidity and global carry appetite, especially when Japanese rates stay low.",
    down: "Falling or weak Japan M2 can mean less domestic liquidity and may reduce support for yen-funded carry trades.",
  },
  "euro-m2": {
    why: "Euro Area M2 helps show whether eurozone money and bank deposits are expanding or contracting. It is useful because Europe is bank-credit heavy.",
    up: "Rising Euro M2 usually points to easier eurozone liquidity and can support European equities, credit, and global risk appetite.",
    down: "Falling Euro M2 usually points to tighter eurozone bank liquidity and credit conditions, which can pressure growth and risk assets.",
  },
  "india-broad-money": {
    why: "India broad money is included as the practical rupee money-stock proxy because India's monetary aggregates are commonly tracked through broad money measures rather than a clean FRED M2 equivalent.",
    up: "Rising Indian broad money usually means easier rupee liquidity, stronger domestic credit creation, and better support for Indian equities, banks, infrastructure activity, and local demand.",
    down: "Falling or weak Indian broad money usually means tighter domestic liquidity and can pressure credit growth, banks, consumption, and Indian risk assets.",
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
  us2y: {
    why: "The US 2-year yield is one of the cleanest market reads on expected Federal Reserve policy over the next couple of years. It usually moves more with rate-cut or rate-hike expectations than with long-term growth assumptions.",
    up: "Rising 2-year yields usually mean markets expect tighter Fed policy or fewer rate cuts. That tends to support the US dollar and pressure liquidity-sensitive assets.",
    down: "Falling 2-year yields usually mean markets expect easier Fed policy or more rate cuts. That can support risk assets if inflation is cooling, but can be bearish if it reflects recession stress.",
  },
  us20y: {
    why: "The US 20-year yield is a long-duration discount-rate signal. It matters for pensions, long bonds, mortgage-like assets, infrastructure valuations, and growth stocks.",
    up: "Rising 20-year yields usually tighten long-duration financial conditions and can pressure gold, housing, utilities, infrastructure, and high-valuation growth equities.",
    down: "Falling 20-year yields usually ease long-duration discount-rate pressure and can support gold and growth assets, unless the fall is driven by recession fears.",
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
  semiconductors: {
    why: "Semiconductors sit at the centre of AI, cloud, autos, industrial automation, smartphones, and electronics. They are highly cyclical but also lead major growth themes.",
    up: "If this rises, markets are usually rewarding AI capex, chip demand, manufacturing investment, or stronger global technology leadership.",
    down: "If this falls, it can signal weaker electronics demand, inventory correction, capex cuts, export-control risk, or broader risk-off rotation from growth.",
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

function scoreClass(score: number): "strong" | "mid" | "low" {
  if (score >= 65) return "strong";
  if (score <= 35) return "low";
  return "mid";
}

type ScoreTimeframe = "daily" | "weekly" | "monthly";

function scoreBreakdown(
  metric: MetricResult,
  timeframe: ScoreTimeframe,
): { label: string; value: string }[] {
  const tech =
    timeframe === "daily"
      ? metric.dailyTechnical
      : timeframe === "weekly"
        ? metric.weeklyTechnical
        : metric.monthlyTechnical;
  const score =
    timeframe === "daily"
      ? metric.dailyScore
      : timeframe === "weekly"
        ? metric.weeklyScore
        : metric.monthlyScore;
  const period = timeframe === "daily" ? "day" : timeframe === "weekly" ? "week" : "month";
  const periodPlural = timeframe === "daily" ? "days" : timeframe === "weekly" ? "weeks" : "months";
  const periodAdverb = timeframe === "daily" ? "daily" : timeframe === "weekly" ? "weekly" : "monthly";
  const items: { label: string; value: string }[] = [
    {
      label: "Score timeframe",
      value:
        timeframe === "daily"
          ? "Uses the latest daily closes. SMA100/SMA200 are daily moving averages, SMA slopes compare now vs 20 trading days ago, MACD/RSI are daily, OBV checks recent daily volume, and market structure uses roughly the last 60 trading days."
          : timeframe === "weekly"
            ? "Uses weekly closes built from the price history. SMA100/SMA200 are 100-week and 200-week moving averages, SMA slopes compare now vs 20 weeks ago, MACD/RSI are weekly, OBV checks weekly volume, and market structure uses roughly the last 60 weeks."
            : "Uses monthly closes built from the price history. SMA100/SMA200 are 100-month and 200-month moving averages where available, SMA slopes compare now vs 20 months ago, MACD/RSI are monthly, OBV checks monthly volume, and market structure uses roughly the last 60 months.",
    },
    { label: "Base score", value: "Starts from neutral, then weighs evidence rather than simply adding points." },
    {
      label: "Score calibration",
      value:
        "Raw technical evidence is compressed toward neutral and capped in a normal market range. A 100/100 would require near-perfect conditions across every timeframe, trend, momentum, structure, and volume input.",
    },
    {
      label: "Chart trend",
      value:
        tech.chartTrend === "trending higher"
          ? "Trending higher: price action and/or moving averages show an upward chart trend"
          : tech.chartTrend === "trending lower"
            ? "Trending lower: price action and/or moving averages show a downward chart trend"
            : tech.chartTrend === "consolidating"
              ? "Consolidating: price is moving sideways in a relatively tight range"
              : "Mixed: the signals do not agree strongly enough to call a clean trend",
    },
    {
      label: `Price vs 100-${period} SMA`,
      value:
        tech.vsSma100 === "above"
          ? `Price above 100-${period} SMA supports the intermediate trend`
          : tech.vsSma100 === "below"
            ? `Price below 100-${period} SMA weakens the intermediate trend`
            : `Price near 100-${period} SMA is neutral`,
    },
    {
      label: `Price vs 200-${period} SMA`,
      value:
        tech.vsSma200 === "above"
          ? `Price above 200-${period} SMA supports the long-term trend`
          : tech.vsSma200 === "below"
            ? `Price below 200-${period} SMA weakens the long-term trend`
            : `Price near 200-${period} SMA is neutral`,
    },
    {
      label: `100-${period} SMA slope`,
      value:
        tech.sma100Slope === "rising"
          ? `Rising 100-${period} SMA confirms improving intermediate trend`
          : tech.sma100Slope === "falling"
            ? `Falling 100-${period} SMA confirms weakening intermediate trend`
            : `${tech.sma100Slope} 100-${period} SMA is neutral`,
    },
    {
      label: `200-${period} SMA slope`,
      value:
        tech.sma200Slope === "rising"
          ? `Rising 200-${period} SMA confirms improving long-term trend`
          : tech.sma200Slope === "falling"
            ? `Falling 200-${period} SMA confirms weakening long-term trend`
            : `${tech.sma200Slope} 200-${period} SMA is neutral`,
    },
  ];

  if (tech.rsi14 >= 55 && tech.rsi14 <= 70) {
    items.push({ label: "RSI(14)", value: `RSI ${tech.rsi14.toFixed(1)} is constructive without being too overheated` });
  } else if (tech.rsi14 > 70) {
    items.push({ label: "RSI(14)", value: `RSI ${tech.rsi14.toFixed(1)} warns of overbought risk, so it does not get full credit` });
  } else if (tech.rsi14 < 45 && tech.rsi14 >= 30) {
    items.push({ label: "RSI(14)", value: `RSI ${tech.rsi14.toFixed(1)} shows weak momentum` });
  } else if (tech.rsi14 < 30) {
    items.push({ label: "RSI(14)", value: `RSI ${tech.rsi14.toFixed(1)} is oversold, so the model treats it as bounce potential rather than a clean trend` });
  } else {
    items.push({ label: "RSI(14)", value: `RSI ${tech.rsi14.toFixed(1)} is neutral` });
  }

  items.push({
    label: "MACD",
    value:
      `MACD is ${tech.macdBias} and histogram momentum is ${tech.macdHistogramTrend}; the model weighs both signal direction and whether momentum is improving or fading.`,
  });

  items.push({
    label: "OBV volume confirmation",
    value:
      tech.obvTrend === "rising"
        ? `Rising OBV means ${periodAdverb} volume is confirming accumulation`
        : tech.obvTrend === "falling"
          ? `Falling OBV means ${periodAdverb} volume is confirming distribution`
          : `${tech.obvTrend} OBV is treated as neutral rather than forcing an extreme score`,
  });

  items.push({
    label: "Market structure",
    value:
      tech.marketStructure === "higher highs / higher lows"
        ? `Higher highs and higher lows across recent ${periodPlural} support an uptrend`
        : tech.marketStructure === "lower highs / lower lows"
          ? `Lower highs and lower lows across recent ${periodPlural} support a downtrend`
          : tech.marketStructure === "consolidating"
            ? "Consolidation is treated as neutral until price breaks out"
            : `${tech.marketStructure} keeps the structure input near neutral`,
  });

  if (
    metric.instrument.id === "vix" ||
    metric.instrument.category === "bonds" ||
    metric.instrument.id === "dxy" ||
    metric.instrument.id === "global-liq" ||
    (metric.instrument.category === "rates" && metric.instrument.id !== "fed")
  ) {
    items.push({
      label: "Macro inversion",
      value:
        "Score is inverted where a higher reading usually tightens conditions (for example VIX, yields, DXY, or some policy-rate/liquidity proxies).",
    });
  }

  items.push({
    label: `${timeframe === "daily" ? "Daily" : timeframe === "weekly" ? "Weekly" : "Monthly"} score`,
    value: `${score}/100 (${scoreLabel(score)})`,
  });

  return items;
}

function explainConditionScore(score: number): string {
  if (score <= 35) {
    return `A score of ${score} is a Warning because the average of the underlying indicators is weak. In practical terms, the group is showing poor trend, weak momentum, or conditions that tighten global finance.`;
  }
  if (score >= 65) {
    return `A score of ${score} is Supportive because the average of the underlying indicators is strong. In practical terms, the group is showing positive trend, firm momentum, or conditions that ease global finance.`;
  }
  return `A score of ${score} is Mixed because the underlying indicators are not giving a clear one-sided signal. Some parts are supportive while others are warning or neutral.`;
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
  if (id === "gold" || id === "silver" || id === "platinum") return "US$/oz";
  if (id === "oil") return "US$/barrel";
  if (id === "iron") return "US$/dry metric tonne";
  if (id === "aluminium" || id === "tin" || id === "zinc") return "US$/tonne";
  if (id === "natural-gas") return "US$/MMBtu";
  if (id === "lumber") return "US$/1,000 board feet";
  if (id === "wheat") return "US cents/bushel";
  if (["lithium", "sprott-uranium", "uranium", "potash", "coking-coal", "thermal-coal"].includes(id)) return "US$ listed proxy";
  if (metric.instrument.category === "bonds" || metric.instrument.category === "rates") return "% yield / policy rate";
  if (metric.instrument.category === "fx") return `${symbol} exchange rate`;
  if (metric.instrument.category === "crypto") return "US$";
  if (metric.instrument.category === "liquidity") {
    if (id === "global-liq") return "DXY proxy";
    if (id === "china-m2") return "Chinese yuan";
    if (id === "japan-m2") return "Japanese yen";
    if (id === "euro-m2") return "Euro";
    if (id === "india-broad-money") return "Indian rupee";
    return "US$ billions";
  }
  if (metric.instrument.category === "indices") return "Index points";
  if (metric.instrument.category === "tech" || metric.instrument.category === "semiconductors" || metric.instrument.category === "mining") return "US$ equivalent share price / proxy";
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
          <p>
            Main score is an equal blend of the daily, weekly, and monthly
            technical ratings. This keeps short-term timing, medium-term trend,
            and longer-term regime in balance.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div className={`detail-score primary ${scoreClass(metric.score)}`}>
            <span>{metric.score}</span>
            <small>{scoreLabel(metric.score)} blend / 100</small>
          </div>
          <div className={`detail-score secondary ${scoreClass(metric.dailyScore)}`}>
            <span>{metric.dailyScore}</span>
            <small>daily {scoreLabel(metric.dailyScore)} / 100</small>
          </div>
          <div className={`detail-score secondary ${scoreClass(metric.weeklyScore)}`}>
            <span>{metric.weeklyScore}</span>
            <small>weekly {scoreLabel(metric.weeklyScore)} / 100</small>
          </div>
          <div className={`detail-score secondary ${scoreClass(metric.monthlyScore)}`}>
            <span>{metric.monthlyScore}</span>
            <small>monthly {scoreLabel(metric.monthlyScore)} / 100</small>
          </div>
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
          <h3>Daily Read</h3>
          <p>{metric.dailyTechnical.summary}</p>
          <h3>Weekly Read</h3>
          <p>{metric.weeklyTechnical.summary}</p>
          <h3>Monthly Read</h3>
          <p>{metric.monthlyTechnical.summary}</p>
          <p>{metric.narrative}</p>
          {metric.isDemo && (
            <p className="detail-note">
              This page is using proxy/demo data because the live feed did not return enough
              history for this symbol.
            </p>
          )}
        </article>
        <article className="detail-panel" id="score-breakdown">
          <h2>Score Blend</h2>
          <p>
            The headline score used across the dashboard is the equal blend of
            daily ({metric.dailyScore}), weekly ({metric.weeklyScore}), and
            monthly ({metric.monthlyScore}) ratings. Each timeframe score is
            calibrated so perfect 100/100 and 0/100 readings are intentionally rare.
          </p>
          <div className="score-breakdown-list">
            <div>
              <strong>Main score</strong>
              <span>{metric.score}/100 ({scoreLabel(metric.score)})</span>
            </div>
            <div>
              <strong>Daily score</strong>
              <span>{metric.dailyScore}/100, the shortest-term timing input.</span>
            </div>
            <div>
              <strong>Weekly score</strong>
              <span>{metric.weeklyScore}/100, the medium-term trend input.</span>
            </div>
            <div>
              <strong>Monthly score</strong>
              <span>{metric.monthlyScore}/100, the longer-term regime input.</span>
            </div>
          </div>
        </article>
        <article className="detail-panel">
          <h2>Daily Score Breakdown</h2>
          <p>
            This is the shorter-term technical score before blending. It affects
            one third of the headline score.
          </p>
          <div className="score-breakdown-list">
            {scoreBreakdown(metric, "daily").map((item) => (
              <div key={`daily-${item.label}`}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="detail-panel">
          <h2>Weekly Score Breakdown</h2>
          <p>
            This is the weekly scoring recipe. It uses weekly closes and
            weekly versions of the same technical framework.
          </p>
          <div className="score-breakdown-list">
            {scoreBreakdown(metric, "weekly").map((item) => (
              <div key={`weekly-${item.label}`}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="detail-panel">
          <h2>Monthly Score Breakdown</h2>
          <p>
            This is the longer-term technical score. It uses monthly closes and
            monthly versions of the same technical framework.
          </p>
          <div className="score-breakdown-list">
            {scoreBreakdown(metric, "monthly").map((item) => (
              <div key={`monthly-${item.label}`}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
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
  const weakest = [...metrics].sort((a, b) => a.score - b.score).slice(0, 3);
  const strongest = [...metrics].sort((a, b) => b.score - a.score).slice(0, 3);

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
        <div className={`detail-score ${scoreClass(score)}`}>
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
          <h2>Why This Score?</h2>
          <p>{explainConditionScore(score)}</p>
          <p>
            The score is calculated as the average of:{" "}
            <strong>{metrics.map((metric) => metric.instrument.name).join(", ")}</strong>.
          </p>
          <div className="score-reason-grid">
            <div>
              <h3>Weakest contributors</h3>
              <ul>
                {weakest.map((metric) => (
                  <li key={metric.instrument.id}>
                    <a href={`#/metric/${metric.instrument.id}`}>
                      {metric.instrument.name}: {metric.score}/100 blend (D {metric.dailyScore}, W {metric.weeklyScore}, M {metric.monthlyScore})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Strongest contributors</h3>
              <ul>
                {strongest.map((metric) => (
                  <li key={metric.instrument.id}>
                    <a href={`#/metric/${metric.instrument.id}`}>
                      {metric.instrument.name}: {metric.score}/100 blend (D {metric.dailyScore}, W {metric.weeklyScore}, M {metric.monthlyScore})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
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
                <strong>{metric.score}/100 blend</strong>
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
            Rankings use the blended score, which weights daily, weekly, and
            monthly technical ratings equally.
          </p>
        </div>
        <div className={`detail-score ${scoreClass(globalScore)}`}>
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
