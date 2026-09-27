import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { useHoldr } from '../state';
import { href, navigate } from '../hooks/useRoute';
import Creature from '../components/Creature';
import { ValueChart, ContributionBars } from '../components/charts';
import { Button, Change, EmptyState, SectionHead, Segmented, Skeleton, SourceStamp } from '../components/ui';
import { attentionItems } from '../lib/attention';
import { MOOD_COPY } from '../lib/mood';
import { dayTake } from '../lib/voice';
import { PERIODS } from '../lib/market';
import { fmtINR, fmtNum, fmtPct, fmtSignedINR, toneColor } from '../lib/format';
import { marketSession } from '../lib/dates';
import { SAMPLE_NEWS, sampleFlows, SAMPLE_VIX } from '../data/sample';

const PERIOD_PHRASE = { '1D': 'Today', '1W': 'This week', '1M': 'Over the past month', '3M': 'Over three months', YTD: 'This year', '1Y': 'Over the past year' };

/* which creature the day gets: real index data only, or a preview the user chose */
export function useCreature() {
  const { mood, nifty, market, moodPreview } = useHoldr();
  if (moodPreview) return { kind: moodPreview === 'flat' ? 'crab' : moodPreview, state: 'preview' };
  if (market.niftyStatus === 'loading') return { kind: 'crab', state: 'loading' };
  if (nifty.sample) return { kind: 'quiet', state: 'offline' };
  return { kind: mood === 'flat' ? 'crab' : mood, state: 'live' };
}

const HEADLINE = {
  bull: <>The <em>bull</em> is out.</>,
  bear: <>The <em>bear</em> is out.</>,
  crab: <>A <em>crab</em> market.</>,
  quiet: <>The market has gone <em>quiet</em>.</>,
  loading: <>Reading the <em>tape</em>.</>,
};

/* the ticker the creature is drawn with: NIFTY first, then your holdings and their moves */
function tapeFrom(nifty, rows) {
  const part = (label, v) => `${v == null ? '' : v >= 0 ? '▲' : '▼'}${label} ${v == null ? '' : fmtPct(v, 2)}  `;
  return part('NIFTY50', nifty.sample ? null : nifty.dayChg) + rows.map(r => part(r.symbol, r.dayChg)).join('');
}

function Hero() {
  const { nifty, portfolio, moodPreview } = useHoldr();
  const { kind, state } = useCreature();
  const session = marketSession();
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const drawn = kind === 'quiet' ? 'crab' : kind;
  const color = kind === 'quiet' || state === 'loading' ? 'var(--text-3)' : 'var(--mood)';
  const moodKey = kind === 'crab' ? 'flat' : kind;

  const fact = state === 'loading' ? 'Fetching NIFTY 50.'
    : state === 'offline' ? 'Couldn’t reach NIFTY 50. Trying again every two minutes.'
      : `NIFTY 50 ${session.open ? 'is' : 'closed'} ${nifty.dayChg >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(nifty.dayChg), 2, false)} at ${fmtNum(nifty.price)}. ${MOOD_COPY[moodKey]?.line || ''}`;
  const take = dayTake({ kind, state, dayMove: portfolio.totals.dayMove });

  return (
    <section className="hero-band">
      <div className="prism" aria-hidden="true" />
      <div className="relative max-w-[1120px] mx-auto px-4 sm:px-6 grid md:grid-cols-[1fr_1.05fr] items-center gap-4 md:gap-8 pt-8 md:pt-12 pb-6 md:pb-10">
        <div className="order-2 md:order-1">
          <p className="text-[13px] text-ink-2">{date} · {session.label.replace('Market closed for the weekend', 'Weekend, market closed')}</p>
          <h1 className="font-display mt-4 text-[44px] sm:text-[56px] md:text-[68px] leading-[1.02] tracking-[-0.02em] pb-1">
            {HEADLINE[state === 'loading' ? 'loading' : kind]}
          </h1>
          <p className="mt-4 text-[15px] text-ink-2 max-w-[46ch] leading-relaxed">{fact}</p>
          {take && <p className="mt-2 text-[15px] text-ink max-w-[46ch] leading-relaxed">{take}</p>}
          {moodPreview && <p className="mt-3 text-[12px] text-ink-3">Preview. Switch back to Live from the menu.</p>}
        </div>
        <figure className="order-1 md:order-2 m-0">
          <Creature
            kind={drawn}
            tape={tapeFrom(nifty, portfolio.rows)}
            color={color}
            dim={kind === 'quiet' || state === 'loading'}
            className="h-[220px] sm:h-[300px] md:h-[400px]"
            label={`${kind === 'quiet' ? 'A sleeping crab' : `A ${drawn}`} drawn from today's market numbers`}
          />
          <figcaption className="font-mono-ui text-[11px] text-ink-3 text-right mt-1">drawn with today&rsquo;s tape</figcaption>
        </figure>
      </div>
    </section>
  );
}

function PortfolioSummary() {
  const { portfolio, mode, period, hasMine, setMode, openAdd } = useHoldr();
  const t = portfolio.totals;
  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-[13px] text-ink-2">Your portfolio</h2>
        {mode === 'sample' && (
          <button onClick={hasMine ? () => setMode('mine') : openAdd}
            className="press text-[12px] font-medium px-2.5 h-6 inline-flex items-center gap-1.5 rounded-full bg-surface-3 text-ink-2 hover:text-ink">
            Sample <span className="text-ink-3">·</span> <span className="text-accent">{hasMine ? 'Switch to yours' : 'Import yours'}</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-[44px] md:text-[56px] leading-none font-medium tracking-tight num">{fmtINR(Math.round(t.value))}</p>
      <p className="mt-3 text-[15px] text-ink-2 max-w-[60ch] leading-relaxed">
        {t.periodRet != null && t.niftyRet != null && (
          <>
            {PERIOD_PHRASE[period]} you&rsquo;re <span className="num" style={{ color: toneColor(t.periodRet) }}>{fmtPct(t.periodRet)}</span>, NIFTY 50 <span className="num" style={{ color: toneColor(t.niftyRet) }}>{fmtPct(t.niftyRet)}</span>.{' '}
          </>
        )}
        <span className="text-ink-3">Overall <span className="num" style={{ color: toneColor(t.pnl) }}>{fmtSignedINR(t.pnl)}</span> on {fmtINR(Math.round(t.invested))}.</span>
      </p>
    </div>
  );
}

function PerformanceCard() {
  const { portfolio, period, setPeriod, market, mode } = useHoldr();
  const waiting = mode === 'mine' && market.quotesStatus === 'loading' && !portfolio.series;
  return (
    <div className="card p-4 sm:p-5 flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-[12px] text-ink-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] rounded bg-[var(--chart-line)]" />You</span>
          <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-[var(--chart-bench)]" />NIFTY 50</span>
        </div>
        <div className="overflow-x-auto scrollbar-none -mr-1"><Segmented label="Period" size="sm" value={period} onChange={setPeriod} options={PERIODS} /></div>
      </div>
      <div className="mt-4 flex-1">
        {portfolio.series ? (
          <ValueChart series={portfolio.series} benchmark={portfolio.benchmark} times={portfolio.times} period={period} />
        ) : waiting ? (
          <Skeleton className="h-[240px] w-full" />
        ) : (
          <EmptyState title="No price history yet" body="The chart needs live prices for every holding. Start the Upstox bridge or check your connection, then this fills in." />
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-line flex justify-between">
        <SourceStamp source={mode === 'sample' ? 'sample' : market.source || 'file'} at={market.updated} />
        {mode === 'sample' && <span className="text-[12px] text-ink-3">Benchmark {market.nifty ? 'is live' : 'is a sample'}</span>}
      </div>
    </div>
  );
}

const TONE_BAR = { down: 'var(--down)', warn: 'var(--warn)', accent: 'var(--accent)', neutral: 'var(--line-strong)' };

function NeedsYou() {
  const { portfolio } = useHoldr();
  const items = attentionItems(portfolio.rows);
  const shown = items.slice(0, 4);
  return (
    <div className="card p-4 sm:p-5 min-w-0">
      <SectionHead title="Needs you" aside={items.length ? `${items.length} item${items.length === 1 ? '' : 's'}` : null} />
      {shown.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-2 leading-relaxed">Nothing needs you today. That’s allowed.</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {shown.map(it => (
            <li key={it.key}>
              <a href={href(it.to)} className="row-hover group flex gap-3 py-3 px-2 -mx-2 rounded-[10px]">
                <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: TONE_BAR[it.tone] }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium leading-snug">{it.title}</span>
                  <span className="block text-[13px] text-ink-2 leading-relaxed mt-1 line-clamp-2">{it.body}</span>
                </span>
                <ArrowUpRightIcon size={14} className="text-ink-3 group-hover:text-ink mt-1 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {items.length > shown.length && <a href={href('/holdings')} className="block mt-2 text-[13px] text-accent">See {items.length - shown.length} more in Holdings</a>}
    </div>
  );
}

function MarketContext() {
  const { market } = useHoldr();
  const flows = market.flows || sampleFlows(20);
  const d = flows[flows.length - 1];
  const vix = market.macro?.vix ? { value: market.macro.vix.price, chg: market.macro.vix.dayChg } : SAMPLE_VIX;
  const story = d.fii.net < 0 && d.dii.net > 0
    ? 'Foreign investors are selling and domestic funds are absorbing it.'
    : d.fii.net > 0 && d.dii.net < 0
      ? 'Foreign investors are buying while domestic funds take profits.'
      : d.fii.net > 0 ? 'Foreign and domestic institutions are both buying.' : 'Foreign and domestic institutions are both selling.';
  const cr = v => (v >= 0 ? '+' : '−') + '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN') + ' cr';
  return (
    <div className="card p-4 sm:p-5 min-w-0 flex flex-col">
      <SectionHead title="Around the market" aside={market.flows ? 'NSE' : 'Sample flows'} />
      <p className="mt-3 text-[14px] leading-relaxed">{story}</p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div><dt className="text-[12px] text-ink-3">Foreign</dt><dd className="text-[15px] num mt-0.5" style={{ color: toneColor(d.fii.net) }}>{cr(d.fii.net)}</dd></div>
        <div><dt className="text-[12px] text-ink-3">Domestic</dt><dd className="text-[15px] num mt-0.5" style={{ color: toneColor(d.dii.net) }}>{cr(d.dii.net)}</dd></div>
        <div><dt className="text-[12px] text-ink-3">India VIX</dt><dd className="text-[15px] num mt-0.5">{vix.value.toFixed(1)} <Change value={vix.chg} className="text-[12px]" /></dd></div>
      </dl>
      <a href={href('/market')} className="mt-auto pt-4 text-[13px] text-accent inline-flex items-center gap-1">Open Market <ArrowUpRightIcon size={12} /></a>
    </div>
  );
}

function News() {
  const { portfolio } = useHoldr();
  const byId = Object.fromEntries(portfolio.rows.map(r => [r.id, r]));
  return (
    <section className="mt-10">
      <SectionHead title="In the news" aside="Sample headlines" />
      <ul className="mt-3 grid md:grid-cols-2 gap-x-8">
        {SAMPLE_NEWS.map((n, i) => {
          const h = n.holding ? byId[n.holding] : null;
          return (
            <li key={i} className="py-3 border-b border-line">
              <p className="text-[12px] text-ink-3">
                {h ? <a href={href(`/holdings/${h.id}`)} className="text-ink-2 font-medium hover:text-ink">{h.symbol}</a> : n.tag}, {n.hoursAgo}h ago
              </p>
              <p className="text-[14px] leading-relaxed mt-1">{n.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MovedToday() {
  const { portfolio } = useHoldr();
  const rows = portfolio.rows.filter(r => r.dayMove != null);
  const t = portfolio.totals;
  return (
    <div className="card p-4 sm:p-5 min-w-0">
      <SectionHead title="What moved your money today" aside={t.dayMove != null ? <span className="num" style={{ color: toneColor(t.dayMove) }}>{fmtSignedINR(t.dayMove)} net</span> : null} />
      {rows.length ? (
        <div className="mt-3"><ContributionBars rows={rows} onOpen={r => navigate(`/holdings/${r.id}`)} /></div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-2">Day moves show up once live prices arrive for your holdings.</p>
      )}
    </div>
  );
}

export default function Today() {
  const { mode, hasMine, openAdd, setMode } = useHoldr();
  const emptyMine = mode === 'mine' && !hasMine;
  return (
    <div className="view-enter">
      <Hero />
      {emptyMine ? (
        <>
          <section className="mt-6 card p-6 sm:p-8">
            <EmptyState
              title="What do you hold?"
              body="Import your broker’s holdings file or add stocks one at a time. Holdr keeps track of why you own each one and tells you when that changes."
              action={<div className="flex gap-2"><Button onClick={openAdd}>Import holdings</Button><Button variant="ghost" onClick={() => setMode('sample')}>Explore the sample</Button></div>}
            />
          </section>
          <section className="mt-4"><MarketContext /></section>
        </>
      ) : (
        <>
          <section className="mt-8"><PortfolioSummary /></section>
          <section className="mt-6 grid lg:grid-cols-[1.55fr_1fr] gap-4">
            <PerformanceCard />
            <NeedsYou />
          </section>
          <section className="mt-4 grid lg:grid-cols-[1.55fr_1fr] gap-4">
            <MovedToday />
            <MarketContext />
          </section>
          {mode === 'sample' && <News />}
        </>
      )}
    </div>
  );
}
