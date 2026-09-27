import { readJSON, write } from './storage';

/*
  Price sources, tried in order:
  1. Upstox via the local bridge (scripts/upstox_proxy.rb): official, real time
  2. Yahoo Finance via the bridge, then our own /api/yahoo proxy, then public CORS proxies: free, slightly delayed
  Every fetcher resolves to null on failure. Callers decide what to show instead;
  nothing here invents numbers.
*/

export const PERIODS = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];
export const PERIOD_DAYS = { '1D': 1, '1W': 7, '1M': 30, '3M': 91, YTD: null, '1Y': 365 };

const YAHOO_PERIOD = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  YTD: { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
};

const BRIDGE = 'http://localhost:8765';
const PROXIES = [
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

async function getJSON(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* limit concurrency so proxies and Yahoo don't rate-limit a burst */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }));
  return out;
}

/* resolves with the first non-null result, or null once every attempt has failed */
function firstValid(promises) {
  return new Promise(resolve => {
    let pending = promises.length;
    if (!pending) resolve(null);
    promises.forEach(p => p.then(v => {
      if (v) resolve(v);
      else if (--pending === 0) resolve(null);
    }));
  });
}

async function yahooRaw(sym, range, interval) {
  const bridged = await getJSON(`${BRIDGE}/yahoo?symbol=${encodeURIComponent(sym)}&range=${range}&interval=${interval}`, 4000);
  if (bridged?.chart) return bridged;
  /* our own same-origin proxy: Vite in dev, a Vercel function in production */
  const own = await getJSON(`/api/yahoo/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, 8000);
  if (own?.chart?.result?.[0]) return own;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
  /* last resort: race the public proxies; some return their own error JSON with status 200, so require a chart payload */
  return firstValid(PROXIES.map(wrap => getJSON(wrap(url), 9000).then(j => (j?.chart?.result?.[0] ? j : null))));
}

/* 90-second session cache: reloads and tab switches don't re-hit Yahoo, which rate-limits aggressively */
const CACHE_MS = 90000;
function cached(key) {
  try {
    const hit = JSON.parse(sessionStorage.getItem('holdr-q-' + key));
    return hit && Date.now() - hit.at < CACHE_MS ? hit : null;
  } catch { return null; }
}
function remember(key, value) {
  try { sessionStorage.setItem('holdr-q-' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export async function fetchYahoo(sym, period) {
  const hit = cached(sym + period);
  if (hit) return hit;
  const q = await fetchYahooFresh(sym, period);
  if (q) remember(sym + period, q);
  return q;
}

async function fetchYahooFresh(sym, period) {
  const { range, interval } = YAHOO_PERIOD[period] || YAHOO_PERIOD['1M'];
  const j = await yahooRaw(sym, range, interval);
  const r = j?.chart?.result?.[0];
  if (!r) return null;
  const rawCloses = r.indicators?.quote?.[0]?.close || [];
  const rawTimes = r.timestamp || [];
  const closes = [], times = [];
  rawCloses.forEach((c, i) => {
    if (c != null) { closes.push(c); times.push((rawTimes[i] || 0) * 1000); }
  });
  if (closes.length < 2) return null;
  const price = r.meta?.regularMarketPrice || closes[closes.length - 1];
  const prev = /m$/.test(interval)
    ? (r.meta?.chartPreviousClose || r.meta?.previousClose || closes[0])
    : closes[closes.length - 2];
  return { price, closes, times, dayChg: ((price - prev) / prev) * 100, src: 'yahoo', at: Date.now() };
}

/* ---------------------------- Upstox (bridge) ---------------------------- */
const UPSTOX_KEYS = {
  TCS: 'NSE_EQ|INE467B01029',
  HDFCBANK: 'NSE_EQ|INE040A01034',
  INFY: 'NSE_EQ|INE009A01021',
  ETERNAL: 'NSE_EQ|INE758T01015',
  PAYTM: 'NSE_EQ|INE982J01020',
  RELIANCE: 'NSE_EQ|INE002A01018',
  ICICIBANK: 'NSE_EQ|INE090A01021',
  ITC: 'NSE_EQ|INE154A01025',
  WIPRO: 'NSE_EQ|INE075A01022',
  SUNPHARMA: 'NSE_EQ|INE044A01036',
  NIFTY: 'NSE_INDEX|Nifty 50',
};
const UPSTOX_PERIOD = {
  '1D': { kind: 'intraday', interval: '30minute' },
  '1W': { kind: 'hist', interval: '30minute', days: 7 },
  '1M': { kind: 'hist', interval: 'day', days: 32 },
  '3M': { kind: 'hist', interval: 'day', days: 93 },
  YTD: { kind: 'hist', interval: 'day', days: 366 },
  '1Y': { kind: 'hist', interval: 'day', days: 366 },
};
const dstr = d => d.toISOString().slice(0, 10);

async function upstox(path) {
  const j = await getJSON(BRIDGE + path, 5000);
  return j?.status === 'success' ? j.data : null;
}

export async function fetchUpstox(symKey, period) {
  const k = UPSTOX_KEYS[symKey];
  if (!k) return null;
  const cfg = UPSTOX_PERIOD[period] || UPSTOX_PERIOD['1M'];
  const enc = encodeURIComponent(k);
  const today = new Date();
  const data = cfg.kind === 'intraday'
    ? await upstox(`/api/v2/historical-candle/intraday/${enc}/${cfg.interval}`)
    : await upstox(`/api/v2/historical-candle/${enc}/${cfg.interval}/${dstr(today)}/${dstr(new Date(today - cfg.days * 864e5))}`);
  const candles = data?.candles;
  if (!candles || candles.length < 2) return null;
  const ordered = [...candles].reverse(); // Upstox returns newest first
  const closes = ordered.map(c => c[4]);
  const times = ordered.map(c => new Date(c[0]).getTime());
  const price = closes[closes.length - 1];
  let prev = closes[closes.length - 2];
  if (cfg.interval !== 'day') {
    const d = await upstox(`/api/v2/historical-candle/${enc}/day/${dstr(today)}/${dstr(new Date(today - 6 * 864e5))}`);
    const dc = d?.candles;
    if (dc?.length) {
      const newestIsToday = new Date(dc[0][0]).toDateString() === today.toDateString();
      prev = newestIsToday && dc.length > 1 ? dc[1][4] : dc[0][4];
    } else prev = closes[0];
  }
  return { price, closes, times, dayChg: ((price - prev) / prev) * 100, src: 'upstox', at: Date.now() };
}

export const yahooSymbol = sym => sym.replace(/[^A-Z0-9&-]/g, '').replace('&', '%26') + '.NS';

export async function fetchQuote(symbol, period) {
  return (await fetchUpstox(symbol, period)) || fetchYahoo(yahooSymbol(symbol), period);
}

export async function fetchNifty(period) {
  return (await fetchUpstox('NIFTY', period)) || fetchYahoo('^NSEI', period);
}

/* ------------------------------ Macro ------------------------------ */
export const MACRO_SYMBOLS = { usdinr: 'INR=X', gold: 'GC=F', silver: 'SI=F', crude: 'BZ=F', vix: '^INDIAVIX' };
const OZ_GRAMS = 31.1035;

export function macroConverter(id, inr) {
  if (id === 'gold') return v => (v * inr / OZ_GRAMS) * 10;
  if (id === 'silver') return v => (v * inr / OZ_GRAMS) * 1000;
  return v => v;
}

export const macroFormat = id => v =>
  id === 'usdinr' ? '₹' + v.toFixed(2)
    : id === 'gold' || id === 'silver' ? '₹' + Math.round(v).toLocaleString('en-IN')
      : id === 'crude' ? '$' + v.toFixed(1)
        : v.toFixed(1);

export async function fetchMacro(id, period, inr) {
  const q = await fetchYahoo(MACRO_SYMBOLS[id], period);
  if (!q) return null;
  const conv = macroConverter(id, inr);
  return { ...q, price: conv(q.price), closes: q.closes.map(conv) };
}

/* ---------------------- FII / DII (NSE via bridge) ---------------------- */
/* accumulates a rolling history in storage so the chart becomes real over time */
export async function fetchFlows() {
  const rows = await getJSON(`${BRIDGE}/nse/fiidii`, 6000);
  if (!Array.isArray(rows)) return null;
  const fii = rows.find(r => /FII|FPI/i.test(r.category));
  const dii = rows.find(r => /DII/i.test(r.category));
  if (!fii || !dii) return null;
  const n = v => Math.round(parseFloat(v)) || 0;
  const hist = readJSON('holdr-flows', {});
  hist[fii.date] = {
    fii: { buy: n(fii.buyValue), sell: n(fii.sellValue), net: n(fii.netValue) },
    dii: { buy: n(dii.buyValue), sell: n(dii.sellValue), net: n(dii.netValue) },
  };
  const keep = Object.entries(hist).sort((a, b) => new Date(a[0]) - new Date(b[0])).slice(-20);
  write('holdr-flows', Object.fromEntries(keep));
  const history = keep.map(([date, v]) => ({ date: new Date(date), ...v }));
  return history.length >= 2 ? history : null;
}
