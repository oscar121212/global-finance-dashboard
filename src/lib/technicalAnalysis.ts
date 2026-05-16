import type { TechnicalSignals } from "../types";

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

function cmp(a: number, b: number, tolerance = 0.002): "above" | "below" | "at" {
  const pct = Math.abs(a - b) / (b || 1);
  if (pct < tolerance) return "at";
  return a > b ? "above" : "below";
}

export function analyzeTechnicals(
  closes: number[],
  invertScore = false,
): TechnicalSignals {
  const last = closes[closes.length - 1] ?? 0;
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const rsi14 = rsi(closes);
  const prior = closes[closes.length - 21] ?? closes[0] ?? last;
  const trend20: "up" | "down" | "flat" =
    last > prior * 1.02 ? "up" : last < prior * 0.98 ? "down" : "flat";

  const vsSma20 = s20 ? cmp(last, s20) : "at";
  const vsSma50 = s50 ? cmp(last, s50) : "at";

  const rsiLabel =
    rsi14 >= 70 ? "overbought" : rsi14 <= 30 ? "oversold" : "neutral";

  const summary = [
    `Price is ${vsSma20} the 20-day average and ${vsSma50} the 50-day average.`,
    `20-day trend is ${trend20}. RSI(14) is ${rsi14.toFixed(1)} (${rsiLabel}).`,
    invertScore ? "Higher readings in this metric imply tighter conditions." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { rsi14, vsSma20, vsSma50, trend20, summary };
}

/** Score 0–100: bullish/neutral/bearish from price action */
export function scoreFromTechnicals(
  closes: number[],
  opts: { invert?: boolean; isYield?: boolean; isVix?: boolean } = {},
): number {
  const { invert = false, isYield = false, isVix = false } = opts;
  const tech = analyzeTechnicals(closes, invert);
  let score = 50;

  if (tech.trend20 === "up") score += 15;
  if (tech.trend20 === "down") score -= 15;

  if (tech.vsSma20 === "above") score += 12;
  if (tech.vsSma20 === "below") score -= 12;

  if (tech.vsSma50 === "above") score += 8;
  if (tech.vsSma50 === "below") score -= 8;

  if (tech.rsi14 >= 55 && tech.rsi14 <= 70) score += 10;
  if (tech.rsi14 > 70) score -= 5;
  if (tech.rsi14 < 45 && tech.rsi14 >= 30) score -= 8;
  if (tech.rsi14 < 30) score += 5;

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
