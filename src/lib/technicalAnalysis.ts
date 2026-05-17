import type { HistoryPoint, TechnicalSignals } from "../types";

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function aggregateWeeklyHistory(history: HistoryPoint[]): HistoryPoint[] {
  const byWeek = new Map<string, HistoryPoint>();

  for (const point of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const date = new Date(`${point.date}T00:00:00Z`);
    const day = date.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - diffToMonday);
    const key = date.toISOString().slice(0, 10);
    const existing = byWeek.get(key);

    byWeek.set(key, {
      date: point.date,
      value: point.value,
      volume: (existing?.volume ?? 0) + (point.volume ?? 0),
    });
  }

  return Array.from(byWeek.values());
}

export function aggregateMonthlyHistory(history: HistoryPoint[]): HistoryPoint[] {
  const byMonth = new Map<string, HistoryPoint>();

  for (const point of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = point.date.slice(0, 7);
    const existing = byMonth.get(key);

    byMonth.set(key, {
      date: point.date,
      value: point.value,
      volume: (existing?.volume ?? 0) + (point.volume ?? 0),
    });
  }

  return Array.from(byMonth.values());
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const multiplier = 2 / (period + 1);
  const result: number[] = [values[0]!];

  for (let i = 1; i < values.length; i++) {
    result.push(values[i]! * multiplier + result[i - 1]! * (1 - multiplier));
  }

  return result;
}

function macd(closes: number[]): {
  line: number;
  signal: number;
  histogram: number;
  histogramPrior: number;
} {
  if (closes.length < 35) {
    return { line: 0, signal: 0, histogram: 0, histogramPrior: 0 };
  }

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = closes.map((_, index) => ema12[index]! - ema26[index]!);
  const signalLine = ema(macdLine, 9);
  const line = macdLine[macdLine.length - 1] ?? 0;
  const signal = signalLine[signalLine.length - 1] ?? 0;
  const priorLine = macdLine[macdLine.length - 2] ?? line;
  const priorSignal = signalLine[signalLine.length - 2] ?? signal;

  return {
    line,
    signal,
    histogram: line - signal,
    histogramPrior: priorLine - priorSignal,
  };
}

function slope(values: number[], period: number, lookback = 20): "rising" | "falling" | "flat" | "unavailable" {
  if (values.length < period + lookback) return "unavailable";

  const current = sma(values, period);
  const prior = sma(values.slice(0, -lookback), period);
  if (!current || !prior) return "unavailable";

  const pct = (current - prior) / Math.abs(prior || 1);
  if (pct > 0.01) return "rising";
  if (pct < -0.01) return "falling";
  return "flat";
}

function obvTrend(history?: HistoryPoint[]): TechnicalSignals["obvTrend"] {
  if (!history || history.length < 25 || history.every((point) => !point.volume)) {
    return "unavailable";
  }

  let obv = 0;
  const series: number[] = [0];
  for (let i = 1; i < history.length; i++) {
    const current = history[i]!;
    const previous = history[i - 1]!;
    const volume = current.volume ?? 0;

    if (current.value > previous.value) obv += volume;
    if (current.value < previous.value) obv -= volume;
    series.push(obv);
  }

  const recent = series[series.length - 1]!;
  const prior = series[series.length - 21] ?? series[0]!;
  const range = Math.max(...series.slice(-60)) - Math.min(...series.slice(-60));
  const tolerance = Math.max(range * 0.05, Math.abs(prior) * 0.02);

  if (recent > prior + tolerance) return "rising";
  if (recent < prior - tolerance) return "falling";
  return "flat";
}

function recentPivots(values: number[], direction: "high" | "low"): number[] {
  const pivots: number[] = [];
  if (values.length < 7) return pivots;

  for (let i = 3; i < values.length - 3; i++) {
    const window = values.slice(i - 3, i + 4);
    const value = values[i]!;
    const target = direction === "high" ? Math.max(...window) : Math.min(...window);
    if (value === target) pivots.push(value);
  }

  return pivots.slice(-3);
}

function marketStructure(closes: number[]): TechnicalSignals["marketStructure"] {
  if (closes.length < 60) return "insufficient data";

  const recent = closes.slice(-60);
  const high = Math.max(...recent);
  const low = Math.min(...recent);
  const last = closes[closes.length - 1]!;
  const rangePct = (high - low) / Math.abs(last || 1);

  if (rangePct < 0.08) return "consolidating";

  const highs = recentPivots(recent, "high");
  const lows = recentPivots(recent, "low");
  if (highs.length < 2 || lows.length < 2) return "mixed structure";

  const higherHighs = highs[highs.length - 1]! > highs[highs.length - 2]!;
  const higherLows = lows[lows.length - 1]! > lows[lows.length - 2]!;
  const lowerHighs = highs[highs.length - 1]! < highs[highs.length - 2]!;
  const lowerLows = lows[lows.length - 1]! < lows[lows.length - 2]!;

  if (higherHighs && higherLows) return "higher highs / higher lows";
  if (lowerHighs && lowerLows) return "lower highs / lower lows";
  return "mixed structure";
}

function chartTrend(
  structure: TechnicalSignals["marketStructure"],
  vsSma100: TechnicalSignals["vsSma100"],
  vsSma200: TechnicalSignals["vsSma200"],
  sma100Slope: TechnicalSignals["sma100Slope"],
  sma200Slope: TechnicalSignals["sma200Slope"],
): TechnicalSignals["chartTrend"] {
  if (structure === "higher highs / higher lows") return "trending higher";
  if (structure === "lower highs / lower lows") return "trending lower";
  if (structure === "consolidating") return "consolidating";

  if (
    vsSma100 === "above" &&
    vsSma200 === "above" &&
    sma100Slope === "rising" &&
    sma200Slope !== "falling"
  ) {
    return "trending higher";
  }

  if (
    vsSma100 === "below" &&
    vsSma200 === "below" &&
    sma100Slope === "falling" &&
    sma200Slope !== "rising"
  ) {
    return "trending lower";
  }

  return "mixed";
}

function cmp(a: number, b: number, tolerance = 0.002): "above" | "below" | "at" {
  const pct = Math.abs(a - b) / (b || 1);
  if (pct < tolerance) return "at";
  return a > b ? "above" : "below";
}

export function analyzeTechnicals(
  closes: number[],
  invertScore = false,
  history?: HistoryPoint[],
): TechnicalSignals {
  const last = closes[closes.length - 1] ?? 0;
  const s100 = sma(closes, 100);
  const s200 = sma(closes, 200);
  const rsi14 = rsi(closes);
  const macdResult = macd(closes);
  const structure = marketStructure(closes);
  const obv = obvTrend(history);

  const vsSma100 = s100 ? cmp(last, s100) : "at";
  const vsSma200 = s200 ? cmp(last, s200) : "at";
  const sma100Slope = slope(closes, 100);
  const sma200Slope = slope(closes, 200);
  const trend = chartTrend(structure, vsSma100, vsSma200, sma100Slope, sma200Slope);
  const macdBias: TechnicalSignals["macdBias"] =
    Math.abs(macdResult.histogram) < Math.abs(last || 1) * 0.0005
      ? "neutral"
      : macdResult.line > macdResult.signal
        ? "bullish"
        : "bearish";
  const macdHistogramTrend: TechnicalSignals["macdHistogramTrend"] =
    Math.abs(macdResult.histogram - macdResult.histogramPrior) < Math.abs(last || 1) * 0.0005
      ? "flat"
      : macdResult.histogram > macdResult.histogramPrior
        ? "rising"
        : "falling";

  const rsiLabel =
    rsi14 >= 70 ? "overbought" : rsi14 <= 30 ? "oversold" : "neutral";

  const summary = [
    `Price is ${vsSma100} the 100-day average and ${vsSma200} the 200-day average.`,
    `SMA slopes are ${sma100Slope} for the 100-day and ${sma200Slope} for the 200-day.`,
    `RSI(14) is ${rsi14.toFixed(1)} (${rsiLabel}); MACD is ${macdBias} with ${macdHistogramTrend} histogram momentum.`,
    `Chart trend is ${trend}; OBV is ${obv}; market structure is ${structure}.`,
    invertScore ? "Higher readings in this metric imply tighter conditions." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    rsi14,
    vsSma100,
    vsSma200,
    sma100Slope,
    sma200Slope,
    macdLine: macdResult.line,
    macdSignal: macdResult.signal,
    macdHistogram: macdResult.histogram,
    macdBias,
    macdHistogramTrend,
    obvTrend: obv,
    chartTrend: trend,
    marketStructure: structure,
    summary,
  };
}

/** Score 0–100: bullish/neutral/bearish from price action */
export function scoreFromTechnicals(
  closes: number[],
  opts: { invert?: boolean; isYield?: boolean; isVix?: boolean } = {},
  history?: HistoryPoint[],
): number {
  const { invert = false, isYield = false, isVix = false } = opts;
  const tech = analyzeTechnicals(closes, invert, history);
  const s100 = sma(closes, 100);
  const s200 = sma(closes, 200);
  const last = closes[closes.length - 1] ?? 0;
  const volatility = realizedVolatility(closes, 40);
  const dataConfidence = confidenceMultiplier(closes.length, tech.obvTrend);

  const longTermTrend = average([
    normalizedDistance(last, s200, volatility),
    normalizedSlope(closes, 200, 20, volatility),
  ]);
  const intermediateTrend = average([
    normalizedDistance(last, s100, volatility),
    normalizedSlope(closes, 100, 20, volatility),
  ]);
  const structureSignal = structureEdge(tech.marketStructure);
  const momentumSignal = average([
    rsiEdge(tech.rsi14),
    macdEdge(tech, last, volatility),
    percentChangeEdge(closes, 20, volatility),
  ]);
  const volumeSignal = obvEdge(tech.obvTrend);
  const persistenceSignal = average([
    percentChangeEdge(closes, 60, volatility),
    percentChangeEdge(closes, 120, volatility),
  ]);

  let edge =
    longTermTrend * 0.26 +
    intermediateTrend * 0.18 +
    structureSignal * 0.19 +
    momentumSignal * 0.22 +
    volumeSignal * 0.08 +
    persistenceSignal * 0.07;

  if (isVix || isYield || invert) {
    edge *= -1;
  }

  return calibrateEdge(edge, dataConfidence);
}

export function combineTimeframeScores(
  dailyScore: number,
  weeklyScore: number,
  monthlyScore: number,
): number {
  const blended = (dailyScore + weeklyScore + monthlyScore) / 3;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceMultiplier(length: number, obvTrend: TechnicalSignals["obvTrend"]): number {
  const historyConfidence = length >= 260 ? 1 : length >= 120 ? 0.94 : 0.84;
  const volumeConfidence = obvTrend === "unavailable" ? 0.94 : 1;
  return historyConfidence * volumeConfidence;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function realizedVolatility(closes: number[], period: number): number {
  if (closes.length < 3) return 0.03;
  const returns: number[] = [];
  const slice = closes.slice(-period - 1);

  for (let i = 1; i < slice.length; i++) {
    const previous = slice[i - 1]!;
    const current = slice[i]!;
    if (previous) returns.push((current - previous) / previous);
  }

  if (returns.length === 0) return 0.03;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return clamp(Math.sqrt(variance), 0.006, 0.12);
}

function normalizedDistance(
  current: number,
  averageValue: number | null,
  volatility: number,
): number {
  if (!averageValue || !current) return 0;
  const distance = (current - averageValue) / averageValue;
  return clamp(distance / (volatility * 5), -1, 1);
}

function normalizedSlope(
  closes: number[],
  period: number,
  lookback: number,
  volatility: number,
): number {
  if (closes.length < period + lookback) return 0;
  const current = sma(closes, period);
  const prior = sma(closes.slice(0, -lookback), period);
  if (!current || !prior) return 0;
  const move = (current - prior) / prior;
  return clamp(move / (volatility * Math.sqrt(lookback) * 1.4), -1, 1);
}

function percentChangeEdge(
  closes: number[],
  lookback: number,
  volatility: number,
): number {
  if (closes.length <= lookback) return 0;
  const last = closes[closes.length - 1]!;
  const prior = closes[closes.length - 1 - lookback]!;
  if (!prior) return 0;
  const move = (last - prior) / prior;
  return clamp(move / (volatility * Math.sqrt(lookback) * 1.15), -1, 1);
}

function structureEdge(structure: TechnicalSignals["marketStructure"]): number {
  if (structure === "higher highs / higher lows") return 0.82;
  if (structure === "lower highs / lower lows") return -0.82;
  if (structure === "consolidating") return 0;
  return -0.08;
}

function rsiEdge(rsi14: number): number {
  if (rsi14 >= 45 && rsi14 <= 65) return clamp((rsi14 - 50) / 15, -0.35, 0.75);
  if (rsi14 > 65 && rsi14 <= 75) return 0.35;
  if (rsi14 > 75) return -0.12;
  if (rsi14 >= 30 && rsi14 < 45) return clamp((rsi14 - 45) / 18, -0.8, 0);
  return 0.12;
}

function macdEdge(
  tech: TechnicalSignals,
  current: number,
  volatility: number,
): number {
  if (!current) return 0;
  const histogramStrength = clamp(
    tech.macdHistogram / (Math.abs(current) * volatility * 2.5),
    -1,
    1,
  );
  const bias = tech.macdBias === "bullish" ? 0.45 : tech.macdBias === "bearish" ? -0.45 : 0;
  const momentum =
    tech.macdHistogramTrend === "rising"
      ? 0.22
      : tech.macdHistogramTrend === "falling"
        ? -0.22
        : 0;

  return clamp(histogramStrength * 0.5 + bias + momentum, -1, 1);
}

function obvEdge(obvTrendValue: TechnicalSignals["obvTrend"]): number {
  if (obvTrendValue === "rising") return 0.55;
  if (obvTrendValue === "falling") return -0.55;
  return 0;
}

function calibrateEdge(edge: number, confidence = 1): number {
  const boundedEdge = clamp(edge * confidence, -1.2, 1.2);
  const score = 50 + 42 * Math.tanh(boundedEdge * 1.35);
  return Math.max(7, Math.min(93, Math.round(score)));
}

export function buildNarrative(
  name: string,
  score: number,
  tech: TechnicalSignals,
  changePct?: number,
): string {
  const bias =
    score >= 65 ? "constructive" : score <= 35 ? "cautious" : "neutral";
  const ch =
    changePct !== undefined
      ? ` Recent change: ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%.`
      : "";
  return `${name} scores ${score}/100 (${bias} bias).${ch} ${tech.summary}`;
}
