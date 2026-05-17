import type { HistoryPoint, InstrumentConfig, MetricResult } from "../types";
import { buildDemoMetric } from "./demoData";
import {
  analyzeTechnicals,
  aggregateWeeklyHistory,
  buildNarrative,
  combineTimeframeScores,
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
  "^NSEI": ["INDA"],
  "^N225": ["EWJ"],
  "^BVSP": ["EWZ"],
  "^GSPTSE": ["EWC"],
  "^FTSE": ["EWU"],
  "^TNX": ["IEF"],
  "GC=F": ["GLD"],
  "SI=F": ["SLV"],
  "HG=F": ["CPER"],
  "CL=F": ["USO"],
  "LITP": ["LIT", "ALB"],
  "URNM": ["URA"],
  "PL=F": ["PPLT"],
  "ALI=F": ["JJU", "AA"],
  "TIN=F": ["JJT"],
  "ZNC=F": ["JJN"],
  "HCC": ["ARCH"],
  "ARCH": ["BTU"],
  "U.UN.TO": ["SRUUF", "URNM"],
  "NTR": ["MOS"],
  "NG=F": ["UNG"],
  "LBS=F": ["WOOD"],
  "ZW=F": ["WEAT"],
  "^HSI": ["FXI"],
  "^GDAXI": ["EWG"],
  "^STI": ["EWS"],
  "^NZ50": ["ENZL"],
  "^AXJO": ["EWA"],
  "399001.SZ": ["MCHI"],
};

const YAHOO_SYMBOLS: Record<string, string> = {
  "OANDA:EUR_USD": "EURUSD=X",
  "OANDA:AUD_USD": "AUDUSD=X",
  "OANDA:NZD_USD": "NZDUSD=X",
  "OANDA:AUD_NZD": "AUDNZD=X",
  "OANDA:GBP_USD": "GBPUSD=X",
  "OANDA:USD_JPY": "JPY=X",
  "DX-Y.NYB": "DX-Y.NYB",
  "^GSPC": "^GSPC",
  "^IXIC": "^IXIC",
  "^DJI": "^DJI",
  "^NSEI": "^NSEI",
  "^N225": "^N225",
  "^BVSP": "^BVSP",
  "^GSPTSE": "^GSPTSE",
  "^FTSE": "^FTSE",
  "399001.SZ": "399001.SZ",
  "^STI": "^STI",
  "^HSI": "^HSI",
  "^GDAXI": "^GDAXI",
  "^TNX": "^TNX",
  "^AXJO": "^AXJO",
  "^NZ50": "^NZ50",
  "^VIX": "^VIX",
  "GC=F": "GC=F",
  "SI=F": "SI=F",
  "HG=F": "HG=F",
  "CL=F": "CL=F",
  "TIO=F": "TIO=F",
  "LITP": "LITP",
  "URNM": "URNM",
  "PL=F": "PL=F",
  "ALI=F": "ALI=F",
  "TIN=F": "TIN=F",
  "ZNC=F": "ZNC=F",
  "HCC": "HCC",
  "ARCH": "ARCH",
  "U.UN.TO": "U.UN.TO",
  "NTR": "NTR",
  "NG=F": "NG=F",
  "LBS=F": "LBS=F",
  "ZW=F": "ZW=F",
  "NST.AX": "NST.AX",
};

const YAHOO_FALLBACKS: Record<string, string[]> = {
  "^GSPC": ["SPY"],
  "^IXIC": ["QQQ"],
  "^DJI": ["DIA"],
  "^NSEI": ["INDA"],
  "^N225": ["EWJ"],
  "^BVSP": ["EWZ"],
  "^GSPTSE": ["EWC"],
  "^FTSE": ["EWU"],
  "^TNX": ["IEF"],
  "^AXJO": ["EWA"],
  "^NZ50": ["ENZL"],
  "^HSI": ["FXI"],
  "^GDAXI": ["EWG"],
  "^STI": ["EWS"],
  "399001.SZ": ["MCHI"],
  "GC=F": ["GLD"],
  "SI=F": ["SLV"],
  "HG=F": ["CPER"],
  "CL=F": ["USO"],
  "LITP": ["LIT", "ALB"],
  "URNM": ["URA"],
  "PL=F": ["PPLT"],
  "ALI=F": ["JJU", "AA"],
  "TIN=F": ["JJT"],
  "ZNC=F": ["JJN"],
  "HCC": ["ARCH"],
  "ARCH": ["BTU"],
  "U.UN.TO": ["SRUUF", "URNM"],
  "NTR": ["MOS"],
  "NG=F": ["UNG"],
  "LBS=F": ["WOOD"],
  "ZW=F": ["WEAT"],
  "DX-Y.NYB": ["UUP"],
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
  v?: number[];
  s?: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

function normalizeFinnhubHistory(data: FinnhubCandle | null): HistoryPoint[] | null {
  if (!data?.c?.length || data.s === "no_data") return null;
  return data.c
    .map((value, index): HistoryPoint | null => {
      const seconds = data.t[index];
      if (!seconds || !Number.isFinite(value)) return null;
      const point: HistoryPoint = {
        date: new Date(seconds * 1000).toISOString().slice(0, 10),
        value,
      };
      const volume = data.v?.[index];
      if (volume !== undefined && Number.isFinite(volume)) point.volume = volume;
      return point;
    })
    .filter((point): point is HistoryPoint => Boolean(point));
}

async function finnhubStockCandles(symbol: string): Promise<HistoryPoint[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 3650 * 24 * 3600;
  const url = isDev
    ? `/api/finnhub/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_KEY}`
    : `/api/finnhub-candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`;
  if (isDev && !FINNHUB_KEY) return null;
  const data = await fetchJson<FinnhubCandle>(url);
  return normalizeFinnhubHistory(data);
}

async function finnhubForexCandles(symbol: string): Promise<HistoryPoint[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 3650 * 24 * 3600;
  const url = isDev
    ? `/api/finnhub/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&token=${FINNHUB_KEY}`
    : `/api/finnhub-forex-candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`;
  if (isDev && !FINNHUB_KEY) return null;
  const data = await fetchJson<FinnhubCandle>(url);
  return normalizeFinnhubHistory(data);
}

async function finnhubHistoryForSymbol(symbol: string): Promise<HistoryPoint[] | null> {
  if (symbol.startsWith("OANDA:")) {
    return finnhubForexCandles(symbol);
  }
  const fallbacks = FINNHUB_STOCK_FALLBACKS[symbol] ?? [];
  const chain = [symbol, ...fallbacks];
  for (const sym of chain) {
    const history = await finnhubStockCandles(sym);
    if (history && history.length >= MIN_CLOSES) return history;
  }
  return null;
}

function yahooCandidates(symbol: string): string[] {
  const primary = YAHOO_SYMBOLS[symbol] ?? symbol;
  const fallbacks = YAHOO_FALLBACKS[primary] ?? YAHOO_FALLBACKS[symbol] ?? [];
  return [primary, ...fallbacks];
}

async function yahooChart(symbol: string): Promise<HistoryPoint[] | null> {
  const url = `/api/yahoo-chart?symbol=${encodeURIComponent(symbol)}&range=10y&interval=1d`;
  const data = await fetchJson<YahooChartResponse>(url);
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;
  const volumes = result?.indicators?.quote?.[0]?.volume;

  if (!timestamps?.length || !closes?.length) return null;

  const history = timestamps
    .map((seconds, index): HistoryPoint | null => {
      const value = closes[index];
      if (value === null || value === undefined || !Number.isFinite(value)) {
        return null;
      }

      const point: HistoryPoint = {
        date: new Date(seconds * 1000).toISOString().slice(0, 10),
        value,
      };
      const volume = volumes?.[index];
      if (volume !== null && volume !== undefined && Number.isFinite(volume)) {
        point.volume = volume;
      }
      return point;
    })
    .filter((point): point is HistoryPoint => Boolean(point));

  return history.length >= MIN_CLOSES ? history : null;
}

async function yahooHistoryForSymbol(symbol: string): Promise<HistoryPoint[] | null> {
  for (const candidate of yahooCandidates(symbol)) {
    const history = await yahooChart(candidate);
    if (history && history.length >= MIN_CLOSES) return history;
  }
  return null;
}

function shouldConvertPriceToUsd(instrument: InstrumentConfig): boolean {
  const symbol = instrument.yahooSymbol ?? instrument.finnhubSymbol ?? instrument.symbol;
  if (instrument.category !== "tech" && instrument.category !== "mining") return false;
  return symbol.endsWith(".AX");
}

async function convertAudHistoryToUsd(
  history: HistoryPoint[],
): Promise<HistoryPoint[] | null> {
  const audUsd = await yahooChart("AUDUSD=X");
  if (!audUsd?.length) return null;

  const rates = [...audUsd].sort((a, b) => a.date.localeCompare(b.date));
  let rateIndex = 0;

  return [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => {
      while (
        rateIndex + 1 < rates.length &&
        rates[rateIndex + 1]!.date <= point.date
      ) {
        rateIndex += 1;
      }

      const rate = rates[rateIndex]?.value;
      if (!rate || !Number.isFinite(rate)) return point;

      return {
        date: point.date,
        value: point.value * rate,
        volume: point.volume,
      };
    });
}

async function finnhubQuote(symbol: string): Promise<{ c: number; dp: number } | null> {
  const url = isDev
    ? `/api/finnhub/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
    : `/api/finnhub-quote?symbol=${encodeURIComponent(symbol)}`;
  if (isDev && !FINNHUB_KEY) return null;
  return fetchJson(url);
}

async function fredSeries(seriesId: string): Promise<HistoryPoint[] | null> {
  const url = isDev
    ? `/api/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1300`
    : `/api/fred-observations?series_id=${seriesId}&limit=1300`;
  if (isDev && !FRED_KEY) return fredPublicSeries(seriesId);
  const data = await fetchJson<{
    observations: { date: string; value: string }[];
  }>(url);
  if (!data?.observations?.length) return fredPublicSeries(seriesId);
  const vals = data.observations
    .map((o) => ({
      date: o.date,
      value: parseFloat(o.value),
    }))
    .filter((point) => !Number.isNaN(point.value))
    .reverse();
  return vals.length >= MIN_CLOSES ? vals : fredPublicSeries(seriesId);
}

async function fredPublicSeries(seriesId: string): Promise<HistoryPoint[] | null> {
  if (isDev) return null;

  const data = await fetchJson<{
    observations: { date: string; value: string }[];
  }>(`/api/fred-public?series_id=${seriesId}`);

  if (!data?.observations?.length) return null;

  const vals = data.observations
    .map((o) => ({
      date: o.date,
      value: parseFloat(o.value),
    }))
    .filter((point) => !Number.isNaN(point.value));

  return vals.length >= MIN_CLOSES ? vals : null;
}

async function coingeckoHistory(id: string): Promise<HistoryPoint[] | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=3650`;
  const data = await fetchJson<{ prices: [number, number][] }>(url);
  if (!data?.prices?.length) return null;
  return data.prices.map((p) => ({
    date: new Date(p[0]).toISOString().slice(0, 10),
    value: p[1],
  }));
}

export async function fetchMetric(
  instrument: InstrumentConfig,
): Promise<MetricResult> {
  let history: HistoryPoint[] | null = null;
  let price: number | undefined;
  let changePct: number | undefined;

  try {
    if (instrument.source === "finnhub" && instrument.finnhubSymbol) {
      const finnhubHistory = await finnhubHistoryForSymbol(instrument.finnhubSymbol);
      const yahooHistory = await yahooHistoryForSymbol(instrument.finnhubSymbol);
      history =
        yahooHistory && (!finnhubHistory || yahooHistory.length > finnhubHistory.length)
          ? yahooHistory
          : finnhubHistory;
      if (history && shouldConvertPriceToUsd(instrument)) {
        const converted = await convertAudHistoryToUsd(history);
        if (converted) {
          history = converted;
          price = undefined;
          changePct = undefined;
        }
      }
      const q = await finnhubQuote(instrument.finnhubSymbol);
      if (q?.c && !shouldConvertPriceToUsd(instrument)) {
        price = q.c;
        changePct = q.dp;
      }
    } else if (instrument.source === "fred" && instrument.fredSeriesId) {
      history = await fredSeries(instrument.fredSeriesId);
      if (history?.length) {
        const last = history[history.length - 1]?.value;
        const prev = history[history.length - 2]?.value;
        price = last;
        if (last !== undefined && prev) changePct = ((last - prev) / prev) * 100;
      }
    } else if (instrument.source === "coingecko" && instrument.coingeckoId) {
      history = await coingeckoHistory(instrument.coingeckoId);
      if ((!history || history.length < MIN_CLOSES) && instrument.yahooSymbol) {
        history = await yahooHistoryForSymbol(instrument.yahooSymbol);
      }
      if (history?.length) {
        const last = history[history.length - 1]?.value;
        const prev = history[history.length - 2]?.value;
        price = last;
        if (last !== undefined && prev) changePct = ((last - prev) / prev) * 100;
      }
    }
  } catch {
    /* fall through to demo */
  }

  if (!history || history.length < MIN_CLOSES) {
    return buildDemoMetric(instrument);
  }

  const closes = history.map((point) => point.value);

  const isVix = instrument.id === "vix";
  const isYield = instrument.category === "bonds";
  const invert =
    instrument.id === "dxy" ||
    instrument.id === "global-liq" ||
    (instrument.category === "rates" && instrument.id !== "fed");

  const weeklyHistory = aggregateWeeklyHistory(history);
  const weeklyCloses = weeklyHistory.map((point) => point.value);
  const dailyScore = scoreFromTechnicals(closes, { invert, isYield, isVix }, history);
  const weeklyScore = scoreFromTechnicals(weeklyCloses, { invert, isYield, isVix }, weeklyHistory);
  const score = combineTimeframeScores(dailyScore, weeklyScore);
  const dailyTechnical = analyzeTechnicals(closes, invert, history);
  const weeklyTechnical = analyzeTechnicals(weeklyCloses, invert, weeklyHistory);

  if (price === undefined) price = closes[closes.length - 1];
  if (changePct === undefined && closes.length > 1) {
    const last = closes[closes.length - 1]!;
    const prev = closes[closes.length - 2]!;
    changePct = ((last - prev) / prev) * 100;
  }

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
    narrative: buildNarrative(
      instrument.name,
      score,
      dailyTechnical,
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
