import { useEffect, useState } from 'react';
import { useHoldr } from '../state';
import { href, navigate } from '../hooks/useRoute';
import { GlyphChart, longDate } from '../components/charts';
import { Bar, Button, Change, EmptyState, Panel, SourceStamp, Tabs } from '../components/ui';
import { PERIODS } from '../lib/market';
import { fmtINR, fmtPct, fmtSignedINR, toneColor } from '../lib/format';
import { daysUntil, fmtDay, isoDaysAgo } from '../lib/dates';
import { LTCG_RATE, STCG_RATE } from '../lib/tax';

const STATUS = [['intact', 'Intact'], ['shaky', 'Shaky'], ['broken', 'Broken']];
const VERDICT = [['hold', 'Hold'], ['watch', 'Watch'], ['review', 'Review']];

function Thesis({ r }) {
  const { updateHolding, mode } = useHoldr();
  const [text, setText] = useState(r.thesis || '');
  useEffect(() => setText(r.thesis || ''), [r.id, r.thesis]);
  const save = () => text !== (r.thesis || '') && updateHolding(r.id, { thesis: text.trim() });

  return (
    <Panel title="Why you own it" aside={mode === 'sample' ? 'edits last this session' : 'saved on this device'}>
      <label htmlFor="thesis" className="sr-only">Your reason for owning {r.symbol}</label>
      <div className="flex gap-2">
        <span className="text-ink-3" aria-hidden="true">&gt;</span>
        <textarea id="thesis" value={text} onChange={e => setText(e.target.value)} onBlur={save} rows={3}
          placeholder={`What has to be true for ${r.symbol} to be worth holding?`}
          className="flex-1 resize-none bg-transparent text-ink placeholder:text-ink-3 outline-none leading-relaxed" />
      </div>
      <div className="rule my-4" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="label mb-1.5">Is it still true?</p>
          <Tabs label="Thesis status" value={r.thesisStatus} onChange={v => updateHolding(r.id, { thesisStatus: v })} options={STATUS} />
        </div>
        <div>
          <p className="label mb-1.5">Your call</p>
          <Tabs label="Your call" value={r.verdict} onChange={v => updateHolding(r.id, { verdict: v })} options={VERDICT} />
        </div>
      </div>
    </Panel>
  );
}

function Line({ label, children }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-ink-2 shrink-0">{label}</dt>
      <span aria-hidden="true" className="flex-1 min-w-0 overflow-hidden text-line-2 whitespace-nowrap">{'.'.repeat(80)}</span>
      <dd className="text-right shrink-0">{children}</dd>
    </div>
  );
}

function Tax({ r }) {
  const { updateHolding, mode } = useHoldr();
  const t = r.tax;
  const rate = t.isLT ? LTCG_RATE : STCG_RATE;
  return (
    <Panel title="Tax" aside={t.isLT ? 'long-term' : `long-term on ${fmtDay(t.ltDate)}`}>
      <p className="whitespace-pre overflow-hidden" aria-hidden="true">
        <Bar value={Math.min(t.heldDays, 366)} max={366} width={24} color={t.isLT ? 'var(--up)' : 'var(--text)'} />
        <span className="text-ink-3"> {t.isLT ? '12m+' : `${t.daysToLT}d left`}</span>
      </p>
      <p className="mt-3 text-ink-2">
        {t.isLT
          ? `Held ${Math.floor(t.heldDays / 30)} months. Gains are taxed at 12.5% after your yearly ₹1.25L exemption.`
          : t.gain > 0
            ? `Selling now taxes the gain at 20%. Waiting ${t.daysToLT} days drops it to 12.5%, about ${fmtINR(Math.round(t.waitSaving))} less.`
            : `A short-term loss offsets any gain, so it's worth more booked before ${fmtDay(t.ltDate)}.`}
      </p>
      <dl className="mt-4 flex flex-col gap-1">
        <Line label="Gain if sold today"><span style={{ color: toneColor(t.gain) }}>{fmtSignedINR(t.gain)}</span></Line>
        <Line label="Tax rate">{t.gain > 0 ? `${Math.round(rate * 1000) / 10}%` : 'none on a loss'}</Line>
        <Line label="Bought on">
          {mode === 'mine' ? (
            <>
              <label htmlFor="buy-date" className="sr-only">Buy date</label>
              <input id="buy-date" type="date" value={r.buyDate} max={isoDaysAgo(0)}
                onChange={e => e.target.value && updateHolding(r.id, { buyDate: e.target.value, buyDateKnown: true })}
                className="bg-transparent text-right text-ink outline-none [color-scheme:dark]" />
            </>
          ) : fmtDay(r.buyDate, { year: 'numeric' })}
        </Line>
      </dl>
      {mode === 'mine' && r.buyDateKnown === false && <p className="mt-3 text-warn">~ Set the real buy date. Imported files don&rsquo;t include it, so tax timing is a guess.</p>}
    </Panel>
  );
}

export default function Stock({ id }) {
  const { portfolio, period, setPeriod, mode, market, removeHolding } = useHoldr();
  const [confirm, setConfirm] = useState(false);
  const r = portfolio.rows.find(x => x.id === id);

  if (!r) {
    return (
      <div className="view-enter pt-8">
        <a href={href('/holdings')} className="link text-ink-2">&larr; holdings</a>
        <div className="mt-6"><EmptyState title="This stock isn't in this portfolio." body="It may belong to the other portfolio or a different profile." /></div>
      </div>
    );
  }

  const upcoming = (r.events || []).filter(e => daysUntil(e.date) >= 0).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="view-enter pt-6 md:pt-10">
      <a href={href('/holdings')} className="link text-ink-2">&larr; holdings</a>

      <header className="mt-6">
        <p className="label">{r.name} / {r.sector}</p>
        <div className="mt-2 flex items-baseline gap-x-5 gap-y-2 flex-wrap">
          <h1 className="text-[32px] md:text-[44px] leading-none tracking-[-0.045em] font-medium">{r.symbol}</h1>
          <p className="text-[24px] md:text-[32px] leading-none tracking-[-0.04em]">{fmtINR(r.price, 2)}</p>
          <Change value={r.dayChg} digits={2} />
        </div>
      </header>

      <Panel title={`${period} price`} aside={<SourceStamp source={r.priceSource} at={market.updated} />} className="mt-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-ink-2">
            {r.periodRet != null ? <><Change value={r.periodRet} /> over {period}{r.alpha != null && <>, <Change value={r.alpha} glyph={false} /> vs NIFTY</>}</> : 'Price history unavailable.'}
          </p>
          <Tabs label="Period" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
        <div className="mt-4">
          {r.series ? (
            <GlyphChart
              period={period}
              times={r.times}
              lines={[{ data: r.series, color: r.periodRet >= 0 ? 'var(--up)' : 'var(--down)' }]}
              reference={{ value: r.avgPrice, label: 'your avg' }}
              formatY={v => fmtINR(v)}
              tooltip={i => (
                <>
                  {r.times && <p className="label">{longDate(period, r.times[i])}</p>}
                  <p>{fmtINR(r.series[i], 2)}</p>
                </>
              )}
            />
          ) : <EmptyState title="No price history yet." body="This fills in when live prices can be reached." />}
        </div>
      </Panel>

      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <Thesis r={r} />
          {upcoming.length > 0 && (
            <Panel title="Coming up">
              <dl className="flex flex-col gap-1">
                {upcoming.map(e => <Line key={e.label} label={e.label}>{fmtDay(e.date)}, in {daysUntil(e.date)}d</Line>)}
              </dl>
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-6 min-w-0">
          <Panel title="Your position" aside={`${r.weight.toFixed(1)}% of portfolio`}>
            <dl className="flex flex-col gap-1">
              <Line label="Shares">{r.qty}</Line>
              <Line label="Average price">{fmtINR(r.avgPrice, 2)}</Line>
              <Line label="Put in">{fmtINR(Math.round(r.invested))}</Line>
              <Line label="Worth now">{fmtINR(Math.round(r.value))}</Line>
              <Line label="Gain"><span style={{ color: toneColor(r.pnl) }}>{fmtSignedINR(r.pnl)} {fmtPct(r.pnlPct)}</span></Line>
            </dl>
          </Panel>
          <Tax r={r} />
          {mode === 'mine' && (
            confirm
              ? <div className="flex gap-2"><Button className="!text-down" onClick={() => { removeHolding(r.id); navigate('/holdings'); }}>Remove {r.symbol}</Button><Button onClick={() => setConfirm(false)}>Keep it</Button></div>
              : <Button className="self-start" onClick={() => setConfirm(true)}>Remove from portfolio</Button>
          )}
        </div>
      </div>
    </div>
  );
}
