import type { InstrumentConfig } from "../types";
import { analyzeTechnicals, buildNarrative, scoreFromTechnicals } from "./technicalAnalysis";
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

function syntheticCloses(seed: string, days = 90): number[] {
  const rand = seededRandom(seed);
  const closes: number[] = [];
  let price = 80 + rand() * 40;
  for (let i = 0; i < days; i++) {
    price *= 1 + (rand() - 0.48) * 0.025;
    closes.push(price);
  }
  return closes;
}

export function buildDemoMetric(instrument: InstrumentConfig): MetricResult {
  const closes = syntheticCloses(instrument.id);
  const isVix = instrument.id === "vix";
  const isYield =
    instrument.category === "bonds" || instrument.category === "rates";
  const invert =
    instrument.id === "dxy" ||
    instrument.id === "global-liq" ||
    instrument.category === "rates";

  const score = scoreFromTechnicals(closes, {
    invert,
    isYield: isYield && instrument.category === "bonds",
    isVix,
  });
  const technical = analyzeTechnicals(closes, invert);
  const price = closes[closes.length - 1]!;
  const prev = closes[closes.length - 2] ?? price;
  const changePct = ((price - prev) / prev) * 100;

  return {
    instrument,
    score,
    price,
    changePct,
    technical,
    narrative: buildNarrative(instrument.name, score, technical, changePct),
    updatedAt: new Date().toISOString(),
    isDemo: true,
  };
}
