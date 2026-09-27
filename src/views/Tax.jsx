import { useHoldr } from '../state';
import { href } from '../hooks/useRoute';
import { Button, EmptyState, Mark, SectionHead } from '../components/ui';
import { fmtINR, fmtSignedINR } from '../lib/format';
import { financialYear, fmtDay, startOfToday } from '../lib/dates';
import { LTCG_EXEMPTION, LTCG_RATE, STCG_RATE } from '../lib/tax';

function buildMoves(rows, { ltGain, stGain, ltTaxable, exemptionLeft, fy }) {
  const moves = [];
  const losses = rows.filter(r => r.tax.gain < 0);
  const stLosses = losses.filter(r => !r.tax.isLT);
  const stLossSum = stLosses.reduce((a, r) => a + r.tax.gain, 0);

  rows.filter(r => !r.tax.isLT && r.tax.gain > 0).forEach(r => {
    moves.push({ key: `wait-${r.id}`, save: r.tax.waitSaving, stocks: [r],
      title: `Hold ${r.symbol} ${r.tax.daysToLT} more days`,
      body: `Its ${fmtINR(Math.round(r.tax.gain))} gain turns long-term on ${fmtDay(r.tax.ltDate)}, and the rate drops from 20% to 12.5%.` });
  });
  if (stLossSum < 0 && stGain > 0) {
    moves.push({ key: 'pair', save: Math.min(-stLossSum, stGain) * STCG_RATE, stocks: stLosses,
      title: `Book ${stLosses.map(r => r.symbol).join(' and ')} losses against short-term gains`,
      body: 'Booked losses cancel taxable gains rupee for rupee. There is no wash-sale rule in India, so you can buy back the same shares right away.' });
  }
  if (ltTaxable > 0) {
    moves.push({ key: 'split', save: Math.min(ltTaxable, LTCG_EXEMPTION) * LTCG_RATE, stocks: rows.filter(r => r.tax.isLT && r.tax.gain > 0),
      title: 'Split long-term selling across two financial years',
      body: `${fmtINR(Math.round(ltTaxable))} of long-term gains is above this year's exemption. Selling part after 1 April uses next year's ₹1.25L too.` });
  }
  if (ltGain > 0 && ltTaxable === 0) {
    moves.push({ key: 'free', save: null, stocks: rows.filter(r => r.tax.isLT && r.tax.gain > 0),
      title: 'Your long-term gains are tax-free right now',
      body: `They fit inside the ₹1.25L yearly exemption, and ${fmtINR(Math.round(exemptionLeft))} of room is left. It resets on ${fmtDay(fy.end)} and doesn't carry forward.` });
  }
  stLosses.filter(r => r.tax.daysToLT <= 120).forEach(r => {
    moves.push({ key: `loss-${r.id}`, save: null, stocks: [r],
      title: `${r.symbol}'s loss is worth more before ${fmtDay(r.tax.ltDate)}`,
      body: 'Short-term losses offset any gain. Once it turns long-term it can only offset long-term gains.' });
  });
  return moves.sort((a, b) => (b.save || 0) - (a.save || 0));
}

function Timeline({ rows }) {
  const pending = rows.filter(r => !r.tax.isLT).sort((a, b) => a.tax.daysToLT - b.tax.daysToLT);
  const done = rows.filter(r => r.tax.isLT);
  if (!pending.length) return <p className="mt-3 text-[13px] text-ink-2">Every holding is already long-term.</p>;
  const start = startOfToday().getTime();
  const end = Math.max(...pending.map(r => r.tax.ltDate.getTime())) + 20 * 864e5;
  const pos = t => ((t - start) / (end - start)) * 100;
  const fyEnd = financialYear().end.getTime();

  return (
    <>
      {/* desktop: a real time axis */}
      <div className="hidden md:block mt-8 relative h-[132px]">
        <div className="absolute left-0 right-0 top-[44px] h-px bg-[var(--line-strong)]" />
        <div className="absolute left-0 top-[40px] w-2 h-2 rounded-full bg-ink" />
        <span className="absolute left-0 top-[56px] text-[12px] text-ink-3">Today</span>
        {fyEnd < end && (
          <div className="absolute top-[34px]" style={{ left: `${pos(fyEnd)}%` }}>
            <div className="w-px h-5 bg-[var(--text-3)] mx-auto" />
            <span className="absolute top-[-22px] left-1/2 -translate-x-1/2 text-[12px] text-ink-3 whitespace-nowrap">FY ends</span>
          </div>
        )}
        {pending.map((r, i) => {
          const left = pos(r.tax.ltDate.getTime());
          const above = i % 2 === 1;
          return (
            <div key={r.id} className="absolute" style={{ left: `${left}%`, top: 0, transform: 'translateX(-50%)' }}>
              <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[var(--accent)] bg-bg" />
              <div className={`absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap ${above ? 'top-0' : 'top-[60px]'}`}>
                <a href={href(`/holdings/${r.id}`)} className="text-[13px] font-medium hover:text-accent">{r.symbol}</a>
                <p className="text-[12px] text-ink-3 num">{fmtDay(r.tax.ltDate)}</p>
                {!above && r.tax.waitSaving > 0 && <p className="text-[12px] num text-up">saves {fmtINR(Math.round(r.tax.waitSaving))}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {/* phones: the same dates as a list */}
      <ul className="md:hidden mt-3">
        {pending.map(r => (
          <li key={r.id} className="flex items-baseline justify-between py-2.5 border-b border-line last:border-0">
            <a href={href(`/holdings/${r.id}`)} className="text-[14px] font-medium">{r.symbol}</a>
            <span className="text-[13px] num text-ink-2">{fmtDay(r.tax.ltDate)}, {r.tax.daysToLT}d{r.tax.waitSaving > 0 && <span className="text-up">, saves {fmtINR(Math.round(r.tax.waitSaving))}</span>}</span>
          </li>
        ))}
      </ul>
      {done.length > 0 && <p className="mt-4 text-[12px] text-ink-3">Already long-term: {done.map(r => r.symbol).join(', ')}</p>}
    </>
  );
}

export default function Tax() {
  const { portfolio, openAdd } = useHoldr();
  const rows = portfolio.rows;
  const fy = financialYear();

  if (!rows.length) {
    return (
      <div className="view-enter pt-10 md:pt-14">
        <h1 className="text-[28px] md:text-[32px] font-medium tracking-tight">Tax</h1>
        <div className="mt-8 card p-6 sm:p-8"><EmptyState title="No holdings to plan for" body="Once you add holdings, Holdr shows when each gain turns long-term and which moves lower your tax." action={<Button onClick={openAdd}>Add holdings</Button>} /></div>
      </div>
    );
  }

  const ltGain = rows.filter(r => r.tax.isLT && r.tax.gain > 0).reduce((a, r) => a + r.tax.gain, 0);
  const stGain = rows.filter(r => !r.tax.isLT && r.tax.gain > 0).reduce((a, r) => a + r.tax.gain, 0);
  const losses = rows.filter(r => r.tax.gain < 0).reduce((a, r) => a + r.tax.gain, 0);
  const ltTaxable = Math.max(0, ltGain - LTCG_EXEMPTION);
  const totalTax = ltTaxable * LTCG_RATE + stGain * STCG_RATE;
  const exemptionLeft = LTCG_EXEMPTION - Math.min(ltGain, LTCG_EXEMPTION);
  const moves = buildMoves(rows, { ltGain, stGain, ltTaxable, exemptionLeft, fy });
  /* moves can overlap (pairing losses and waiting both cut the same short-term tax), so cap at what's owed */
  const saving = Math.min(moves.reduce((a, m) => a + (m.save || 0), 0), totalTax);
  const comp = ltGain + stGain + Math.abs(losses) || 1;

  return (
    <div className="view-enter pt-10 md:pt-14">
      <h1 className="text-[28px] md:text-[32px] font-medium tracking-tight">Tax</h1>
      <p className="text-[14px] text-ink-2 mt-1">{fy.label}, listed equity. Estimates to plan with, not tax advice.</p>

      <section className="mt-8 grid md:grid-cols-[1.3fr_1fr] gap-4">
        <div className="card p-5 sm:p-6">
          <p className="text-[13px] text-ink-2">{saving > 0 ? 'The moves below could cut your tax by up to' : 'Tax if you sold everything today'}</p>
          <p className="mt-2 text-[40px] leading-none font-medium tracking-tight num" style={{ color: saving > 0 ? 'var(--up)' : undefined }}>
            {fmtINR(Math.round(saving > 0 ? saving : totalTax))}
          </p>
          <p className="mt-3 text-[13px] text-ink-2 leading-relaxed">
            Selling everything today would cost about <span className="num text-ink">{fmtINR(Math.round(totalTax))}</span> in tax on <span className="num text-ink">{fmtSignedINR(ltGain + stGain + losses)}</span> of net gains.
          </p>
          <div className="mt-5 flex h-2 gap-1 rounded-full overflow-hidden" aria-hidden="true">
            <span style={{ flex: ltGain / comp, background: 'var(--up)' }} />
            <span style={{ flex: stGain / comp, background: 'var(--accent)' }} />
            <span style={{ flex: Math.abs(losses) / comp, background: 'var(--down)', opacity: 0.8 }} />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
            <div><dt className="flex items-center gap-1.5 text-ink-3"><span className="w-2 h-2 rounded-full bg-up" />Long-term</dt><dd className="num text-[14px] mt-0.5">{fmtINR(Math.round(ltGain))}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-ink-3"><span className="w-2 h-2 rounded-full bg-accent" />Short-term</dt><dd className="num text-[14px] mt-0.5">{fmtINR(Math.round(stGain))}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-ink-3"><span className="w-2 h-2 rounded-full bg-down" />Losses</dt><dd className="num text-[14px] mt-0.5">{fmtINR(Math.round(losses))}</dd></div>
          </dl>
        </div>
        <div className="card p-5 sm:p-6 flex flex-col">
          <p className="text-[13px] text-ink-2">Still tax-free this year</p>
          <p className="mt-2 text-[32px] leading-none font-medium tracking-tight num">{fmtINR(Math.round(exemptionLeft))}</p>
          <p className="mt-3 text-[13px] text-ink-2 leading-relaxed">Long-term profit you can book before {fmtDay(fy.end, { year: 'numeric' })} without paying tax. Unused room doesn't carry forward.</p>
          <div className="mt-auto pt-5">
            <div className="h-2 rounded-full bg-surface-3 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-up" style={{ width: `${(1 - exemptionLeft / LTCG_EXEMPTION) * 100}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-ink-3 num">{Math.round((1 - exemptionLeft / LTCG_EXEMPTION) * 100)}% of ₹1.25L used</p>
          </div>
        </div>
      </section>

      <section className="mt-4 card p-4 sm:p-5">
        <SectionHead title="Moves worth considering" aside="Largest saving first" />
        {moves.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-2">No tax moves stand out right now.</p>
        ) : (
          <ul className="mt-2">
            {moves.map(m => (
              <li key={m.key} className="flex gap-4 py-4 border-b border-line last:border-0">
                <div className="flex -space-x-2 shrink-0 w-[52px]">{m.stocks.slice(0, 2).map(s => <Mark key={s.id} symbol={s.symbol} size={30} />)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-snug">{m.title}</p>
                  <p className="text-[13px] text-ink-2 leading-relaxed mt-1 max-w-[70ch]">{m.body}</p>
                </div>
                {m.save ? <p className="text-[14px] num text-up whitespace-nowrap">saves {fmtINR(Math.round(m.save))}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 card p-4 sm:p-5">
        <SectionHead title="When gains turn long-term" aside="After 12 months the rate drops to 12.5%" />
        <Timeline rows={rows} />
      </section>
    </div>
  );
}
