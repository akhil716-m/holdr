import { useEffect, useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react';
import { useHoldr } from '../state';
import MoodMark from '../components/MoodMark';
import { FlowBars, PriceChart } from '../components/charts';
import { Change, Mark, Segmented, SectionHead, Skeleton, SourceStamp } from '../components/ui';
import { PERIODS, fetchMacro, macroFormat } from '../lib/market';
import { MOOD_COPY } from '../lib/mood';
import { fmtNum, toneColor } from '../lib/format';
import { fmtDay, isoDaysAhead } from '../lib/dates';
import { CALENDAR, IDEAS, MACRO, SECTORS, sampleFlows } from '../data/sample';
import { genSeries } from '../lib/seed';

function Nifty() {
  const { nifty, period, setPeriod, mood, market } = useHoldr();
  const loading = market.niftyStatus === 'loading';
  return (
    <section className="mt-8 card p-4 sm:p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[13px] text-ink-2">NIFTY 50</p>
          {loading ? <Skeleton className="h-9 w-40 mt-2" /> : (
            <div className="mt-1 flex items-baseline gap-3">
              <p className="text-[32px] leading-none font-medium tracking-tight num">{fmtNum(nifty.price, 2)}</p>
              <Change value={nifty.dayChg} digits={2} className="text-[15px]" />
            </div>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-none"><Segmented label="Period" size="sm" value={period} onChange={setPeriod} options={PERIODS} /></div>
      </div>
      <div className="mt-4">
        {loading ? <Skeleton className="h-[220px] w-full" /> : <PriceChart series={nifty.series} times={nifty.times} period={period} format={v => fmtNum(v)} />}
      </div>
      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-3">
        <SourceStamp source={nifty.sample ? 'sample' : market.nifty?.src} at={market.updated} />
        <span className="flex items-center gap-2 text-[12px] text-ink-3">
          <MoodMark mood={mood} className="w-6 h-3" strokeWidth={1.4} />
          {MOOD_COPY[mood].name}: NIFTY {mood === 'bull' ? 'up 0.25% or more' : mood === 'bear' ? 'down 0.25% or more' : 'within 0.25%'} on the day
        </span>
      </div>
    </section>
  );
}

function Sectors() {
  const { portfolio } = useHoldr();
  const [open, setOpen] = useState(null);
  const exposure = {};
  portfolio.rows.forEach(r => { exposure[r.sector] = (exposure[r.sector] || 0) + r.weight; });
  const held = new Set(portfolio.rows.map(r => r.symbol));
  const maxAbs = Math.max(...SECTORS.map(s => Math.abs(s.chg)));

  return (
    <section className="card p-4 sm:p-5 min-w-0">
      <SectionHead title="Sectors, and where you sit" aside="3-month move, sample data" />
      <div className="mt-3 hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_56px_64px_16px] gap-3 px-2 text-[12px] text-ink-3">
        <span>Sector</span><span>Move</span><span className="text-right">3M</span><span className="text-right">You</span><span />
      </div>
      <ul className="mt-1">
        {SECTORS.map(s => {
          const you = exposure[s.name];
          const isOpen = open === s.name;
          return (
            <li key={s.name} className="border-b border-line last:border-0">
              <button onClick={() => setOpen(isOpen ? null : s.name)} aria-expanded={isOpen}
                className="row-hover w-full grid grid-cols-[minmax(0,1fr)_56px_64px_16px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_56px_64px_16px] items-center gap-3 px-2 py-2.5 rounded-[10px] text-left">
                <span className={`text-[14px] truncate ${you ? 'font-medium' : 'text-ink-2'}`}>{s.name}</span>
                <span className="hidden sm:block h-2 rounded-full" style={{ width: `${(Math.abs(s.chg) / maxAbs) * 100}%`, background: toneColor(s.chg), opacity: 0.75 }} aria-hidden="true" />
                <Change value={s.chg} className="text-[13px] text-right" />
                <span className="text-[13px] num text-right">{you ? `${Math.round(you)}%` : <span className="text-ink-3">none</span>}</span>
                <CaretDownIcon size={12} className={`text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-2 pb-3">
                  <p className="text-[13px] text-ink-2">{s.note}.</p>
                  <ul className="mt-2">
                    {s.stocks.map(([sym, name, chg]) => (
                      <li key={sym} className="flex items-center gap-3 py-1.5">
                        <span className="text-[13px] font-medium w-24 truncate">{sym}</span>
                        <span className="text-[13px] text-ink-3 flex-1 truncate">{name}</span>
                        {held.has(sym) && <span className="text-[11px] font-medium px-2 h-5 inline-flex items-center rounded-full bg-accent/15 text-accent">You hold</span>}
                        <Change value={chg} className="text-[13px] w-14 text-right" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Flows() {
  const { market } = useHoldr();
  const history = market.flows || sampleFlows(20);
  const d = history[history.length - 1];
  const story = d.fii.net < 0 && d.dii.net > 0
    ? 'Foreign money is leaving while domestic funds absorb the selling. That tug-of-war tends to cap both rallies and falls.'
    : d.fii.net > 0 && d.dii.net < 0
      ? 'Foreign investors are buying while domestic institutions book profits.'
      : 'Foreign and domestic institutions are moving the same way today.';
  const cr = v => (v >= 0 ? '+' : '−') + '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN');
  return (
    <section className="card p-4 sm:p-5 min-w-0">
      <SectionHead title="Who's buying, who's selling" aside={market.flows ? 'NSE, ₹ crore' : 'Sample data, ₹ crore'} />
      <p className="mt-3 text-[14px] leading-relaxed max-w-[60ch]">{story}</p>
      <div className="mt-4 flex gap-5 text-[12px] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--text-2)]" />Foreign (FII) net</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent" />Domestic (DII) net</span>
      </div>
      <div className="mt-3"><FlowBars history={history} /></div>
      <details className="mt-3 group">
        <summary className="cursor-pointer text-[13px] text-accent list-none">Daily figures</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-[13px] num">
            <thead className="text-[12px] text-ink-3">
              <tr><th className="text-left font-normal py-1.5">Date</th><th className="text-right font-normal">FII bought</th><th className="text-right font-normal">FII sold</th><th className="text-right font-normal">FII net</th><th className="text-right font-normal">DII net</th></tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5 text-ink-2">{fmtDay(r.date)}</td>
                  <td className="text-right">{Math.round(r.fii.buy).toLocaleString('en-IN')}</td>
                  <td className="text-right">{Math.round(r.fii.sell).toLocaleString('en-IN')}</td>
                  <td className="text-right" style={{ color: toneColor(r.fii.net) }}>{cr(r.fii.net)}</td>
                  <td className="text-right" style={{ color: toneColor(r.dii.net) }}>{cr(r.dii.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

const MACRO_PERIODS = ['1M', '3M', '1Y'];

function Macro() {
  const { market } = useHoldr();
  const [sel, setSel] = useState('gold');
  const [period, setPeriod] = useState('1M');
  const [cache, setCache] = useState({});
  const key = sel + period;
  const inr = market.inr || 83.4;

  useEffect(() => {
    if (cache[key] !== undefined) return;
    let cancelled = false;
    fetchMacro(sel, period, inr).then(r => { if (!cancelled) setCache(c => ({ ...c, [key]: r })); });
    return () => { cancelled = true; };
  }, [key, inr, cache, sel, period]);

  const tiles = MACRO.map(m => {
    const q = market.macro?.[m.id] || (m.id === sel ? cache[key] : null);
    return { ...m, value: q?.price ?? m.value, chg: q?.dayChg ?? m.chg, live: Boolean(q) };
  });
  const cur = tiles.find(t => t.id === sel);
  const fmt = macroFormat(sel);
  const loaded = cache[key];
  const series = loaded?.closes || (loaded === null ? genSeries('macro' + key, cur.value, 30, 1 - cur.chg / 40) : null);

  return (
    <section className="card p-4 sm:p-5 min-w-0">
      <SectionHead title="Currency and commodities" aside={cur.live ? 'Yahoo, delayed' : 'Sample data'} />
      <div role="tablist" aria-label="Instrument" className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map(t => (
          <button key={t.id} role="tab" aria-selected={t.id === sel} onClick={() => setSel(t.id)}
            className={`press text-left rounded-[10px] px-3 py-2.5 border ${t.id === sel ? 'bg-surface-2 border-line-strong' : 'border-line hover:bg-surface-2'}`}>
            <span className="flex items-center justify-between text-[12px] text-ink-2">{t.label}<Change value={t.chg} digits={2} className="text-[12px]" /></span>
            <span className="block mt-1 text-[16px] num">{macroFormat(t.id)(t.value)}<span className="text-[12px] text-ink-3">{t.unit}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-2">{cur.label}{loaded === null && ', sample trend'}</p>
        <Segmented label="Period" size="sm" value={period} onChange={setPeriod} options={MACRO_PERIODS} />
      </div>
      <div className="mt-3">{series ? <PriceChart series={series} times={loaded?.times} period={period} format={fmt} height={180} /> : <Skeleton className="h-[180px] w-full" />}</div>
      <p className="mt-4 text-[13px] text-ink-2 leading-relaxed max-w-[70ch]">{cur.summary}</p>
    </section>
  );
}

function Ideas() {
  const { portfolio } = useHoldr();
  const sectors = new Set(portfolio.rows.map(r => r.sector));
  return (
    <section className="card p-4 sm:p-5">
      <SectionHead title="Worth researching" aside="Not advice" />
      <ul className="mt-2">
        {IDEAS.filter(i => !portfolio.rows.some(r => r.symbol === i.symbol)).map(i => (
          <li key={i.symbol} className="flex gap-3 py-3 border-b border-line last:border-0">
            <Mark symbol={i.symbol} size={30} />
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{i.symbol} <span className="text-[12px] text-ink-3 font-normal">{i.sector}{sectors.has(i.sector) ? ', a sector you hold' : ''}</span></p>
              <p className="text-[13px] text-ink-2 leading-relaxed mt-0.5">{i.why}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Calendar() {
  return (
    <section className="card p-4 sm:p-5">
      <SectionHead title="Coming up" aside="Sample dates" />
      <ul className="mt-2">
        {CALENDAR.map(c => (
          <li key={c.label} className="flex gap-4 py-3 border-b border-line last:border-0">
            <span className="w-14 shrink-0 text-[13px] num text-ink-2">{fmtDay(isoDaysAhead(c.inDays))}</span>
            <div>
              <p className="text-[14px] font-medium">{c.label}</p>
              <p className="text-[13px] text-ink-2 mt-0.5">{c.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Market() {
  const { mood } = useHoldr();
  return (
    <div className="view-enter pt-10 md:pt-14">
      <h1 className="text-[28px] md:text-[32px] font-medium tracking-tight">Market</h1>
      <p className="text-[14px] text-ink-2 mt-1">{MOOD_COPY[mood].line} Here's what's moving it, seen through what you hold.</p>
      <Nifty />
      <div className="mt-4 grid lg:grid-cols-2 gap-4 items-start">
        <Sectors />
        <div className="flex flex-col gap-4 min-w-0"><Flows /></div>
      </div>
      <div className="mt-4"><Macro /></div>
      <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
        <Ideas />
        <Calendar />
      </div>
    </div>
  );
}
