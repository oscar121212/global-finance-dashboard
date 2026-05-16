export default async function handler(request, response) {
  const token = process.env.FRED_API_KEY;
  if (!token) {
    return response.status(500).json({ error: "FRED_API_KEY not set on Vercel" });
  }
  const { series_id, limit = "120" } = request.query;
  if (!series_id) {
    return response.status(400).json({ error: "Missing series_id" });
  }
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(series_id)}&api_key=${token}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  response.status(res.status).json(data);
}
