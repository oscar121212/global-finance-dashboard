import type { InstrumentConfig, MetricResult } from "../types";
import { buildDemoMetric } from "./demoData";
import {
  analyzeTechnicals,
  buildNarrative,
  scoreFromTechnicals,
} from "./technicalAnalysis";

const FINNHUB_KEY =
  import.meta.env.VITE_FINNHUB_API_KEY ?? import.meta.env.FINNHUB_API_KEY ?? "";
const FRED_KEY =
  import.meta.env.VITE_FRED_API_KEY ?? import.meta.env.FRED_API_KEY ?? "";

const isDev = import.meta.env.DEV;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type FinnhubCandle = {
  c: number[];
  t: number[];
};

async function finnhubCandles(symbol: string): Promise<number[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 120 * 24 * 3600;
  const url = isDev
    ? `/api/finnhub/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_KEY}`
    : `/api/finnhub-candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`;
  if (isDev && !FINNHUB_KEY) return null;
  const data = await fetchJson<FinnhubCandle>(url);
  if (!data?.c?.length) return null;
  return data.c;
}

async function finnhubQuote(symbol: string): Promise<{ c: number; dp: number } | null> {
  const url = isDev
    ? `/api/finnhub/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
    : `/api/finnhub-quote?symbol=${encodeURIComponent(symbol)}`;
  if (isDev && !FINNHUB_KEY) return null;
  return fetchJson(url);
}

async function fredSeries(seriesId: string): Promise<number[] | null> {
  const url = isDev
    ? `/api/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=120`
    : `/api/fred-observations?series_id=${seriesId}&limit=120`;
  if (isDev && !FRED_KEY) return null;
  const data = await fetchJson<{
    observations: { value: string }[];
  }>(url);
  if (!data?.observations?.length) return null;
  const vals = data.observations
    .map((o) => parseFloat(o.value))
    .filter((v) => !Number.isNaN(v))
    .reverse();
  return vals.length >= 30 ? vals : null;
}

async function coingeckoHistory(id: string): Promise<number[] | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=90`;
  const data = await fetchJson<{ prices: [number, number][] }>(url);
  if (!data?.prices?.length) return null;
  return data.prices.map((p) => p[1]);
}

export async function fetchMetric(
  instrument: InstrumentConfig,
): Promise<MetricResult> {
  let closes: number[] | null = null;
  let price: number | undefined;
  let changePct: number | undefined;

  try {
    if (instrument.source === "finnhub" && instrument.finnhubSymbol) {
      closes = await finnhubCandles(instrument.finnhubSymbol);
      const q = await finnhubQuote(instrument.finnhubSymbol);
      if (q) {
        price = q.c;
        changePct = q.dp;
      }
    } else if (instrument.source === "fred" && instrument.fredSeriesId) {
      closes = await fredSeries(instrument.fredSeriesId);
      if (closes?.length) {
        price = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        if (prev) changePct = ((price - prev) / prev) * 100;
      }
    } else if (instrument.source === "coingecko" && instrument.coingeckoId) {
      closes = await coingeckoHistory(instrument.coingeckoId);
      if (closes?.length) {
        price = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        if (prev) changePct = ((price - prev) / prev) * 100;
      }
    }
  } catch {
    /* fall through to demo */
  }

  if (!closes || closes.length < 30) {
    return buildDemoMetric(instrument);
  }

  const isVix = instrument.id === "vix";
  const isYield = instrument.category === "bonds";
  const invert =
    instrument.id === "dxy" ||
    instrument.id === "global-liq" ||
    (instrument.category === "rates" && instrument.id !== "fed");

  const score = scoreFromTechnicals(closes, { invert, isYield, isVix });
  const technical = analyzeTechnicals(closes, invert);

  if (price === undefined) price = closes[closes.length - 1];
  if (changePct === undefined && closes.length > 1) {
    const last = closes[closes.length - 1]!;
    const prev = closes[closes.length - 2]!;
    changePct = ((last - prev) / prev) * 100;
  }

  return {
    instrument,
    score,
    price,
    changePct,
    technical,
    narrative: buildNarrative(
      instrument.name,
      score,
      technical,
      changePct,
    ),
    updatedAt: new Date().toISOString(),
    isDemo: false,
  };
}

export function hasLiveKeys(): boolean {
  if (isDev) return Boolean(FINNHUB_KEY || FRED_KEY);
  return true;
}
