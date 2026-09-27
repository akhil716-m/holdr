import { useState } from 'react';
import { useHoldr } from '../state';
import { navigate } from '../hooks/useRoute';
import { Bar, Button, Change, EmptyState, Panel, Spark, Tabs } from '../components/ui';
import { GROUP_LABEL } from '../lib/voice';
import { fmtCompactINR, fmtINR, fmtPct, fmtSignedINR, toneColor } from '../lib/format';

const GROUPS = [
  ['review', GROUP_LABEL.review, r => r.verdict === 'review' || r.thesisStatus === 'broken'],
  ['watch', GROUP_LABEL.watch, r => r.verdict === 'watch' || r.thesisStatus === 'shaky' || !r.thesisStatus],
  ['hold', GROUP_LABEL.hold, () => true],
];

function groupRows(rows) {
  const left = [...rows];
  return GROUPS.map(([key, label, test]) => {
    const items = left.filter(test);
    items.forEach(r => left.splice(left.indexOf(r), 1));
    return { key, label, items: items.sort((a, b) => b.value - a.value) };
  }).filter(g => g.items.length);
}

const HEALTH = [
  ['intact', 'Intact', 'var(--up)', '█'],
  ['shaky', 'Shaky', 'var(--warn)', '▓'],
  ['broken', 'Broken', 'var(--down)', '▒'],
  ['unset', 'Not written', 'var(--text-3)', '░'],
];

function Overview({ rows, total }) {
  const bySector = new Map();
  rows.forEach(r => bySector.set(r.sector, (bySector.get(r.sector) || 0) + r.value));
  const sectors = [...bySector.entries()].sort((a, b) => b[1] - a[1]);
  const top = sectors.slice(0, 5);
  const maxW = Math.max(...top.map(([, v]) => v));
  const top3 = [...rows].sort((a, b) => b.value - a.value).slice(0, 3).reduce((a, r) => a + r.weight, 0);
  const counts = { intact: 0, shaky: 0, broken: 0, unset: 0 };
  rows.forEach(r => { counts[r.thesisStatus || 'unset']++; });
  const width = 32;

  return (
    <div className="mt-8 grid md:grid-cols-2 gap-6">
      <Panel title="Where your money sits" aside={rows.length > 3 ? `top 3 = ${Math.round(top3)}%` : null}>
        <ul>
          {top.map(([name, v]) => (
            <li key={name} className="grid grid-cols-[minmax(0,1fr)_auto_40px] gap-3 items-center">
              <span className="text-ink-2 truncate">{name}</span>
              <Bar value={v} max={maxW} width={14} />
              <span className="text-right">{Math.round((v / total) * 100)}%</span>
            </li>
          ))}
          {sectors.length > 5 && <li className="text-ink-3">+{sectors.length - 5} more sectors</li>}
        </ul>
      </Panel>
      <Panel title="Are your reasons holding?" aside={`${rows.length} theses`}>
        <p aria-hidden="true" className="whitespace-pre overflow-hidden">
          {HEALTH.filter(([k]) => counts[k]).map(([k, , c, g]) => (
            <span key={k} style={{ color: c }}>{g.repeat(Math.max(1, Math.round((counts[k] / rows.length) * width)))}</span>
          ))}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-x-6">
          {HEALTH.filter(([k]) => counts[k]).map(([k, label, c, g]) => (
            <li key={k} className="flex justify-between"><span><span style={{ color: c }}>{g}</span> <span className="text-ink-2">{label}</span></span><span>{counts[k]}</span></li>
          ))}
        </ul>
        {counts.unset > 0 && <p className="mt-3 text-ink-3">Write down why you own each one. Holdr can only tell you a reason broke if it knows the reason.</p>}
      </Panel>
    </div>
  );
}

const COLS = 'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.4fr)_56px_112px_minmax(0,1fr)_minmax(0,1.1fr)_72px]';

function Row({ r }) {
  return (
    <li>
      <button onClick={() => navigate(`/holdings/${r.id}`)} className={`row w-full grid ${COLS} gap-3 items-center px-3 py-2 text-left`}>
        <span className="min-w-0">
          <span className="block truncate">{r.symbol}</span>
          <span className="block text-ink-3 truncate text-[12px]">{r.name}</span>
        </span>
        <span className="hidden md:block text-ink-2">{r.weight.toFixed(1)}%</span>
        <span className="hidden md:block text-ink-3"><Spark data={r.series} width={12} /></span>
        <span className="hidden md:block">
          <span className="block">{fmtINR(r.price, 2)}</span>
          <Change value={r.dayChg} digits={2} className="text-[12px]" />
        </span>
        <span className="text-right md:text-left">
          <span className="block md:hidden">{fmtCompactINR(r.value)}</span>
          <span className="block" style={{ color: toneColor(r.pnl) }}>
            <span className="hidden md:inline">{fmtSignedINR(r.pnl)} </span><span className="text-[12px]">{fmtPct(r.pnlPct)}</span>
          </span>
        </span>
        <span className="hidden md:block"><Change value={r.alpha} glyph={false} /></span>
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
    <div className="view-enter pt-8 md:pt-12">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label">{mode === 'sample' ? 'Sample portfolio' : 'Your portfolio'}</p>
          <h1 className="mt-2 text-[32px] md:text-[40px] leading-none tracking-[-0.045em] font-medium">Holdings</h1>
          <p className="mt-3 text-ink-2">{rows.length ? `${rows.length} stocks worth ${fmtINR(Math.round(total))}.` : 'Nothing here yet.'}</p>
        </div>
        {mode === 'mine'
          ? <Button solid onClick={openAdd}>+ Add holdings</Button>
          : <Button onClick={hasMine ? () => setMode('mine') : openAdd}>{hasMine ? 'Switch to yours' : 'Import yours'}</Button>}
      </div>

      {!rows.length ? (
        <Panel className="mt-8"><EmptyState title="Nothing here yet." body="Import your broker's holdings file or add stocks one by one." action={<Button solid onClick={openAdd}>Add holdings</Button>} /></Panel>
      ) : (
        <>
          <Overview rows={rows} total={total} />
          <Panel title="Positions" aside={<Tabs label="Sort by" value={sort} onChange={setSort} options={SORTS} />} className="mt-8 !px-0 !pb-2">
            <div className={`hidden md:grid ${COLS} gap-3 px-3 pb-2 label border-b border-line`}>
              <span>Stock</span><span>Weight</span><span>{period}</span><span>Price, today</span><span>Since you bought</span><span>vs NIFTY</span>
            </div>
            {groups.map(g => (
              <div key={g.key}>
                {g.label && <p className="px-3 pt-4 pb-1 label !text-ink-2">{g.label} <span className="text-ink-3">({g.items.length})</span></p>}
                <ul>{g.items.map(r => <Row key={r.id} r={r} />)}</ul>
              </div>
            ))}
          </Panel>
          {mode === 'mine' && portfolio.totals.live < rows.length && (
            <p className="mt-3 text-ink-3">{rows.length - portfolio.totals.live} of {rows.length} prices are from your file, not live. They update when the Upstox bridge or Yahoo answers.</p>
          )}
        </>
      )}
    </div>
  );
}
