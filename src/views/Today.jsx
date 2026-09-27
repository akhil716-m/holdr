import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { useHoldr } from '../state';
import { navigate, href } from '../hooks/useRoute';
import MoodMark from '../components/MoodMark';
import { ValueChart, ContributionBars } from '../components/charts';
import { Button, Change, EmptyState, SectionHead, Segmented, Skeleton, SourceStamp } from '../components/ui';
import { attentionItems } from '../lib/attention';
import { MOOD_COPY } from '../lib/mood';
import { PERIODS } from '../lib/market';

const PERIOD_PHRASE = { '1D': 'Today', '1W': 'This week', '1M': 'Over the past month', '3M': 'Over three months', YTD: 'This year', '1Y': 'Over the past year' };
import { fmtINR, fmtNum, fmtPct, fmtSignedINR, toneColor } from '../lib/format';
import { greeting, marketSession } from '../lib/dates';
import { SAMPLE_NEWS, sampleFlows, SAMPLE_VIX } from '../data/sample';

function Hero() {
  const { mood, nifty, market, moodPreview, profile } = useHoldr();
  const session = marketSession();
  const known = market.niftyStatus !== 'loading' || moodPreview;
  const copy = MOOD_COPY[mood];
  const dir = nifty.dayChg >= 0 ? 'up' : 'down';
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <section className="relative pt-10 md:pt-14 pb-2">
      <MoodMark mood={mood} className="hidden md:block absolute right-0 top-6 w-64 pointer-events-none opacity-70" strokeWidth={1.8} />
      <div className="relative max-w-[640px]">
        <MoodMark mood={mood} className="md:hidden w-20 h-10 mb-4 opacity-80" strokeWidth={1.6} />
        <p className="text-[13px] text-ink-3">
          {greeting()}{profile !== 'You' ? `, ${profile}` : ''}. {date}
        </p>
        {known && nifty.sample && !moodPreview ? (
          <h1 className="mt-3 text-[28px] md:text-[36px] leading-[1.15] font-medium tracking-tight">
            Live market data is unavailable. <span className="text-ink-2">Your holdings below still add up; the market mood returns with NIFTY.</span>
          </h1>
        ) : known ? (
          <h1 className="mt-3 text-[28px] md:text-[36px] leading-[1.15] font-medium tracking-tight">
            <span style={{ color: 'var(--mood)' }}>{copy.name}.</span>{' '}
            <span className="text-ink-2">NIFTY 50 {session.open ? 'is' : 'closed'} {dir} {fmtPct(Math.abs(nifty.dayChg), 2, false)} at <span className="num">{fmtNum(nifty.price)}</span>.</span>
          </h1>
        ) : (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-8 w-[80%]" /><Skeleton className="h-8 w-[50%]" /></div>
        )}
        <p className="mt-3 text-[13px] text-ink-3">
          {session.label}. {moodPreview ? `Previewing the ${copy.name.toLowerCase()} look. Switch back to Live from the menu.` : market.niftyStatus === 'loading' ? 'Fetching NIFTY 50...' : nifty.sample ? 'Retrying every two minutes.' : copy.line}
        </p>
      </div>
    </section>
  );
}

function PortfolioSummary() {
  const { portfolio, mode, period } = useHoldr();
  const t = portfolio.totals;
  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] text-ink-2">Your portfolio</h2>
        {mode === 'sample' && <span className="text-[11px] font-medium px-2 h-5 inline-flex items-center rounded-full bg-surface-3 text-ink-2">Sample</span>}
      </div>
      <p className="mt-1 text-[40px] md:text-[48px] leading-none font-medium tracking-tight num">{fmtINR(Math.round(t.value))}</p>
      <p className="mt-3 text-[15px] text-ink-2 max-w-[60ch] leading-relaxed">
        {t.dayMove != null ? (
          <>
            <span style={{ color: toneColor(t.dayMove) }} className="num">{t.dayMove >= 0 ? 'Up' : 'Down'} {fmtINR(Math.abs(Math.round(t.dayMove)))} today ({fmtPct(t.dayPct)})</span>.{' '}
          </>
        ) : <>Today's move shows once live prices load. </>}
        {t.periodRet != null && t.niftyRet != null && (
          <>
            {PERIOD_PHRASE[period]} you're{' '}
            <span className="num" style={{ color: toneColor(t.periodRet) }}>{fmtPct(t.periodRet)}</span> and NIFTY 50 is{' '}
            <span className="num" style={{ color: toneColor(t.niftyRet) }}>{fmtPct(t.niftyRet)}</span>.{' '}
          </>
        )}
        <span className="text-ink-3">Overall <span className="num" style={{ color: toneColor(t.pnl) }}>{fmtSignedINR(t.pnl)}</span> on {fmtINR(Math.round(t.invested))} invested.</span>
      </p>
    </section>
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
        <p className="mt-4 text-[13px] text-ink-2 leading-relaxed">Nothing needs a decision today. Your theses are holding and there are no tax windows or events coming up.</p>
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
        <p className="mt-4 text-[13px] text-ink-2">Day moves appear once live prices load for your holdings.</p>
      )}
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

export default function Today() {
  const { mode, hasMine, openAdd, setMode } = useHoldr();
  const emptyMine = mode === 'mine' && !hasMine;
  return (
    <div className="view-enter">
      <Hero />
      {mode === 'sample' && (
        <div className="mt-8 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
          <span>You're looking at a sample portfolio.</span>
          <button onClick={hasMine ? () => setMode('mine') : openAdd} className="text-accent font-medium">{hasMine ? 'Switch to yours' : 'Import yours'}</button>
        </div>
      )}
      {emptyMine ? (
        <section className="mt-10 card p-6 sm:p-8">
          <EmptyState
            title="Bring in what you hold"
            body="Import a holdings file from your broker or add stocks one at a time. Holdr then tracks why you own each one, how it's doing against NIFTY and what it means for your tax."
            action={<div className="flex gap-2"><Button onClick={openAdd}>Import holdings</Button><Button variant="ghost" onClick={() => setMode('sample')}>Explore the sample</Button></div>}
          />
        </section>
      ) : (
        <>
          <PortfolioSummary />
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
      {emptyMine && <section className="mt-4"><MarketContext /></section>}
    </div>
  );
}
