# Holdr — know what you hold

A personal portfolio tracker prototype. Single-file React app (`index.html`),
no build step — open it in a browser.

## Data sources

The app tries sources in this order and falls back gracefully:

1. **Upstox** (official, real-time, free with your account) — via the local bridge below
2. **Yahoo Finance** (free, unofficial, slightly delayed) — via public CORS proxies
3. **Demo data** — seeded, always works offline

The header chip shows which source is active: `Live · Upstox`, `Live · Yahoo`, or `Demo data`.
Macro tiles (USD/INR, gold, silver, crude, VIX) always come from Yahoo.

## Upstox setup (once)

1. Create an app at <https://account.upstox.com/developer/apps>
   - Redirect URL: `http://localhost:8765/callback`
2. Copy `scripts/upstox_config.example.json` → `scripts/upstox_config.json`
   and fill in your `api_key` / `api_secret` (gitignored — never committed).

## Daily use

```sh
ruby scripts/upstox_proxy.rb        # start the local bridge
open http://localhost:8765/login    # authenticate once a day (Upstox tokens expire daily)
open index.html                     # then use the app
```

The bridge keeps your API secret and token on your machine only and adds the
CORS headers a browser needs. If it isn't running, the app silently uses Yahoo.
