import { useEffect, useState } from 'react';
import { ArrowLeftIcon, TrashIcon } from '@phosphor-icons/react';
import { useHoldr } from '../state';
import { href, navigate } from '../hooks/useRoute';
import { PriceChart } from '../components/charts';
import { Button, Change, EmptyState, Mark, Segmented, SectionHead, SourceStamp } from '../components/ui';
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
    <div className="card p-4 sm:p-5">
      <SectionHead title="Why you own it" aside={mode === 'sample' ? 'Edits last this session' : 'Saved on this device'} />
      <label htmlFor="thesis" className="sr-only">Your reason for owning {r.symbol}</label>
      <textarea
        id="thesis"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        rows={3}
        placeholder={`What has to be true for ${r.symbol} to be worth holding?`}
        className="mt-3 w-full resize-none rounded-[10px] bg-surface-2 border border-line p-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-3 outline-none focus:border-accent"
      />
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] text-ink-2 mb-2">Is it still true?</p>
          <Segmented label="Thesis status" size="sm" value={r.thesisStatus} onChange={v => updateHolding(r.id, { thesisStatus: v })} options={STATUS} />
        </div>
        <div>
          <p className="text-[12px] text-ink-2 mb-2">Your call</p>
          <Segmented label="Your call" size="sm" value={r.verdict} onChange={v => updateHolding(r.id, { verdict: v })} options={VERDICT} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-line last:border-0">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="text-[14px] num text-right">{children}</dd>
    </div>
  );
}

function Tax({ r }) {
  const { updateHolding, mode } = useHoldr();
  const t = r.tax;
  const rate = t.isLT ? LTCG_RATE : STCG_RATE;
  return (
    <div className="card p-4 sm:p-5">
      <SectionHead title="Tax" aside={t.isLT ? 'Long-term' : `Long-term on ${fmtDay(t.ltDate)}`} />
      <div className="mt-4 flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0" aria-hidden="true">
          <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--surface-3)" strokeWidth="4" />
            <circle cx="28" cy="28" r="24" fill="none" stroke={t.isLT ? 'var(--up)' : 'var(--accent)'} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${Math.min(1, t.heldDays / 366) * 150.8} 150.8`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] num">{t.isLT ? '1y+' : `${t.daysToLT}d`}</span>
        </div>
        <p className="text-[13px] text-ink-2 leading-relaxed">
          {t.isLT
            ? `Held ${Math.floor(t.heldDays / 30)} months. Gains are taxed at 12.5% after your yearly ₹1.25L exemption.`
            : t.gain > 0
              ? `Selling now taxes the gain at 20%. Waiting ${t.daysToLT} days drops it to 12.5%, about ${fmtINR(Math.round(t.waitSaving))} less.`
              : `Held ${t.heldDays} days. A short-term loss can offset any gain, so it's worth more booked before ${fmtDay(t.ltDate)}.`}
        </p>
      </div>
      <dl className="mt-3">
        <Stat label="Gain if sold today"><span style={{ color: toneColor(t.gain) }}>{fmtSignedINR(t.gain)}</span></Stat>
        <Stat label="Tax rate on it">{t.gain > 0 ? `${Math.round(rate * 1000) / 10}%` : <span className="text-ink-2">None on a loss</span>}</Stat>
        <Stat label="Bought on">
          {mode === 'mine' ? (
            <>
              <label htmlFor="buy-date" className="sr-only">Buy date</label>
              <input id="buy-date" type="date" value={r.buyDate} max={isoDaysAgo(0)}
                onChange={e => e.target.value && updateHolding(r.id, { buyDate: e.target.value, buyDateKnown: true })}
                className="bg-transparent text-right text-ink outline-none focus:text-accent" />
            </>
          ) : fmtDay(r.buyDate, { year: 'numeric' })}
        </Stat>
      </dl>
      {mode === 'mine' && r.buyDateKnown === false && <p className="mt-2 text-[12px] text-warn">Set the real buy date. Imported files don't include it, so tax timing is a guess.</p>}
    </div>
  );
}

export default function Stock({ id }) {
  const { portfolio, period, setPeriod, mode, market, removeHolding } = useHoldr();
  const [confirm, setConfirm] = useState(false);
  const r = portfolio.rows.find(x => x.id === id);

  if (!r) {
    return (
      <div className="view-enter pt-10">
        <a href={href('/holdings')} className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"><ArrowLeftIcon size={14} /> Holdings</a>
        <EmptyState title="This stock isn't in this portfolio" body="It may belong to the other portfolio or a different profile." />
      </div>
    );
  }

  const upcoming = (r.events || []).filter(e => daysUntil(e.date) >= 0).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="view-enter pt-6 md:pt-10">
      <a href={href('/holdings')} className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"><ArrowLeftIcon size={14} /> Holdings</a>

      <header className="mt-6 flex items-start gap-4">
        <Mark symbol={r.symbol} size={44} />
        <div className="min-w-0">
          <h1 className="text-[24px] md:text-[28px] font-medium tracking-tight leading-tight">{r.symbol}</h1>
          <p className="text-[13px] text-ink-2">{r.name}, {r.sector}</p>
        </div>
      </header>

      <div className="mt-6 flex items-baseline gap-3 flex-wrap">
        <p className="text-[36px] md:text-[40px] leading-none font-medium tracking-tight num">{fmtINR(r.price, 2)}</p>
        <Change value={r.dayChg} digits={2} className="text-[15px]" />
        <span className="text-[13px] text-ink-3">today</span>
      </div>

      <div className="mt-6 card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-ink-2">
            {r.periodRet != null ? <><Change value={r.periodRet} /> over {period}{r.alpha != null && <>, <Change value={r.alpha} /> vs NIFTY 50</>}</> : 'Price history unavailable'}
          </p>
          <div className="overflow-x-auto scrollbar-none"><Segmented label="Period" size="sm" value={period} onChange={setPeriod} options={PERIODS} /></div>
        </div>
        <div className="mt-4">
          {r.series ? (
            <PriceChart series={r.series} times={r.times} period={period} reference={{ value: r.avgPrice, label: 'Your avg' }} />
          ) : (
            <EmptyState title="No price history yet" body="This fills in when live prices can be reached." />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-line"><SourceStamp source={r.priceSource} at={market.updated} /></div>
      </div>

      <div className="mt-4 grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Thesis r={r} />
          {upcoming.length > 0 && (
            <div className="card p-4 sm:p-5">
              <SectionHead title="Coming up" />
              <ul className="mt-2">
                {upcoming.map(e => (
                  <li key={e.label} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-line last:border-0">
                    <span className="text-[14px]">{e.label}</span>
                    <span className="text-[13px] text-ink-2 num">{fmtDay(e.date)}, in {daysUntil(e.date)}d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="card p-4 sm:p-5">
            <SectionHead title="Your position" aside={`${r.weight.toFixed(1)}% of portfolio`} />
            <dl className="mt-2">
              <Stat label="Shares">{r.qty}</Stat>
              <Stat label="Average price">{fmtINR(r.avgPrice, 2)}</Stat>
              <Stat label="Invested">{fmtINR(Math.round(r.invested))}</Stat>
              <Stat label="Worth now">{fmtINR(Math.round(r.value))}</Stat>
              <Stat label="Gain"><span style={{ color: toneColor(r.pnl) }}>{fmtSignedINR(r.pnl)}, {fmtPct(r.pnlPct)}</span></Stat>
            </dl>
          </div>
          <Tax r={r} />
          {mode === 'mine' && (
            confirm
              ? <div className="flex gap-2"><Button variant="danger" onClick={() => { removeHolding(r.id); navigate('/holdings'); }}>Remove {r.symbol}</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Keep it</Button></div>
              : <Button variant="ghost" className="self-start" onClick={() => setConfirm(true)}><TrashIcon size={14} /> Remove from portfolio</Button>
          )}
        </div>
      </div>
    </div>
  );
}
