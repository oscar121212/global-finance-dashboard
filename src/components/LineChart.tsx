type LineChartProps = {
  values?: number[];
  title: string;
};

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function LineChart({ values, title }: LineChartProps) {
  const chartValues = values?.filter((v) => Number.isFinite(v)) ?? [];

  if (chartValues.length < 2) {
    return (
      <div className="chart-empty">
        Not enough price history to draw a chart yet.
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const pad = 26;
  const min = Math.min(...chartValues);
  const max = Math.max(...chartValues);
  const range = max - min || 1;

  const points = chartValues
    .map((value, index) => {
      const x = pad + (index / (chartValues.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = chartValues[0]!;
  const last = chartValues[chartValues.length - 1]!;
  const change = ((last - first) / first) * 100;

  return (
    <div className="detail-chart" aria-label={`${title} line chart`}>
      <div className="detail-chart__header">
        <span>Recent history</span>
        <strong className={change >= 0 ? "up" : "down"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <title>{title}</title>
        <line x1={pad} x2={width - pad} y1={pad} y2={pad} className="chart-grid" />
        <line
          x1={pad}
          x2={width - pad}
          y1={height / 2}
          y2={height / 2}
          className="chart-grid"
        />
        <line
          x1={pad}
          x2={width - pad}
          y1={height - pad}
          y2={height - pad}
          className="chart-grid"
        />
        <polyline className="chart-line" points={points} />
      </svg>
      <div className="detail-chart__axis">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}
