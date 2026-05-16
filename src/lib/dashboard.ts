import { CATEGORY_META, CATEGORY_ORDER, INSTRUMENTS } from "../data/instruments";
import type { CategorySummary, DashboardState } from "../types";
import { fetchMetric, hasLiveKeys } from "./marketData";

const BATCH = 4;

async function mapInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  size: number,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.all(chunk.map(fn));
    out.push(...results);
  }
  return out;
}

export async function loadDashboard(): Promise<
  Pick<DashboardState, "categories" | "globalScore" | "lastRefresh" | "dataMode">
> {
  const metrics = await mapInBatches(INSTRUMENTS, fetchMetric, BATCH);

  const categories: CategorySummary[] = CATEGORY_ORDER.map((id) => {
    const catMetrics = metrics.filter((m) => m.instrument.category === id);
    const averageScore =
      catMetrics.length === 0
        ? 0
        : Math.round(
            catMetrics.reduce((s, m) => s + m.score, 0) / catMetrics.length,
          );
    return {
      id,
      title: CATEGORY_META[id].title,
      description: CATEGORY_META[id].description,
      averageScore,
      metrics: catMetrics,
    };
  });

  const globalScore = Math.round(
    metrics.reduce((s, m) => s + m.score, 0) / metrics.length,
  );

  const isDemo = metrics.every((m) => m.isDemo);

  return {
    categories,
    globalScore,
    lastRefresh: new Date().toISOString(),
    dataMode: isDemo ? "demo" : hasLiveKeys() ? "live" : "demo",
  };
}
