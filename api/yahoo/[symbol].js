/*
  Same-origin Yahoo Finance chart proxy for the deployed app (Vercel serverless function).
  Only chart lookups with known ranges and intervals are allowed, so it can't be used as an open proxy.

  Yahoo rate-limits anonymous server requests, so this does the same session handshake a
  browser does: pick up a cookie from fc.yahoo.com, exchange it for a crumb, then send both.
  The pair is cached for the life of the function instance.
*/
const RANGES = new Set(['1d', '5d', '1mo', '3mo', 'ytd', '1y', '2y']);
const INTERVALS = new Set(['5m', '30m', '1d', '1wk']);
const SYMBOL = /^[\^A-Za-z0-9.=&-]{1,24}$/;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

let session = null; // { cookie, crumb, at }

async function getSession(force = false) {
  if (!force && session && Date.now() - session.at < 30 * 60 * 1000) return session;
  const first = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const cookie = (first.headers.getSetCookie?.() || [first.headers.get('set-cookie') || ''])
    .map(c => c.split(';')[0]).filter(Boolean).join('; ');
  if (!cookie) return null;
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
  const crumb = crumbRes.ok ? (await crumbRes.text()).trim() : '';
  if (!crumb || crumb.includes('<') || crumb.length > 40) return null;
  session = { cookie, crumb, at: Date.now() };
  return session;
}

async function chart(symbol, range, interval, s) {
  const params = `range=${range}&interval=${interval}${s ? `&crumb=${encodeURIComponent(s.crumb)}` : ''}`;
  return fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`, {
    headers: { 'User-Agent': UA, ...(s ? { Cookie: s.cookie } : {}) },
  });
}

export default async function handler(req, res) {
  const { symbol, range = '1mo', interval = '1d' } = req.query;
  if (!SYMBOL.test(symbol || '') || !RANGES.has(range) || !INTERVALS.has(interval)) {
    res.status(400).json({ error: 'Unsupported request' });
    return;
  }
  try {
    let s = await getSession().catch(() => null);
    let upstream = await chart(symbol, range, interval, s);
    if (upstream.status === 401 || upstream.status === 429) {
      s = await getSession(true).catch(() => null);
      if (s) upstream = await chart(symbol, range, interval, s);
    }
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', upstream.ok ? 's-maxage=60, stale-while-revalidate=300' : 'no-store');
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: 'Upstream unavailable' });
  }
}
