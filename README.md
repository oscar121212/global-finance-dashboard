# Global Financial Health Dashboard

A comprehensive finance dashboard similar to your Manus finance app: **40+ metrics** scored **0–100** with explanations and technical analysis (RSI, SMA trend, narratives).

## Categories

- Global & US liquidity (M1, M2, M3 proxy, DXY proxy)
- Major indices (S&P 500, Nasdaq, Dow, Shenzhen, Singapore, Hang Seng, DAX)
- FX (EUR, AUD, NZD, GBP, USD/JPY)
- Bond yields (US, AU, NZ, Germany proxies)
- VIX & DXY
- Commodities (gold, silver, copper, oil, iron, lithium proxies)
- Major tech (AAPL, MSFT, NVDA, GOOGL, META, AMZN)
- Major miners (BHP, RIO, FCX, NEM, VALE, NST.AX)
- Crypto (BTC, ETH, SOL via CoinGecko)
- Policy rates (Fed, RBA, RBNZ, ECB, BoJ proxies via FRED)

## Run locally

1. Install [Node.js](https://nodejs.org/) (LTS).
2. Open terminal in this folder:
   ```bash
   npm install
   cp .env.example .env
   ```
3. Add free API keys (optional — works in **demo mode** without keys):
   - [Finnhub](https://finnhub.io/register) → `VITE_FINNHUB_API_KEY`
   - [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) → `VITE_FRED_API_KEY`
4. Start:
   ```bash
   npm run dev
   ```
5. Open http://localhost:5173

## Build for DreamHost

```bash
npm run build
```

Upload contents of `dist/` to e.g. `juniorminingspace.com/tools/finance/` and add `.htaccess` SPA fallback (see `deploy/.htaccess`).

**Note:** Live stock data uses Finnhub through the Vite dev proxy. On static DreamHost hosting, either:

- Use **demo mode** (built-in), or
- Add a small PHP/proxy on DreamHost, or
- Host on Netlify/Vercel with serverless functions

Crypto (CoinGecko) works from the browser without a key.

## Scoring

Each instrument gets 0–100 from:

- 20-day trend
- Price vs 20- and 50-day moving averages
- RSI(14)

VIX and rising bond yields invert the score (high fear / tight conditions = lower health).

## Project structure

```
src/
  data/instruments.ts   # all metrics + explanations
  lib/technicalAnalysis.ts
  lib/marketData.ts
  lib/demoData.ts
  lib/dashboard.ts
  components/
```

Not financial advice. For education and research.
