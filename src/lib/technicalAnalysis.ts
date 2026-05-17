import type { HistoryPoint, TechnicalSignals } from "../types";

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
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
    `OBV is ${obv}; market structure is ${structure}.`,
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
  let score = 50;

  if (tech.vsSma100 === "above") score += 10;
  if (tech.vsSma100 === "below") score -= 10;

  if (tech.vsSma200 === "above") score += 10;
  if (tech.vsSma200 === "below") score -= 10;

  if (tech.sma100Slope === "rising") score += 8;
  if (tech.sma100Slope === "falling") score -= 8;

  if (tech.sma200Slope === "rising") score += 8;
  if (tech.sma200Slope === "falling") score -= 8;

  if (tech.rsi14 >= 55 && tech.rsi14 <= 70) score += 10;
  if (tech.rsi14 > 70) score -= 4;
  if (tech.rsi14 < 45 && tech.rsi14 >= 30) score -= 8;
  if (tech.rsi14 < 30) score += 4;

  if (tech.macdBias === "bullish") score += 10;
  if (tech.macdBias === "bearish") score -= 10;
  if (tech.macdHistogramTrend === "rising") score += 4;
  if (tech.macdHistogramTrend === "falling") score -= 4;

  if (tech.obvTrend === "rising") score += 8;
  if (tech.obvTrend === "falling") score -= 8;

  if (tech.marketStructure === "higher highs / higher lows") score += 12;
  if (tech.marketStructure === "lower highs / lower lows") score -= 12;
  if (tech.marketStructure === "consolidating") score -= 2;

  if (isVix) {
    score = 100 - score;
  }
  if (isYield) {
    score = 100 - score;
  }
  if (invert) {
    score = 100 - score;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
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
