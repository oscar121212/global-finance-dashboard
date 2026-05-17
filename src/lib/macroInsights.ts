import type { CategoryId, CategorySummary, MetricResult } from "../types";

export type PressureMetric = {
  metric: MetricResult;
  pressureScore: number;
  reason: string;
};

export type DalioQuadrant = {
  title: string;
  growthScore: number;
  inflationScore: number;
  description: string;
};

export type CheatSheetPhase = {
  phase: string;
  score: number;
  description: string;
};

export type MacroInsights = {
  bullishLeaders: MetricResult[];
  bearishLeaders: MetricResult[];
  pressureMetrics: PressureMetric[];
  dalioQuadrant: DalioQuadrant;
  cheatSheet: CheatSheetPhase;
  summaryQuote: string;
};

export const CHEAT_SHEET_PHASES = [
  "Disbelief",
  "Hope",
  "Optimism",
  "Belief",
  "Thrill",
  "Euphoria",
  "Complacency",
  "Anxiety",
  "Denial",
  "Panic",
  "Capitulation",
  "Despondency",
  "Depression",
];

export function isBearishPressureMetric(metric: MetricResult): boolean {
  return (
    metric.instrument.id === "vix" ||
    metric.instrument.id === "dxy" ||
    metric.instrument.id === "global-liq" ||
    metric.instrument.category === "bonds" ||
    (metric.instrument.category === "rates" && metric.instrument.id !== "fed")
  );
}

export function buildMacroInsights(categories: CategorySummary[]): MacroInsights {
  const metrics = categories.flatMap((category) => category.metrics);
  const riskMetrics = metrics.filter((metric) => !isBearishPressureMetric(metric));
  const pressureMetrics = metrics
    .filter(isBearishPressureMetric)
    .map((metric) => ({
      metric,
      pressureScore: 100 - metric.score,
      reason: pressureReason(metric),
    }))
    .sort((a, b) => b.pressureScore - a.pressureScore);

  const bullishLeaders = [...riskMetrics]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const bearishLeaders = [
    ...riskMetrics.sort((a, b) => a.score - b.score).slice(0, 5),
    ...pressureMetrics.slice(0, 3).map((item) => item.metric),
  ].slice(0, 6);

  const dalioQuadrant = inferDalioQuadrant(categories, pressureMetrics);
  const cheatSheet = inferCheatSheetPhase(categories, pressureMetrics);
  const summaryQuote = buildSummaryQuote(bullishLeaders, bearishLeaders, pressureMetrics);

  return {
    bullishLeaders,
    bearishLeaders,
    pressureMetrics,
    dalioQuadrant,
    cheatSheet,
    summaryQuote,
  };
}

function pressureReason(metric: MetricResult): string {
  if (metric.instrument.id === "vix") return "high volatility pressure";
  if (metric.instrument.id === "dxy" || metric.instrument.id === "global-liq") {
    return "dollar/liquidity pressure";
  }
  if (metric.instrument.category === "bonds") return "yield pressure";
  if (metric.instrument.category === "rates") return "policy-rate pressure";
  return "macro pressure";
}

function inferDalioQuadrant(
  categories: CategorySummary[],
  pressureMetrics: PressureMetric[],
): DalioQuadrant {
  const growthScore = averageCategoryScores(categories, [
    "indices",
    "commodities",
    "tech",
    "semiconductors",
    "mining",
    "crypto",
  ]);
  const inflationScore = Math.round(
    average([
      categoryScore(categories, "commodities"),
      categoryScore(categories, "rates"),
      categoryScore(categories, "bonds", true),
      average(pressureMetrics.map((item) => item.pressureScore)),
    ]),
  );

  const growthRising = growthScore >= 52;
  const inflationRising = inflationScore >= 52;
  const title = growthRising
    ? inflationRising
      ? "Rising growth / rising inflation"
      : "Rising growth / falling inflation"
    : inflationRising
      ? "Falling growth / rising inflation"
      : "Falling growth / falling inflation";

  const description = growthRising
    ? inflationRising
      ? "Growth-sensitive assets are firm, but inflation/rate pressure is still present."
      : "Growth is improving while pressure appears to be easing; this is usually the most risk-friendly quadrant."
    : inflationRising
      ? "Growth proxies are weak while inflation/rates remain sticky; this is the stagflation-style quadrant."
      : "Growth and inflation pressure are both fading; this can mean disinflation or recession risk.";

  return { title, growthScore, inflationScore, description };
}

function inferCheatSheetPhase(
  categories: CategorySummary[],
  pressureMetrics: PressureMetric[],
): CheatSheetPhase {
  const global = averageCategoryScores(categories, categories.map((category) => category.id));
  const equity = categoryScore(categories, "indices");
  const speculation = averageCategoryScores(categories, ["crypto", "semiconductors", "tech"]);
  const pressure = average(pressureMetrics.slice(0, 5).map((item) => item.pressureScore));
  const raw = Math.round(global * 0.35 + equity * 0.25 + speculation * 0.2 + (100 - pressure) * 0.2);
  const index = Math.max(0, Math.min(CHEAT_SHEET_PHASES.length - 1, Math.floor((raw / 101) * CHEAT_SHEET_PHASES.length)));
  const phase = CHEAT_SHEET_PHASES[index]!;
  const description =
    raw >= 70
      ? "Risk appetite is elevated; watch for late-cycle enthusiasm if pressure rises."
      : raw <= 35
        ? "Psychology is defensive; watch for capitulation or early recovery signals."
        : "Psychology is mixed; the dashboard is not seeing a clean emotional extreme.";

  return { phase, score: raw, description };
}

function buildSummaryQuote(
  bullishLeaders: MetricResult[],
  bearishLeaders: MetricResult[],
  pressureMetrics: PressureMetric[],
): string {
  const bullish = bullishLeaders.slice(0, 3).map((metric) => metric.instrument.name);
  const cautious = [
    ...bearishLeaders.slice(0, 2).map((metric) => metric.instrument.name),
    ...pressureMetrics.slice(0, 2).map((item) => item.metric.instrument.name),
  ];

  return `Most constructive on ${formatList(bullish)}; most cautious on ${formatList(cautious)}.`;
}

function categoryScore(
  categories: CategorySummary[],
  id: CategoryId,
  invert = false,
): number {
  const score = categories.find((category) => category.id === id)?.averageScore ?? 50;
  return invert ? 100 - score : score;
}

function averageCategoryScores(categories: CategorySummary[], ids: CategoryId[]): number {
  return Math.round(average(ids.map((id) => categoryScore(categories, id))));
}

function average(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return 50;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function formatList(items: string[]): string {
  if (items.length === 0) return "no clear leaders";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
