import { useHoldr } from '../state';
import { href } from '../hooks/useRoute';
import { Bar, Button, EmptyState, Panel } from '../components/ui';
import { fmtINR, fmtSignedINR } from '../lib/format';
import { financialYear, fmtDay } from '../lib/dates';
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

/* each pending holding as a track from today to its long-term date: ├────●······┤ */
function Timeline({ rows }) {
  const pending = rows.filter(r => !r.tax.isLT).sort((a, b) => a.tax.daysToLT - b.tax.daysToLT);
  const done = rows.filter(r => r.tax.isLT);
  if (!pending.length) return <p className="text-ink-2">Every holding is already long-term.</p>;
  const W = 26;
  return (
    <>
      <ul className="flex flex-col gap-1">
        {pending.map(r => {
          const done = Math.round((Math.min(r.tax.heldDays, 366) / 366) * W);
          return (
            <li key={r.id} className="grid grid-cols-[92px_1fr] sm:grid-cols-[120px_auto_1fr] gap-x-4 items-baseline">
              <a href={href(`/holdings/${r.id}`)} className="link truncate">{r.symbol}</a>
              <span aria-hidden="true" className="hidden sm:inline whitespace-pre">
                <span className="text-ink-3">├</span><span className="text-ink">{'━'.repeat(done)}</span><span className="text-mood">●</span><span className="text-line-2">{'┄'.repeat(Math.max(0, W - done))}</span><span className="text-ink-3">┤</span>
              </span>
              <span className="text-ink-2">
                {fmtDay(r.tax.ltDate)}, {r.tax.daysToLT}d{r.tax.waitSaving > 0 && <span className="text-up">, saves {fmtINR(Math.round(r.tax.waitSaving))}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 label">├ bought   ━ held   ● today   ┤ 12 months</p>
      {done.length > 0 && <p className="mt-2 text-ink-3">Already long-term: {done.map(r => r.symbol).join(', ')}</p>}
    </>
  );
}

export default function Tax() {
  const { portfolio, openAdd } = useHoldr();
  const rows = portfolio.rows;
  const fy = financialYear();

  if (!rows.length) {
    return (
      <div className="view-enter pt-8 md:pt-12">
        <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.045em] font-medium">Tax</h1>
        <Panel className="mt-8"><EmptyState title="Nothing to plan for yet." body="Once you add holdings, Holdr shows when each gain turns long-term and which moves lower your tax." action={<Button solid onClick={openAdd}>Add holdings</Button>} /></Panel>
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
  const W = 32;
  const seg = v => Math.round((v / comp) * W);

  return (
    <div className="view-enter pt-8 md:pt-12">
      <p className="label">{fy.label} / listed equity / plan with it, don&rsquo;t file with it</p>
      <h1 className="mt-2 text-[32px] md:text-[40px] leading-none tracking-[-0.045em] font-medium">Tax</h1>

      <div className="mt-8 grid md:grid-cols-[1.3fr_1fr] gap-6">
        <Panel title={saving > 0 ? 'You could save up to' : 'Tax if you sold everything'}>
          <p className="text-[40px] leading-none tracking-[-0.05em] font-medium" style={{ color: saving > 0 ? 'var(--up)' : undefined }}>{fmtINR(Math.round(saving > 0 ? saving : totalTax))}</p>
          <p className="mt-3 text-ink-2">Selling everything today would cost about <span className="text-ink">{fmtINR(Math.round(totalTax))}</span> in tax on <span className="text-ink">{fmtSignedINR(ltGain + stGain + losses)}</span> of net gains.</p>
          <p className="mt-4 whitespace-pre overflow-hidden" aria-hidden="true">
            <span className="text-up">{'█'.repeat(seg(ltGain))}</span><span className="text-ink-2">{'▓'.repeat(seg(stGain))}</span><span className="text-down">{'▒'.repeat(seg(Math.abs(losses)))}</span>
          </p>
          <dl className="mt-2 grid grid-cols-3 gap-3">
            <div><dt className="label"><span className="text-up">█</span> long-term</dt><dd>{fmtINR(Math.round(ltGain))}</dd></div>
            <div><dt className="label"><span className="text-ink-2">▓</span> short-term</dt><dd>{fmtINR(Math.round(stGain))}</dd></div>
            <div><dt className="label"><span className="text-down">▒</span> losses</dt><dd>{fmtINR(Math.round(losses))}</dd></div>
          </dl>
        </Panel>
        <Panel title="Still tax-free this year">
          <p className="text-[32px] leading-none tracking-[-0.05em] font-medium">{fmtINR(Math.round(exemptionLeft))}</p>
          <p className="mt-3 text-ink-2">Long-term profit you can book before {fmtDay(fy.end, { year: 'numeric' })} without paying tax. It doesn&rsquo;t carry forward.</p>
          <p className="mt-4 whitespace-pre overflow-hidden"><Bar value={LTCG_EXEMPTION - exemptionLeft} max={LTCG_EXEMPTION} width={24} color="var(--up)" /></p>
          <p className="label mt-1">{Math.round((1 - exemptionLeft / LTCG_EXEMPTION) * 100)}% of ₹1.25L used</p>
        </Panel>
      </div>

      <Panel title="Moves worth considering" aside="biggest saving first" className="mt-6">
        {moves.length === 0 ? <p className="text-ink-2">No tax moves stand out. Sitting tight is a strategy too.</p> : (
          <ol className="flex flex-col">
            {moves.map((m, i) => (
              <li key={m.key} className={`grid grid-cols-[1fr_auto] gap-4 py-3 ${i ? 'border-t border-dashed border-line-2' : ''}`}>
                <div>
                  <p className="text-ink">{m.title}</p>
                  <p className="text-ink-3 mt-1 max-w-[72ch]">{m.body}</p>
                </div>
                {m.save ? <p className="text-up whitespace-nowrap">+{fmtINR(Math.round(m.save))}</p> : <span />}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="When gains turn long-term" aside="after 12 months: 20% → 12.5%" className="mt-6">
        <Timeline rows={rows} />
      </Panel>
    </div>
  );
}
