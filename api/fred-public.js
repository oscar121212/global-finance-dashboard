export default async function handler(request, response) {
  const { series_id } = request.query;

  if (!series_id) {
    return response.status(400).json({ error: "Missing series_id" });
  }

  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(
    series_id,
  )}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GlobalFinanceDashboard/1.0; +https://vercel.app)",
      },
    });

    if (!res.ok) {
      return response.status(res.status).json({ error: "FRED CSV request failed" });
    }

    const csv = await res.text();
    const observations = csv
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const [date, value] = line.split(",");
        return { date, value };
      })
      .filter((row) => row.date && row.value && row.value !== ".");

    response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return response.status(200).json({ observations });
  } catch (error) {
    return response.status(502).json({
      error: "Failed to fetch public FRED CSV",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
