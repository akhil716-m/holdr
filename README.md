# Holdr

Know what you hold: why you bought each stock, whether that reason still holds,
how it's doing against NIFTY 50 and what it means for your tax. Built for Indian equities.

Version 2 is a Vite + React app. Version 1 (the single-file prototype) lives on the `version-1` branch.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Preview a market mood without waiting for one: add `?mood=bull`, `?mood=bear` or `?mood=flat`
to the URL, or use Market mood in the profile menu.

## Data

- **Sample portfolio**: illustrative and always labelled. Never mixed with live prices.
- **Your portfolio**: import a broker CSV/XLSX or add stocks one by one. Stored in this browser only.
- **Prices**, tried in order:
  1. Upstox through the local bridge (real time, see below)
  2. Yahoo Finance through `/api/yahoo` (a Vite dev proxy locally, a Vercel function in production)
  3. Public CORS proxies as a last resort
  When nothing answers, Holdr says so and uses the price from your file instead of inventing one.
- **Market mood** follows NIFTY 50's day change: up 0.25% or more is a bull day, down 0.25% or more a bear day.

## Upstox bridge (optional, for real-time prices)

1. Create an app at <https://account.upstox.com/developer/apps> with redirect URL `http://localhost:8765/callback`.
2. Copy `scripts/upstox_config.example.json` to `scripts/upstox_config.json` and fill in `api_key` and `api_secret` (gitignored).
3. Each day:

```sh
ruby scripts/upstox_proxy.rb
open http://localhost:8765/login
```

The bridge keeps your API secret and token on your machine and also serves NSE FII/DII data.
