export type CategoryId =
  | "liquidity"
  | "indices"
  | "fx"
  | "bonds"
  | "volatility"
  | "commodities"
  | "tech"
  | "semiconductors"
  | "mining"
  | "crypto"
  | "rates";

export type DataSource = "finnhub" | "fred" | "coingecko" | "demo";

export interface InstrumentConfig {
  id: string;
  name: string;
  symbol: string;
  category: CategoryId;
  source: DataSource;
  fredSeriesId?: string;
  coingeckoId?: string;
  finnhubSymbol?: string;
  yahooSymbol?: string;
  explanation: string;
}

export interface TechnicalSignals {
  rsi14: number;
  vsSma100: "above" | "below" | "at";
  vsSma200: "above" | "below" | "at";
  sma100Slope: "rising" | "falling" | "flat" | "unavailable";
  sma200Slope: "rising" | "falling" | "flat" | "unavailable";
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  macdBias: "bullish" | "bearish" | "neutral";
  macdHistogramTrend: "rising" | "falling" | "flat";
  obvTrend: "rising" | "falling" | "flat" | "unavailable";
  chartTrend: "trending higher" | "trending lower" | "consolidating" | "mixed";
  marketStructure:
    | "higher highs / higher lows"
    | "lower highs / lower lows"
    | "mixed structure"
    | "consolidating"
    | "insufficient data";
  summary: string;
}

export interface HistoryPoint {
  date: string;
  value: number;
  volume?: number;
}

export interface MetricResult {
  instrument: InstrumentConfig;
  score: number;
  dailyScore: number;
  weeklyScore: number;
  price?: number;
  changePct?: number;
  closes?: number[];
  history?: HistoryPoint[];
  technical: TechnicalSignals;
  dailyTechnical: TechnicalSignals;
  weeklyTechnical: TechnicalSignals;
  narrative: string;
  updatedAt: string;
  isDemo: boolean;
}

export interface CategorySummary {
  id: CategoryId;
  title: string;
  description: string;
  averageScore: number;
  metrics: MetricResult[];
}

export interface DashboardState {
  categories: CategorySummary[];
  globalScore: number;
  lastRefresh: string;
  loading: boolean;
  error: string | null;
  dataMode: "live" | "demo";
}
