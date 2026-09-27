import { useHoldr } from '../state';
import { href, navigate } from '../hooks/useRoute';
import { useCreature } from '../hooks/useCreature';
import Creature from '../components/Creature';
import { GlyphChart, longDate } from '../components/charts';
import { Button, Change, EmptyState, Loading, Panel, SourceStamp, SplitBar, Tabs } from '../components/ui';
import { attentionItems } from '../lib/attention';
import { MOOD_COPY } from '../lib/mood';
import { dayTake } from '../lib/voice';
import { PERIODS } from '../lib/market';
import { fmtINR, fmtNum, fmtPct, fmtSignedINR, toneColor } from '../lib/format';
import { marketSession } from '../lib/dates';
import { SAMPLE_NEWS, sampleFlows, SAMPLE_VIX } from '../data/sample';

const PERIOD_PHRASE = { '1D': 'Today', '1W': 'This week', '1M': 'Over the past month', '3M': 'Over three months', YTD: 'This year', '1Y': 'Over the past year' };

const HEADLINE = {
  bull: ['The ', 'bull', ' is out.'],
  bear: ['The ', 'bear', ' is out.'],
  crab: ['A ', 'crab', ' market.'],
  quiet: ['The market went ', 'quiet', '.'],
  loading: ['Reading the ', 'tape', '.'],
};

/* the ticker the creature is drawn with: NIFTY first, then your holdings and their moves */
function tapeFrom(nifty, rows) {
  const part = (label, v) => `${v == null ? '' : v >= 0 ? '▲' : '▼'}${label}${v == null ? '' : fmtPct(v, 2)} `;
  return part('NIFTY50', nifty.sample ? null : nifty.dayChg) + rows.map(r => part(r.symbol, r.dayChg)).join('');
}

function Hero() {
  const { nifty, portfolio, moodPreview } = useHoldr();
  const { kind, state } = useCreature();
  const session = marketSession();
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const [a, word, b] = HEADLINE[state === 'loading' ? 'loading' : kind];
  const quietish = kind === 'quiet' || state === 'loading';
  const fact = state === 'loading' ? 'Fetching NIFTY 50.'
    : state === 'offline' ? 'Couldn’t reach NIFTY 50. Trying again every two minutes.'
      : `NIFTY 50 ${session.open ? 'is' : 'closed'} ${nifty.dayChg >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(nifty.dayChg), 2, false)} at ${fmtNum(nifty.price)}. ${MOOD_COPY[kind === 'crab' ? 'flat' : kind]?.line || ''}`;
  const take = dayTake({ kind, state, dayMove: portfolio.totals.dayMove });

  return (
    <section className="grid md:grid-cols-[1.1fr_1fr] items-center gap-6 md:gap-10 pt-8 md:pt-14 pb-4">
      <div className="order-2 md:order-1">
        <p className="label">{date} / {session.open ? 'market open' : session.label.toLowerCase().replace('market ', '')}</p>
        <h1 className="cursor mt-4 text-[36px] sm:text-[44px] md:text-[52px] leading-[1.05] tracking-[-0.045em] font-medium">
          {a}<span className={quietish ? 'text-ink-2' : 'text-mood'}>{word}</span>{b}
        </h1>
        <p className="mt-5 text-ink-2 max-w-[48ch]">{fact}</p>
        {take && <p className="mt-2 text-ink max-w-[48ch]">{take}</p>}
        {moodPreview && <p className="mt-3 label">Preview. Switch back to Live from the menu.</p>}
      </div>
      <figure className="order-1 md:order-2 m-0">
        <Creature
          kind={kind === 'quiet' ? 'crab' : kind}
          tape={tapeFrom(nifty, portfolio.rows)}
          color={quietish ? 'var(--text-3)' : 'var(--mood)'}
          dim={quietish}
          className="h-[210px] sm:h-[280px] md:h-[360px]"
          label={`${kind === 'quiet' ? 'A sleeping crab' : `A ${kind}`} drawn from today's market numbers`}
        />
        <figcaption className="label text-right">drawn with today&rsquo;s tape</figcaption>
      </figure>
    </section>
  );
}

function PortfolioLine() {
  const { portfolio, mode, period, hasMine, setMode, openAdd } = useHoldr();
  const t = portfolio.totals;
  return (
    <section className="mt-6 pt-6 border-t border-line">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="label">Your portfolio</h2>
        {mode === 'sample' && (
          <button onClick={hasMine ? () => setMode('mine') : openAdd} className="label !text-ink-2 hover:!text-ink">
            [sample, <span className="link">{hasMine ? 'switch to yours' : 'import yours'}</span>]
          </button>
        )}
      </div>
      <p className="mt-2 text-[40px] md:text-[52px] leading-none tracking-[-0.05em] font-medium">{fmtINR(Math.round(t.value))}</p>
      <p className="mt-3 text-ink-2 max-w-[70ch]">
        {t.periodRet != null && t.niftyRet != null && (
          <>{PERIOD_PHRASE[period]} you&rsquo;re <span style={{ color: toneColor(t.periodRet) }}>{fmtPct(t.periodRet)}</span>, NIFTY 50 <span style={{ color: toneColor(t.niftyRet) }}>{fmtPct(t.niftyRet)}</span>. </>
        )}
        Overall <span style={{ color: toneColor(t.pnl) }}>{fmtSignedINR(t.pnl)}</span> on {fmtINR(Math.round(t.invested))} put in.
      </p>
    </section>
  );
}

function Performance() {
  const { portfolio, period, setPeriod, market, mode } = useHoldr();
  const waiting = mode === 'mine' && market.quotesStatus === 'loading' && !portfolio.series;
  const s = portfolio.series;
  const pct = arr => arr.map(v => (v / arr[0] - 1) * 100);
  return (
    <Panel title="You vs NIFTY 50" aside={<SourceStamp source={mode === 'sample' ? 'sample' : market.source || 'file'} at={market.updated} />}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-ink-3"><span className="text-ink">─</span> you   <span className="text-ink-2">·</span> NIFTY 50</p>
        <Tabs label="Period" value={period} onChange={setPeriod} options={PERIODS} />
      </div>
      <div className="mt-4">
        {s ? (
          <GlyphChart
            period={period}
            times={portfolio.times}
            lines={[
              { data: pct(s), color: portfolio.totals.periodRet >= 0 ? 'var(--up)' : 'var(--down)' },
              ...(portfolio.benchmark ? [{ data: pct(portfolio.benchmark), color: 'var(--text-2)', style: 'dots' }] : []),
            ]}
            formatY={v => fmtPct(v, Math.abs(v) < 10 ? 1 : 0)}
            tooltip={i => (
              <>
                {portfolio.times && <p className="label">{longDate(period, portfolio.times[i])}</p>}
                <p>{fmtINR(Math.round(s[i]))} <Change value={pct(s)[i]} glyph={false} /></p>
                {portfolio.benchmark && <p className="text-ink-2">NIFTY <Change value={pct(portfolio.benchmark)[i]} glyph={false} /></p>}
              </>
            )}
          />
        ) : waiting ? <Loading text="Fetching prices" /> : (
          <EmptyState title="No price history yet." body="The chart needs live prices for every holding. It fills in once the Upstox bridge or Yahoo answers." />
        )}
      </div>
    </Panel>
  );
}

const TONE_GLYPH = { down: ['!', 'var(--down)'], warn: ['~', 'var(--warn)'], accent: ['$', 'var(--up)'], neutral: ['>', 'var(--text-3)'] };

function NeedsYou() {
  const { portfolio } = useHoldr();
  const items = attentionItems(portfolio.rows);
  const shown = items.slice(0, 4);
  return (
    <Panel title="Needs you" aside={items.length ? `${items.length}` : null}>
      {shown.length === 0 ? (
        <p className="text-ink-2">Nothing needs you today. That&rsquo;s allowed.</p>
      ) : (
        <ul className="flex flex-col -mx-2">
          {shown.map(it => {
            const [g, c] = TONE_GLYPH[it.tone];
            return (
              <li key={it.key}>
                <a href={href(it.to)} className="row flex gap-3 px-2 py-2.5">
                  <span style={{ color: c }} aria-hidden="true">{g}</span>
                  <span className="min-w-0">
                    <span className="block text-ink leading-snug">{it.title}</span>
                    <span className="block text-ink-3 mt-1 line-clamp-2">{it.body}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > shown.length && <a href={href('/holdings')} className="link text-ink-2 mt-2 inline-block">+{items.length - shown.length} more in holdings</a>}
    </Panel>
  );
}

function Moved() {
  const { portfolio } = useHoldr();
  const rows = portfolio.rows.filter(r => r.dayMove != null).sort((a, b) => b.dayMove - a.dayMove);
  const t = portfolio.totals;
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.dayMove)), 1);
  return (
    <Panel title="What moved your money today" aside={t.dayMove != null ? <span style={{ color: toneColor(t.dayMove) }}>{fmtSignedINR(t.dayMove)} net</span> : null}>
      {rows.length ? (
        <ul className="-mx-2">
          {rows.map(r => (
            <li key={r.id}>
              <button onClick={() => navigate(`/holdings/${r.id}`)} className="row w-full grid grid-cols-[92px_1fr_auto] sm:grid-cols-[120px_1fr_auto] gap-3 items-center px-2 py-1 text-left">
                <span className="truncate">{r.symbol}</span>
                <span className="overflow-hidden"><SplitBar value={r.dayMove} max={maxAbs} half={10} /></span>
                <span className="text-right" style={{ color: toneColor(r.dayMove) }}>{fmtSignedINR(r.dayMove)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2">Day moves show up once live prices arrive for your holdings.</p>
      )}
    </Panel>
  );
}

function AroundMarket() {
  const { market } = useHoldr();
  const flows = market.flows || sampleFlows(20);
  const d = flows[flows.length - 1];
  const vix = market.macro?.vix ? { value: market.macro.vix.price, chg: market.macro.vix.dayChg } : SAMPLE_VIX;
  const story = d.fii.net < 0 && d.dii.net > 0 ? 'Foreign money is leaving. Domestic funds are catching it.'
    : d.fii.net > 0 && d.dii.net < 0 ? 'Foreign money is coming in. Domestic funds are taking profits.'
      : d.fii.net > 0 ? 'Foreign and domestic money are both buying.' : 'Foreign and domestic money are both selling.';
  const cr = v => (v >= 0 ? '+' : '−') + '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN') + 'cr';
  return (
    <Panel title="Around the market" aside={market.flows ? 'NSE' : 'sample flows'}>
      <p>{story}</p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div><dt className="label">FII</dt><dd style={{ color: toneColor(d.fii.net) }}>{cr(d.fii.net)}</dd></div>
        <div><dt className="label">DII</dt><dd style={{ color: toneColor(d.dii.net) }}>{cr(d.dii.net)}</dd></div>
        <div><dt className="label">VIX</dt><dd>{vix.value.toFixed(1)} <Change value={vix.chg} glyph={false} className="text-[12px]" /></dd></div>
      </dl>
      <a href={href('/market')} className="link text-ink-2 mt-4 inline-block">Open market &rarr;</a>
    </Panel>
  );
}

function News() {
  const { portfolio } = useHoldr();
  const byId = Object.fromEntries(portfolio.rows.map(r => [r.id, r]));
  return (
    <Panel title="In the news" aside="sample headlines" className="mt-6">
      <ul className="-mx-2">
        {SAMPLE_NEWS.map((n, i) => {
          const h = n.holding ? byId[n.holding] : null;
          return (
            <li key={i} className="grid grid-cols-[92px_1fr_auto] sm:grid-cols-[120px_1fr_48px] gap-3 px-2 py-1.5">
              {h ? <a href={href(`/holdings/${h.id}`)} className="link truncate">{h.symbol}</a> : <span className="text-ink-3 truncate">{n.tag.toUpperCase()}</span>}
              <span className="text-ink-2">{n.text}</span>
              <span className="text-ink-3 text-right">{n.hoursAgo}h</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function Today() {
  const { mode, hasMine, openAdd, setMode } = useHoldr();
  const emptyMine = mode === 'mine' && !hasMine;
  return (
    <div className="view-enter">
      <Hero />
      {emptyMine ? (
        <div className="mt-8 grid gap-6">
          <Panel title="Your portfolio">
            <EmptyState
              title="What do you hold?"
              body="Import your broker's holdings file or add stocks one at a time. Holdr keeps track of why you own each one and tells you when that changes."
              action={<><Button solid onClick={openAdd}>Import holdings</Button><Button onClick={() => setMode('sample')}>Explore the sample</Button></>}
            />
          </Panel>
          <AroundMarket />
        </div>
      ) : (
        <>
          <PortfolioLine />
          <div className="mt-8 grid lg:grid-cols-[1.55fr_1fr] gap-6">
            <Performance />
            <NeedsYou />
          </div>
          <div className="mt-6 grid lg:grid-cols-[1.55fr_1fr] gap-6">
            <Moved />
            <AroundMarket />
          </div>
          {mode === 'sample' && <News />}
        </>
      )}
    </div>
  );
}
