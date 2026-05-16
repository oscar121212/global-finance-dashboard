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

/** Min closing prices for TA (RSI14 ~ needs 15; SMA20 needs 20) */
const MIN_CLOSES = 20;

/**
 * When Finnhub stock/candle returns empty (common on free tier for ^ indices / futures),
 * try liquid ETF / proxy symbols.
 */
const FINNHUB_STOCK_FALLBACKS: Record<string, string[]> = {
  "^GSPC": ["SPY", "IVV"],
  "^IXIC": ["QQQ"],
  "^DJI": ["DIA"],
  "^TNX": ["IEF"],
  "GC=F": ["GLD"],
  "SI=F": ["SLV"],
  "HG=F": ["CPER"],
  "CL=F": ["USO"],
  "^HSI": ["FXI"],
  "^GDAXI": ["EWG"],
  "^STI": ["EWS"],
  "^NZ50": ["ENZL"],
  "^AXJO": ["EWA"],
  "399001.SZ": ["MCHI"],
};

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
  s?: string;
};

function normalizeFinnhubCloses(data: FinnhubCandle | null): number[] | null {
  if (!data?.c?.length || data.s === "no_data") return null;
  return data.c;
}

async function finnhubStockCandles(symbol: string): Promise<number[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 120 * 24 * 3600;
  const url = isDev
    ? `/api/finnhub/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_KEY}`
    : `/api/finnhub-candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`;
  if (isDev && !FINNHUB_KEY) return null;
  const data = await fetchJson<FinnhubCandle>(url);
  return normalizeFinnhubCloses(data);
}

async function finnhubForexCandles(symbol: string): Promise<number[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 120 * 24 * 3600;
  const url = isDev
    ? `/api/finnhub/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_KEY}`
    : `/api/finnhub-forex-candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`;
  if (isDev && !FINNHUB_KEY) return null;
  const data = await fetchJson<FinnhubCandle>(url);
  return normalizeFinnhubCloses(data);
}

async function finnhubClosesForSymbol(symbol: string): Promise<number[] | null> {
  if (symbol.startsWith("OANDA:")) {
    return finnhubForexCandles(symbol);
  }
  const fallbacks = FINNHUB_STOCK_FALLBACKS[symbol] ?? [];
  const chain = [symbol, ...fallbacks];
  for (const sym of chain) {
    const c = await finnhubStockCandles(sym);
    if (c && c.length >= MIN_CLOSES) return c;
  }
  return null;
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
  return vals.length >= MIN_CLOSES ? vals : null;
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
      closes = await finnhubClosesForSymbol(instrument.finnhubSymbol);
      const q = await finnhubQuote(instrument.finnhubSymbol);
      if (q?.c) {
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

  if (!closes || closes.length < MIN_CLOSES) {
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
    closes,
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
