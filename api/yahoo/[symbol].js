/*
  Same-origin Yahoo Finance chart proxy for the deployed app (Vercel serverless function).
  Only chart lookups with known ranges and intervals are allowed, so it can't be used as an open proxy.
*/
const RANGES = new Set(['1d', '5d', '1mo', '3mo', 'ytd', '1y', '2y']);
const INTERVALS = new Set(['5m', '30m', '1d', '1wk']);
const SYMBOL = /^[\^A-Za-z0-9.=&-]{1,24}$/;

export default async function handler(req, res) {
  const { symbol, range = '1mo', interval = '1d' } = req.query;
  if (!SYMBOL.test(symbol || '') || !RANGES.has(range) || !INTERVALS.has(interval)) {
    res.status(400).json({ error: 'Unsupported request' });
    return;
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: 'Upstream unavailable' });
  }
}
