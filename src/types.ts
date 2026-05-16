export type CategoryId =
  | "liquidity"
  | "indices"
  | "fx"
  | "bonds"
  | "volatility"
  | "commodities"
  | "tech"
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
  explanation: string;
}

export interface TechnicalSignals {
  rsi14: number;
  vsSma20: "above" | "below" | "at";
  vsSma50: "above" | "below" | "at";
  trend20: "up" | "down" | "flat";
  summary: string;
}

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface MetricResult {
  instrument: InstrumentConfig;
  score: number;
  price?: number;
  changePct?: number;
  closes?: number[];
  history?: HistoryPoint[];
  technical: TechnicalSignals;
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
