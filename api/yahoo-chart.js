export default async function handler(request, response) {
  const { symbol, range = "6mo", interval = "1d" } = request.query;

  if (!symbol) {
    return response.status(400).json({ error: "Missing symbol" });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GlobalFinanceDashboard/1.0; +https://vercel.app)",
      },
    });
    const data = await res.json();

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    return response.status(res.status).json(data);
  } catch (error) {
    return response.status(502).json({
      error: "Failed to fetch Yahoo chart data",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
