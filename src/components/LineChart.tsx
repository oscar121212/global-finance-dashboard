import { useMemo, useState } from "react";
import type { HistoryPoint } from "../types";

type Timeframe = "daily" | "weekly" | "monthly";

type LineChartProps = {
  values?: number[];
  history?: HistoryPoint[];
  title: string;
  yAxisLabel: string;
};

type ChartPoint = HistoryPoint & {
  sma100?: number;
  sma200?: number;
};

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function weekKey(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = parsed.getUTCDay() || 7;
  parsed.setUTCDate(parsed.getUTCDate() - day + 1);
  return parsed.toISOString().slice(0, 10);
}

function addMovingAverages(points: HistoryPoint[]): ChartPoint[] {
  return points.map((point, index) => {
    const withAverage: ChartPoint = { ...point };

    if (index >= 99) {
      const slice = points.slice(index - 99, index + 1);
      withAverage.sma100 = slice.reduce((sum, p) => sum + p.value, 0) / 100;
    }

    if (index >= 199) {
      const slice = points.slice(index - 199, index + 1);
      withAverage.sma200 = slice.reduce((sum, p) => sum + p.value, 0) / 200;
    }

    return withAverage;
  });
}

function aggregate(points: ChartPoint[], timeframe: Timeframe): ChartPoint[] {
  if (timeframe === "daily") return points.slice(-100);

  const map = new Map<string, ChartPoint>();
  for (const point of points) {
    const key =
      timeframe === "weekly" ? weekKey(point.date) : point.date.slice(0, 7);
    map.set(key, point);
  }

  return Array.from(map.values()).slice(-100);
}

function historyFromValues(values?: number[]): HistoryPoint[] {
  const chartValues = values?.filter((v) => Number.isFinite(v)) ?? [];
  const today = new Date();
  return chartValues.map((value, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (chartValues.length - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      value,
    };
  });
}

export default function LineChart({ values, history, title, yAxisLabel }: LineChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const sourcePoints = history?.length ? history : historyFromValues(values);
  const sourceWithAverages = useMemo(
    () => addMovingAverages(sourcePoints),
    [sourcePoints],
  );
  const pointsByTimeframe = useMemo(
    () => aggregate(sourceWithAverages, timeframe),
    [sourceWithAverages, timeframe],
  );
  const chartPoints = pointsByTimeframe.filter((point) =>
    Number.isFinite(point.value),
  );
  const chartValues = chartPoints.map((point) => point.value);

  if (chartValues.length < 2) {
    return (
      <div className="chart-empty">
        Not enough price history to draw a chart yet.
      </div>
    );
  }

  const width = 760;
  const height = 320;
  const leftPad = 74;
  const rightPad = 22;
  const topPad = 24;
  const bottomPad = 48;
  const averageValues = chartPoints.flatMap((point) =>
    [point.sma100, point.sma200].filter((v): v is number =>
      Number.isFinite(v),
    ),
  );
  const plottedValues = [...chartValues, ...averageValues];
  const min = Math.min(...plottedValues);
  const max = Math.max(...plottedValues);
  const range = max - min || 1;

  const xForIndex = (index: number) =>
    leftPad +
    (index / (chartPoints.length - 1)) * (width - leftPad - rightPad);
  const yForValue = (value: number) =>
    height -
    bottomPad -
    ((value - min) / range) * (height - topPad - bottomPad);

  const polylineFrom = (selector: (point: ChartPoint) => number | undefined) =>
    chartPoints
      .map((point, index) => {
        const value = selector(point);
        if (value === undefined || !Number.isFinite(value)) return null;
        return `${xForIndex(index).toFixed(1)},${yForValue(value).toFixed(1)}`;
      })
      .filter((point): point is string => Boolean(point))
      .join(" ");

  const polylinePoints = chartPoints
    .map((point, index) => {
      const x =
        leftPad +
        (index / (chartPoints.length - 1)) * (width - leftPad - rightPad);
      const y =
        height -
        bottomPad -
        ((point.value - min) / range) * (height - topPad - bottomPad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const sma100Points = polylineFrom((point) => point.sma100);
  const sma200Points = polylineFrom((point) => point.sma200);

  const first = chartValues[0]!;
  const last = chartValues[chartValues.length - 1]!;
  const change = ((last - first) / first) * 100;
  const firstDate = chartPoints[0]!.date;
  const midDate = chartPoints[Math.floor(chartPoints.length / 2)]!.date;
  const lastDate = chartPoints[chartPoints.length - 1]!.date;
  const periodLabel =
    timeframe === "daily" ? "daily periods" : timeframe === "weekly" ? "weekly periods" : "monthly periods";

  return (
    <div className="detail-chart" aria-label={`${title} line chart`}>
      <figure className="chart-quote">
        <blockquote>
          “Daily is supposed to predict 8-20 days, weekly 8-20 weeks and monthly
          8-20 months.”
        </blockquote>
        <figcaption>Druckenmiller timeframe guide</figcaption>
      </figure>
      <div className="detail-chart__header">
        <span>
          Last {chartPoints.length} {periodLabel} · <strong>{yAxisLabel}</strong>
          <small className="chart-range">
            {formatDate(firstDate)} to {formatDate(lastDate)}
          </small>
        </span>
        <strong className={change >= 0 ? "up" : "down"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </strong>
      </div>
      <div className="chart-controls" aria-label="Chart timeframe">
        {(["daily", "weekly", "monthly"] as const).map((option) => (
          <button
            className={timeframe === option ? "active" : ""}
            key={option}
            onClick={() => setTimeframe(option)}
            type="button"
          >
            {option[0]!.toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <title>{title}</title>
        <text
          className="chart-label"
          textAnchor="middle"
          transform={`translate(18 ${height / 2}) rotate(-90)`}
        >
          {yAxisLabel}
        </text>
        <text className="chart-tick" x={leftPad - 10} y={topPad + 4} textAnchor="end">
          {formatValue(max)}
        </text>
        <text
          className="chart-tick"
          x={leftPad - 10}
          y={height - bottomPad + 4}
          textAnchor="end"
        >
          {formatValue(min)}
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = topPad + ratio * (height - topPad - bottomPad);
          return (
            <line
              className="chart-grid"
              key={ratio}
              x1={leftPad}
              x2={width - rightPad}
              y1={y}
              y2={y}
            />
          );
        })}
        <line
          x1={leftPad}
          x2={leftPad}
          y1={topPad}
          y2={height - bottomPad}
          className="chart-axis"
        />
        <line
          x1={leftPad}
          x2={width - rightPad}
          y1={height - bottomPad}
          y2={height - bottomPad}
          className="chart-axis"
        />
        <polyline className="chart-line" points={polylinePoints} />
        {sma100Points && (
          <polyline className="chart-line sma100" points={sma100Points} />
        )}
        {sma200Points && (
          <polyline className="chart-line sma200" points={sma200Points} />
        )}
        <text
          className="chart-tick"
          x={leftPad}
          y={height - 14}
          textAnchor="start"
        >
          {formatDate(firstDate)}
        </text>
        <text
          className="chart-tick"
          x={width / 2}
          y={height - 14}
          textAnchor="middle"
        >
          {formatDate(midDate)}
        </text>
        <text
          className="chart-tick"
          x={width - rightPad}
          y={height - 14}
          textAnchor="end"
        >
          {formatDate(lastDate)}
        </text>
      </svg>
      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="price" /> Price</span>
        {sma100Points && <span><i className="sma100" /> 100-day SMA</span>}
        {sma200Points && <span><i className="sma200" /> 200-day SMA</span>}
      </div>
    </div>
  );
}
