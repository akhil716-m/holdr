import { useEffect, useState } from 'react';
import { useHoldr } from '../state';
import { useCreature } from '../hooks/useCreature';
import { FlowColumns, GlyphChart, longDate } from '../components/charts';
import { Bar, Change, Loading, Panel, SourceStamp, Tabs } from '../components/ui';
import { PERIODS, fetchMacro, macroFormat } from '../lib/market';
import { MOOD_COPY } from '../lib/mood';
import { fmtNum, toneColor } from '../lib/format';
import { fmtDay, isoDaysAhead } from '../lib/dates';
import { CALENDAR, IDEAS, MACRO, SECTORS, sampleFlows } from '../data/sample';
import { genSeries } from '../lib/seed';

const ANIMAL_RULE = { bull: 'up 0.25% or more on the day', bear: 'down 0.25% or more on the day', crab: 'within 0.25% on the day' };

function Nifty() {
  const { nifty, period, setPeriod, market } = useHoldr();
  const { kind } = useCreature();
  const loading = market.niftyStatus === 'loading';
  return (
    <Panel title="NIFTY 50" aside={<SourceStamp source={nifty.sample ? 'sample' : market.nifty?.src} at={market.updated} />} className="mt-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {loading ? <Loading text="Fetching NIFTY 50" /> : (
          <div className="flex items-baseline gap-4">
            <p className="text-[32px] leading-none tracking-[-0.05em] font-medium">{fmtNum(nifty.price, 2)}</p>
            <Change value={nifty.dayChg} digits={2} />
          </div>
        )}
        <Tabs label="Period" value={period} onChange={setPeriod} options={PERIODS} />
      </div>
      {!loading && (
        <div className="mt-4">
          <GlyphChart period={period} times={nifty.times} lines={[{ data: nifty.series, color: nifty.series[nifty.series.length - 1] >= nifty.series[0] ? 'var(--up)' : 'var(--down)' }]}
            formatY={v => fmtNum(v)}
            tooltip={i => (<>{nifty.times && <p className="label">{longDate(period, nifty.times[i])}</p>}<p>{fmtNum(nifty.series[i], 2)}</p></>)} />
        </div>
      )}
      {kind !== 'quiet' && <p className="mt-3 label">Today is a <span className="text-mood">{kind}</span> day: NIFTY {ANIMAL_RULE[kind]}</p>}
    </Panel>
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
    <Panel title="Sectors, and where you sit" aside="3 months, sample" className="!px-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_56px_44px] gap-3 px-3 pb-1 label border-b border-line">
        <span>Sector</span><span className="hidden sm:inline">Move</span><span className="text-right sm:col-auto col-start-3">3M</span><span className="text-right">You</span>
      </div>
      <ul>
        {SECTORS.map(s => {
          const you = exposure[s.name];
          const isOpen = open === s.name;
          return (
            <li key={s.name}>
              <button onClick={() => setOpen(isOpen ? null : s.name)} aria-expanded={isOpen}
                className="row w-full grid grid-cols-[minmax(0,1fr)_auto_56px_44px] gap-3 items-center px-3 py-1 text-left">
                <span className={`truncate ${you ? 'text-ink' : 'text-ink-2'}`}>{isOpen ? '▾' : '▸'} {s.name}</span>
                <span className="hidden sm:inline"><Bar value={Math.abs(s.chg)} max={maxAbs} width={10} color={toneColor(s.chg)} /></span>
                <Change value={s.chg} glyph={false} className="text-right col-start-3" />
                <span className="text-right">{you ? `${Math.round(you)}%` : <span className="text-ink-3">0</span>}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pl-7">
                  <p className="text-ink-3">{s.note}.</p>
                  <ul className="mt-1">
                    {s.stocks.map(([sym, name, chg]) => (
                      <li key={sym} className="grid grid-cols-[100px_1fr_auto] gap-3">
                        <span>{sym}{held.has(sym) && <span className="text-mood"> *</span>}</span>
                        <span className="text-ink-3 truncate">{name}</span>
                        <Change value={chg} glyph={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {held.size > 0 && <p className="px-3 pt-2 label"><span className="text-mood">*</span> you hold it</p>}
    </Panel>
  );
}

function Flows() {
  const { market } = useHoldr();
  const history = market.flows || sampleFlows(20);
  const d = history[history.length - 1];
  const story = d.fii.net < 0 && d.dii.net > 0 ? 'Foreign money is leaving and domestic funds are catching it. That tug-of-war tends to cap both rallies and falls.'
    : d.fii.net > 0 && d.dii.net < 0 ? 'Foreign money is coming in while domestic funds take profits.'
      : 'Foreign and domestic money are moving the same way today.';
  const cr = v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v)).toLocaleString('en-IN');
  return (
    <Panel title="Who's buying, who's selling" aside={market.flows ? 'NSE, ₹ crore' : 'sample, ₹ crore'}>
      <p>{story}</p>
      <p className="mt-3 label"><span className="text-ink">█</span> foreign (FII)   <span className="text-ink">▒</span> domestic (DII)   above the line = buying</p>
      <div className="mt-3"><FlowColumns history={history} /></div>
      <details className="mt-3">
        <summary className="cursor-pointer link text-ink-2 list-none">daily figures</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[380px]">
            <thead><tr className="label"><th className="text-left font-normal">Date</th><th className="text-right font-normal">FII bought</th><th className="text-right font-normal">FII sold</th><th className="text-right font-normal">FII net</th><th className="text-right font-normal">DII net</th></tr></thead>
            <tbody>
              {[...history].reverse().slice(0, 10).map((r, i) => (
                <tr key={i}>
                  <td className="text-ink-2">{fmtDay(r.date)}</td>
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
    </Panel>
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
    <Panel title="Currency and commodities" aside={cur.live ? 'Yahoo, delayed' : 'sample'} className="mt-6">
      <div role="tablist" aria-label="Instrument" className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
        {tiles.map(t => (
          <button key={t.id} role="tab" aria-selected={t.id === sel} onClick={() => setSel(t.id)}
            className={`text-left px-3 py-2 ${t.id === sel ? 'bg-ink text-bg' : 'bg-bg hover:bg-hover'}`}>
            <span className="flex justify-between text-[11px] uppercase tracking-[0.06em]"><span className={t.id === sel ? '' : 'text-ink-3'}>{t.label}</span>
              <span style={t.id === sel ? undefined : { color: toneColor(t.chg) }}>{t.chg >= 0 ? '+' : '−'}{Math.abs(t.chg).toFixed(2)}%</span></span>
            <span className="block mt-1 text-[16px]">{macroFormat(t.id)(t.value)}<span className="text-[11px] opacity-60">{t.unit}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="label">{cur.label}{loaded === null ? ', sample trend' : ''}</p>
        <Tabs label="Period" value={period} onChange={setPeriod} options={MACRO_PERIODS} />
      </div>
      <div className="mt-3">
        {series ? <GlyphChart period={period} times={loaded?.times} height={180} lines={[{ data: series, color: series[series.length - 1] >= series[0] ? 'var(--up)' : 'var(--down)' }]} formatY={fmt}
          tooltip={i => (<>{loaded?.times && <p className="label">{longDate(period, loaded.times[i])}</p>}<p>{fmt(series[i])}</p></>)} /> : <Loading text="Fetching" />}
      </div>
      <p className="mt-3 text-ink-2 max-w-[80ch]">{cur.summary}</p>
    </Panel>
  );
}

function Ideas() {
  const { portfolio } = useHoldr();
  return (
    <Panel title="Worth researching" aside="not advice">
      <ul className="flex flex-col gap-3">
        {IDEAS.filter(i => !portfolio.rows.some(r => r.symbol === i.symbol)).map(i => (
          <li key={i.symbol}>
            <p>{i.symbol} <span className="label">{i.sector}</span></p>
            <p className="text-ink-3 mt-0.5">{i.why}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Calendar() {
  return (
    <Panel title="Coming up" aside="sample dates">
      <ul className="flex flex-col gap-2">
        {CALENDAR.map(c => (
          <li key={c.label} className="grid grid-cols-[64px_1fr] gap-3">
            <span className="text-ink-2">{fmtDay(isoDaysAhead(c.inDays))}</span>
            <span><span className="block">{c.label}</span><span className="block text-ink-3">{c.note}</span></span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function Market() {
  const { mood } = useHoldr();
  return (
    <div className="view-enter pt-8 md:pt-12">
      <p className="label">{MOOD_COPY[mood].line} What&rsquo;s moving it, seen through what you hold.</p>
      <h1 className="mt-2 text-[32px] md:text-[40px] leading-none tracking-[-0.045em] font-medium">Market</h1>
      <Nifty />
      <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
        <Sectors />
        <Flows />
      </div>
      <Macro />
      <div className="mt-6 grid md:grid-cols-2 gap-6 items-start">
        <Ideas />
        <Calendar />
      </div>
    </div>
  );
}
