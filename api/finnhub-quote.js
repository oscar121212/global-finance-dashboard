export default async function handler(request, response) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return response.status(500).json({ error: "FINNHUB_API_KEY not set on Vercel" });
  }
  const { symbol } = request.query;
  if (!symbol) {
    return response.status(400).json({ error: "Missing symbol" });
  }
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  response.status(res.status).json(data);
}
