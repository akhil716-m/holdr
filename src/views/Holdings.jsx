import { useState } from 'react';
import { CaretRightIcon, PlusIcon } from '@phosphor-icons/react';
import { useHoldr } from '../state';
import { navigate } from '../hooks/useRoute';
import { Button, Change, EmptyState, Mark, Segmented, SectionHead } from '../components/ui';
import { Sparkline } from '../components/charts';
import { fmtCompactINR, fmtINR, fmtPct, fmtSignedINR, toneColor } from '../lib/format';

const GROUPS = [
  ['review', 'Needs review', r => r.verdict === 'review' || r.thesisStatus === 'broken'],
  ['watch', 'Watching', r => r.verdict === 'watch' || r.thesisStatus === 'shaky' || !r.thesisStatus],
  ['hold', 'On track', () => true],
];

function groupRows(rows) {
  const left = [...rows];
  return GROUPS.map(([key, label, test]) => {
    const items = left.filter(test);
    items.forEach(r => left.splice(left.indexOf(r), 1));
    return { key, label, items: items.sort((a, b) => b.value - a.value) };
  }).filter(g => g.items.length);
}

function Overview({ rows, total }) {
  const bySector = new Map();
  rows.forEach(r => bySector.set(r.sector, (bySector.get(r.sector) || 0) + r.value));
  const sectors = [...bySector.entries()].sort((a, b) => b[1] - a[1]);
  const top = sectors.slice(0, 5);
  const restW = sectors.slice(5).reduce((a, [, v]) => a + v, 0);
  const maxW = Math.max(...top.map(([, v]) => v));
  const top3 = [...rows].sort((a, b) => b.value - a.value).slice(0, 3).reduce((a, r) => a + r.weight, 0);

  const counts = { intact: 0, shaky: 0, broken: 0, unset: 0 };
  rows.forEach(r => { counts[r.thesisStatus || 'unset']++; });
  const health = [['intact', 'Intact', 'var(--up)'], ['shaky', 'Shaky', 'var(--warn)'], ['broken', 'Broken', 'var(--down)'], ['unset', 'Not written', 'var(--surface-3)']]
    .filter(([k]) => counts[k]);

  return (
    <section className="mt-8 grid md:grid-cols-2 gap-4">
      <div className="card p-4 sm:p-5">
        <SectionHead title="Where your money sits" aside={rows.length > 3 ? `Top 3 holdings: ${Math.round(top3)}%` : null} />
        <ul className="mt-4 flex flex-col gap-2.5">
          {top.map(([name, v]) => (
            <li key={name} className="grid grid-cols-[minmax(0,140px)_1fr_44px] items-center gap-3">
              <span className="text-[13px] text-ink-2 truncate">{name}</span>
              <span className="h-2 rounded-full bg-[var(--text-2)]" style={{ width: `${(v / maxW) * 100}%`, opacity: 0.7 }} aria-hidden="true" />
              <span className="text-[13px] num text-right">{Math.round((v / total) * 100)}%</span>
            </li>
          ))}
          {restW > 0 && <li className="text-[12px] text-ink-3">{sectors.length - 5} more sectors, {Math.round((restW / total) * 100)}%</li>}
        </ul>
      </div>
      <div className="card p-4 sm:p-5">
        <SectionHead title="Are your reasons holding?" aside={`${rows.length} theses`} />
        <div className="mt-5 flex h-2.5 gap-1 rounded-full overflow-hidden" aria-hidden="true">
          {health.map(([k, , c]) => <span key={k} style={{ flex: counts[k], background: c }} />)}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4">
          {health.map(([k, label, c]) => (
            <li key={k} className="flex items-center gap-2 text-[13px]">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} aria-hidden="true" />
              <span className="text-ink-2">{label}</span>
              <span className="num ml-auto">{counts[k]}</span>
            </li>
          ))}
        </ul>
        {counts.unset > 0 && <p className="mt-4 text-[12px] text-ink-3">Write down why you own each stock. Holdr uses it to tell you when something changes.</p>}
      </div>
    </section>
  );
}

function Row({ r }) {
  return (
    <li>
      <button onClick={() => navigate(`/holdings/${r.id}`)}
        className="row-hover group w-full grid items-center gap-3 px-3 sm:px-4 py-3 text-left grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.5fr)_56px_80px_minmax(0,1fr)_minmax(0,1fr)_16px] lg:grid-cols-[minmax(0,1.5fr)_56px_80px_minmax(0,1fr)_minmax(0,1fr)_80px_16px]">
        <span className="flex items-center gap-3 min-w-0">
          <Mark symbol={r.symbol} />
          <span className="min-w-0">
            <span className="block text-[14px] font-medium truncate">{r.symbol}</span>
            <span className="block text-[12px] text-ink-3 truncate">{r.name}</span>
          </span>
        </span>
        <span className="hidden md:block text-[13px] num text-ink-2">{r.weight.toFixed(1)}%</span>
        <span className="hidden md:block"><Sparkline data={r.series} /></span>
        <span className="hidden md:block">
          <span className="block text-[14px] num">{fmtINR(r.price, 2)}</span>
          <Change value={r.dayChg} digits={2} className="text-[12px]" />
        </span>
        <span className="text-right md:text-left">
          <span className="block text-[14px] num md:hidden">{fmtCompactINR(r.value)}</span>
          <span className="block text-[14px] num max-md:text-[12px]" style={{ color: toneColor(r.pnl) }}>
            <span className="hidden md:inline">{fmtSignedINR(r.pnl)} </span>
            <span className="md:text-[12px]">{fmtPct(r.pnlPct)}</span>
          </span>
          <span className="hidden md:block text-[12px] text-ink-3 num">on {fmtCompactINR(r.invested)}</span>
        </span>
        <span className="hidden lg:block"><Change value={r.alpha} className="text-[13px]" /></span>
        <CaretRightIcon size={14} className="hidden md:block text-ink-3 group-hover:text-ink" />
      </button>
    </li>
  );
}

const SORTS = [['attention', 'Attention'], ['value', 'Value'], ['day', 'Today'], ['return', 'Return']];

export default function Holdings() {
  const { portfolio, mode, hasMine, openAdd, setMode, period } = useHoldr();
  const [sort, setSort] = useState('attention');
  const rows = portfolio.rows;
  const total = portfolio.totals.value;

  const sorted = sort === 'value' ? [...rows].sort((a, b) => b.value - a.value)
    : sort === 'day' ? [...rows].sort((a, b) => (b.dayChg ?? -1e9) - (a.dayChg ?? -1e9))
      : sort === 'return' ? [...rows].sort((a, b) => b.pnlPct - a.pnlPct) : null;
  const groups = sorted ? [{ key: 'all', label: null, items: sorted }] : groupRows(rows);

  return (
    <div className="view-enter pt-10 md:pt-14">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-medium tracking-tight">Holdings</h1>
          <p className="text-[14px] text-ink-2 mt-1">
            {rows.length ? <>{rows.length} stocks worth <span className="num">{fmtINR(Math.round(total))}</span>{mode === 'sample' && ', sample portfolio'}</> : 'Nothing here yet'}
          </p>
        </div>
        {mode === 'mine'
          ? <Button onClick={openAdd}><PlusIcon size={14} /> Add holdings</Button>
          : <Button variant="secondary" onClick={hasMine ? () => setMode('mine') : openAdd}>{hasMine ? 'Switch to yours' : 'Import yours'}</Button>}
      </div>

      {!rows.length ? (
        <div className="mt-8 card p-6 sm:p-8">
          <EmptyState title="No holdings yet" body="Import your broker's holdings file or add stocks one by one." action={<Button onClick={openAdd}>Add holdings</Button>} />
        </div>
      ) : (
        <>
          <Overview rows={rows} total={total} />
          <div className="mt-10 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-medium">Positions</h2>
            <Segmented label="Sort by" size="sm" value={sort} onChange={setSort} options={SORTS} />
          </div>
          <div className="mt-3 card overflow-hidden">
            <div className="hidden md:grid gap-3 px-4 py-2.5 border-b border-line text-[12px] text-ink-3 md:grid-cols-[minmax(0,1.5fr)_56px_80px_minmax(0,1fr)_minmax(0,1fr)_16px] lg:grid-cols-[minmax(0,1.5fr)_56px_80px_minmax(0,1fr)_minmax(0,1fr)_80px_16px]">
              <span>Stock</span><span>Weight</span><span>{period}</span><span>Price, today</span><span>Gain since you bought</span><span className="hidden lg:block">vs NIFTY</span><span />
            </div>
            {groups.map(g => (
              <div key={g.key}>
                {g.label && (
                  <div className="px-3 sm:px-4 pt-4 pb-1 flex items-baseline gap-2">
                    <h3 className="text-[13px] font-medium">{g.label}</h3>
                    <span className="text-[12px] text-ink-3 num">{g.items.length}</span>
                  </div>
                )}
                <ul>{g.items.map(r => <Row key={r.id} r={r} />)}</ul>
              </div>
            ))}
          </div>
          {mode === 'mine' && portfolio.totals.live < rows.length && (
            <p className="mt-3 text-[12px] text-ink-3">
              {rows.length - portfolio.totals.live} of {rows.length} prices are from your file, not live. They update when the Upstox bridge or Yahoo can be reached.
            </p>
          )}
        </>
      )}
    </div>
  );
}
