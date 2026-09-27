import { genSeries, resample, seedFromString, seedRandom } from './seed';
import { PERIOD_DAYS } from './market';
import { DAY } from './dates';
import { SAMPLE_NIFTY } from '../data/sample';
import { taxInfo } from './tax';

const SAMPLE_POINTS = { '1D': 48, '1W': 35, '1M': 22, '3M': 63, YTD: 90, '1Y': 120 };
const SAMPLE_SWING = { '1W': 0.05, '1M': 0.1, '3M': 0.18, YTD: 0.26, '1Y': 0.34 };

function periodDays(period) {
  if (period === 'YTD') {
    const jan1 = new Date(new Date().getFullYear(), 0, 1);
    return Math.max(1, Math.round((Date.now() - jan1) / DAY));
  }
  return PERIOD_DAYS[period];
}

function sampleTimes(period, n) {
  const end = Date.now();
  const start = period === '1D' ? end - 6 * 3600e3 : end - periodDays(period) * DAY;
  return Array.from({ length: n }, (_, i) => start + ((end - start) * i) / (n - 1));
}

/* where a sample series starts, so 1D matches the day change and longer periods drift plausibly */
function sampleStartRatio(key, dayChange, period, bias = 0, scale = 1) {
  if (period === '1D') return 1 / (1 + dayChange / 100);
  const r = seedRandom(seedFromString(key + period))();
  const swing = SAMPLE_SWING[period] * scale;
  return 1 + (r - 0.55) * swing + bias * swing;
}

export function sampleSeries(h, period) {
  const held = (Date.now() - new Date(h.buyDate)) / DAY;
  const r = seedRandom(seedFromString(h.id + period + 'anchor'))();
  /* if the period reaches back to (or near) the purchase, start close to the buy price so the
     chart and "gain since you bought" tell the same story */
  const ratio = period !== '1D' && periodDays(period) >= held * 0.8
    ? (h.avgPrice / h.ltp) * (1 + (r - 0.5) * 0.06)
    : sampleStartRatio(h.id, h.dayChange, period, h.ltp < h.avgPrice ? 0.6 : -0.3);
  return genSeries(h.id + period, h.ltp, SAMPLE_POINTS[period], ratio);
}

export function niftyForPeriod(live, period) {
  if (live) return { price: live.price, dayChg: live.dayChg, series: live.closes, times: live.times, sample: false };
  const n = SAMPLE_POINTS[period];
  return {
    price: SAMPLE_NIFTY.price,
    dayChg: SAMPLE_NIFTY.dayChg,
    series: genSeries('nifty' + period, SAMPLE_NIFTY.price, n, sampleStartRatio('nifty', SAMPLE_NIFTY.dayChg, period, -0.35, 0.45)),
    times: sampleTimes(period, n),
    sample: true,
  };
}

const ret = s => (s && s.length > 1 ? (s[s.length - 1] / s[0] - 1) * 100 : null);

/*
  Turns stored holdings plus whatever market data we have into everything the views show.
  Sample mode: fully synthetic but internally consistent (day change, series and totals agree).
  Mine mode: only real quotes. If a quote is missing we fall back to the price from your file
  and say so, and we never draw a history we don't have.
*/
export function buildPortfolio(holdings, { mode, quotes, period, nifty }) {
  const sample = mode === 'sample';
  /* your own holdings are only ever compared with the real index */
  const niftySeries = sample || !nifty.sample ? nifty.series : null;
  const niftyRet = ret(niftySeries);

  const rows = holdings.map(h => {
    const q = sample ? null : quotes[h.symbol];
    const price = q?.price ?? h.ltp;
    const dayChg = sample ? h.dayChange : q?.dayChg ?? null;
    const series = sample ? sampleSeries(h, period) : q?.closes ?? null;
    const value = h.qty * price;
    const invested = h.qty * h.avgPrice;
    const periodRet = ret(series);
    return {
      ...h,
      price,
      dayChg,
      series,
      times: sample ? sampleTimes(period, series.length) : q?.times ?? null,
      value,
      invested,
      pnl: value - invested,
      pnlPct: invested ? (value / invested - 1) * 100 : 0,
      periodRet,
      alpha: periodRet != null && niftyRet != null ? periodRet - niftyRet : null,
      dayMove: dayChg != null ? value - value / (1 + dayChg / 100) : null,
      priceSource: sample ? 'sample' : q ? q.src : 'file',
      tax: taxInfo(h, price),
    };
  });

  const value = rows.reduce((a, r) => a + r.value, 0);
  const invested = rows.reduce((a, r) => a + r.invested, 0);
  rows.forEach(r => { r.weight = value ? (r.value / value) * 100 : 0; });

  const withDay = rows.filter(r => r.dayMove != null);
  const dayMove = withDay.length ? withDay.reduce((a, r) => a + r.dayMove, 0) : null;

  /* portfolio history only when every holding has one */
  let series = null, times = null;
  if (rows.length && rows.every(r => r.series && r.series.length > 2)) {
    const L = Math.min(...rows.map(r => r.series.length));
    series = Array.from({ length: L }, (_, i) =>
      rows.reduce((sum, r) => sum + r.qty * r.series[r.series.length - L + i], 0));
    const t = rows[0].times;
    times = t ? t.slice(t.length - L) : null;
  }
  const benchmark = series && niftySeries ? resample(niftySeries, series.length) : null;

  return {
    rows,
    series,
    times,
    benchmark,
    totals: {
      value,
      invested,
      pnl: value - invested,
      pnlPct: invested ? (value / invested - 1) * 100 : 0,
      dayMove,
      dayPct: dayMove != null && value ? (dayMove / (value - dayMove)) * 100 : null,
      periodRet: ret(series),
      niftyRet,
      live: rows.filter(r => r.priceSource === 'upstox' || r.priceSource === 'yahoo').length,
    },
  };
}
