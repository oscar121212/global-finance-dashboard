import type { HistoryPoint, InstrumentConfig } from "../types";
import { analyzeTechnicals, aggregateWeeklyHistory, buildNarrative, combineTimeframeScores, scoreFromTechnicals } from "./technicalAnalysis";
import type { MetricResult } from "../types";

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function syntheticCloses(seed: string, days = 3650): number[] {
  const rand = seededRandom(seed);
  const closes: number[] = [];
  let price = 80 + rand() * 40;
  for (let i = 0; i < days; i++) {
    price *= 1 + (rand() - 0.48) * 0.025;
    closes.push(price);
  }
  return closes;
}

function historyFromCloses(closes: number[], seed: string): HistoryPoint[] {
  const today = new Date();
  const rand = seededRandom(`${seed}-volume`);
  return closes.map((value, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (closes.length - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      value,
      volume: Math.round(500_000 + rand() * 5_000_000),
    };
  });
}

export function buildDemoMetric(instrument: InstrumentConfig): MetricResult {
  const closes = syntheticCloses(instrument.id);
  const history = historyFromCloses(closes, instrument.id);
  const isVix = instrument.id === "vix";
  const isYield =
    instrument.category === "bonds" || instrument.category === "rates";
  const invert =
    instrument.id === "dxy" ||
    instrument.id === "global-liq" ||
    instrument.category === "rates";

  const weeklyHistory = aggregateWeeklyHistory(history);
  const weeklyCloses = weeklyHistory.map((point) => point.value);
  const dailyScore = scoreFromTechnicals(closes, {
    invert,
    isYield: isYield && instrument.category === "bonds",
    isVix,
  }, history);
  const weeklyScore = scoreFromTechnicals(weeklyCloses, {
    invert,
    isYield: isYield && instrument.category === "bonds",
    isVix,
  }, weeklyHistory);
  const score = combineTimeframeScores(dailyScore, weeklyScore);
  const dailyTechnical = analyzeTechnicals(closes, invert, history);
  const weeklyTechnical = analyzeTechnicals(weeklyCloses, invert, weeklyHistory);
  const price = closes[closes.length - 1]!;
  const prev = closes[closes.length - 2] ?? price;
  const changePct = ((price - prev) / prev) * 100;

  return {
    instrument,
    score,
    dailyScore,
    weeklyScore,
    price,
    changePct,
    closes,
    history,
    technical: dailyTechnical,
    dailyTechnical,
    weeklyTechnical,
    narrative: buildNarrative(instrument.name, score, dailyTechnical, changePct),
    updatedAt: new Date().toISOString(),
    isDemo: true,
  };
}
