import { useId, useState } from 'react';
import { useWidth } from '../hooks/useWidth';
import { fmtINR, fmtPct, fmtSignedINR, toneColor } from '../lib/format';

const tickFormat = period => t => {
  const d = new Date(t);
  if (period === '1D') return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (period === '1W') return d.toLocaleDateString('en-IN', { weekday: 'short' });
  if (period === '1Y' || period === 'YTD') return d.toLocaleDateString('en-IN', { month: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const longDate = (period, t) => {
  const d = new Date(t);
  return period === '1D' || period === '1W'
    ? d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function useHover(n, width, padL, innerW) {
  const [i, setI] = useState(null);
  const handlers = {
    onPointerMove: e => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - padL;
      setI(Math.max(0, Math.min(n - 1, Math.round((x / innerW) * (n - 1)))));
    },
    onPointerLeave: () => setI(null),
  };
  return [i, handlers];
}

function Tooltip({ x, width, children }) {
  const flip = x > width * 0.62;
  return (
    <div
      className="absolute top-0 pointer-events-none z-10 rounded-[10px] bg-surface-3 border border-line-strong px-3 py-2 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]"
      style={{ left: x, transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
    >
      {children}
    </div>
  );
}

/* your portfolio against NIFTY 50, both as % change from the start of the period */
export function ValueChart({ series, benchmark, times, period, height = 240 }) {
  const [ref, width] = useWidth();
  const uid = useId().replace(/:/g, '');
  const padL = 0, padR = 44, padT = 16, padB = 26;
  const innerW = width - padL - padR, innerH = height - padT - padB;
  const n = series.length;
  const p = series.map(v => (v / series[0] - 1) * 100);
  const b = benchmark ? benchmark.map(v => (v / benchmark[0] - 1) * 100) : null;
  const all = b ? [...p, ...b, 0] : [...p, 0];
  let min = Math.min(...all), max = Math.max(...all);
  const padV = (max - min) * 0.12 || 1;
  min -= padV; max += padV;
  const x = i => padL + (i / (n - 1)) * innerW;
  const y = v => padT + (1 - (v - min) / (max - min)) * innerH;
  const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const [hi, hover] = useHover(n, width, padL, innerW);

  const step = niceStep((max - min) / 3);
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  const fmtTick = tickFormat(period);
  const xLabels = times ? [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1] : [];
  const up = p[n - 1] >= 0;

  return (
    <div ref={ref} className="relative w-full select-none touch-pan-y" style={{ height }} {...hover}>
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={`vf-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-line)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--chart-line)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} x2={padL + innerW} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? 'var(--line-strong)' : 'var(--line)'} />
            <text x={width - 4} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" className="num">{fmtPct(v, Math.abs(step) < 1 ? 1 : 0)}</text>
          </g>
        ))}
        {xLabels.map((i, k) => (
          <text key={k} x={x(i)} y={height - 6} fontSize="11" fill="var(--text-3)" textAnchor={k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle'}>
            {fmtTick(times[i])}
          </text>
        ))}
        <path d={`${line(p)}L${x(n - 1)},${padT + innerH}L${x(0)},${padT + innerH}Z`} fill={`url(#vf-${uid})`} />
        {b && <path d={line(b)} stroke="var(--chart-bench)" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />}
        <path key={period + n} d={line(p)} pathLength="1" className="chart-draw" stroke="var(--chart-line)" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {hi != null ? (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + innerH} stroke="var(--line-strong)" />
            {b && <circle cx={x(hi)} cy={y(b[hi])} r="3" fill="var(--chart-bench)" />}
            <circle cx={x(hi)} cy={y(p[hi])} r="4" fill="var(--chart-line)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        ) : (
          <circle cx={x(n - 1)} cy={y(p[n - 1])} r="3.5" fill={up ? 'var(--up)' : 'var(--down)'} />
        )}
      </svg>
      {hi != null && (
        <Tooltip x={x(hi)} width={width}>
          {times && <p className="text-[11px] text-ink-3 whitespace-nowrap">{longDate(period, times[hi])}</p>}
          <p className="text-[13px] num font-medium whitespace-nowrap mt-0.5">
            {fmtINR(Math.round(series[hi]))} <span style={{ color: toneColor(p[hi]) }}>{fmtPct(p[hi])}</span>
          </p>
          {b && <p className="text-[12px] num text-ink-2 whitespace-nowrap">NIFTY 50 <span style={{ color: toneColor(b[hi]) }}>{fmtPct(b[hi])}</span></p>}
        </Tooltip>
      )}
    </div>
  );
}

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(Math.abs(raw) || 1));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

/* single price series with an optional reference line (your average buy price) */
export function PriceChart({ series, times, period, format = v => fmtINR(v, 2), reference, height = 220 }) {
  const [ref, width] = useWidth();
  const uid = useId().replace(/:/g, '');
  const padR = 64, padT = 14, padB = 26;
  const innerW = width - padR, innerH = height - padT - padB;
  const n = series.length;
  const vals = reference ? [...series, reference.value] : series;
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.1 || max * 0.01;
  min -= pad; max += pad;
  const x = i => (i / (n - 1)) * innerW;
  const y = v => padT + (1 - (v - min) / (max - min)) * innerH;
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const [hi, hover] = useHover(n, width, 0, innerW);
  const up = series[n - 1] >= series[0];
  const col = up ? 'var(--up)' : 'var(--down)';
  const fmtTick = tickFormat(period);
  const xLabels = times ? [0, Math.round((n - 1) / 2), n - 1] : [];

  return (
    <div ref={ref} className="relative w-full select-none touch-pan-y" style={{ height }} {...hover}>
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={`pf-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={col} stopOpacity="0.16" />
            <stop offset="1" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={innerW} y1={padT + innerH} y2={padT + innerH} stroke="var(--line)" />
        {[max - pad, min + pad].filter(v => !reference || Math.abs(y(v) - y(reference.value)) > 16).map((v, k) => (
          <text key={k} x={width - 2} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" className="num">{format(v)}</text>
        ))}
        {xLabels.map((i, k) => (
          <text key={k} x={x(i)} y={height - 6} fontSize="11" fill="var(--text-3)" textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>{fmtTick(times[i])}</text>
        ))}
        {reference && (
          <g>
            <line x1="0" x2={innerW} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--text-3)" strokeDasharray="2 4" />
            <text x={8} y={y(reference.value) - 6} fontSize="11" fill="var(--text-2)">{reference.label} {format(reference.value)}</text>
          </g>
        )}
        <path d={`${d}L${x(n - 1)},${padT + innerH}L0,${padT + innerH}Z`} fill={`url(#pf-${uid})`} />
        <path key={period + n} d={d} pathLength="1" className="chart-draw" stroke={col} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
        {hi != null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + innerH} stroke="var(--line-strong)" />
            <circle cx={x(hi)} cy={y(series[hi])} r="4" fill={col} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hi != null && (
        <Tooltip x={x(hi)} width={width}>
          {times && <p className="text-[11px] text-ink-3 whitespace-nowrap">{longDate(period, times[hi])}</p>}
          <p className="text-[13px] num font-medium whitespace-nowrap mt-0.5">{format(series[hi])}</p>
        </Tooltip>
      )}
    </div>
  );
}

export function Sparkline({ data, width = 72, height = 24 }) {
  if (!data || data.length < 2) return <span style={{ width, height }} className="inline-block" />;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / r) * (height - 4)).toFixed(1)}`).join('');
  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible" aria-hidden="true">
      <path d={d} stroke="var(--text-3)" strokeWidth="1.3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* which holdings moved your money today, in rupees, gains right and losses left */
export function ContributionBars({ rows, onOpen }) {
  const sorted = [...rows].sort((a, b) => b.dayMove - a.dayMove);
  const maxAbs = Math.max(...sorted.map(r => Math.abs(r.dayMove)), 1);
  return (
    <ul className="flex flex-col">
      {sorted.map(r => {
        const w = (Math.abs(r.dayMove) / maxAbs) * 100;
        const pos = r.dayMove >= 0;
        return (
          <li key={r.id}>
            <button onClick={() => onOpen(r)} className="row-hover w-full grid grid-cols-[88px_1fr_88px] sm:grid-cols-[120px_1fr_104px] items-center gap-3 py-2 px-2 -mx-2 rounded-[10px] text-left">
              <span className="text-[13px] font-medium truncate">{r.symbol}</span>
              <span className="relative h-5 grid grid-cols-2" aria-hidden="true">
                <span className="relative border-r border-line-strong">
                  {!pos && <span className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 rounded-l-full" style={{ width: `${w}%`, background: 'var(--down)', opacity: 0.85 }} />}
                </span>
                <span className="relative">
                  {pos && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 rounded-r-full" style={{ width: `${w}%`, background: 'var(--up)', opacity: 0.85 }} />}
                </span>
              </span>
              <span className="text-[13px] num text-right" style={{ color: toneColor(r.dayMove) }}>{fmtSignedINR(r.dayMove)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* net FII and DII activity per day, buying above the line and selling below */
export function FlowBars({ history, height = 180 }) {
  const [ref, width] = useWidth();
  const n = history.length;
  const padT = 8, padB = 24, padL = 44;
  const innerW = width - padL, innerH = height - padT - padB;
  const maxAbs = Math.max(...history.flatMap(d => [Math.abs(d.fii.net), Math.abs(d.dii.net)]), 1);
  const top = Math.ceil(maxAbs / 1000) * 1000;
  const zero = padT + innerH / 2;
  const yh = v => (v / top) * (innerH / 2);
  const slot = innerW / n;
  const bw = Math.max(2, Math.min(9, slot * 0.3));
  const [hi, setHi] = useState(null);
  const fmtK = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.round(Math.abs(v) / 1000) + 'k';
  const cr = v => (v >= 0 ? '+' : '−') + '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN') + ' cr';

  return (
    <div
      ref={ref}
      className="relative w-full select-none touch-pan-y"
      style={{ height }}
      onPointerMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setHi(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - padL) / slot))));
      }}
      onPointerLeave={() => setHi(null)}
    >
      <svg width={width} height={height} className="block">
        {[top, 0, -top].map(v => (
          <g key={v}>
            <line x1={padL} x2={width} y1={zero - yh(v)} y2={zero - yh(v)} stroke={v === 0 ? 'var(--line-strong)' : 'var(--line)'} />
            <text x={0} y={zero - yh(v) + 4} fontSize="11" fill="var(--text-3)" className="num">{v === 0 ? '0' : fmtK(v)}</text>
          </g>
        ))}
        {history.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          const dim = hi != null && hi !== i ? 0.35 : 1;
          return (
            <g key={i} opacity={dim}>
              <rect x={cx - bw - 1} width={bw} rx="2" fill="var(--text-2)" y={d.fii.net >= 0 ? zero - yh(d.fii.net) : zero} height={Math.max(1.5, Math.abs(yh(d.fii.net)))} />
              <rect x={cx + 1} width={bw} rx="2" fill="var(--accent)" y={d.dii.net >= 0 ? zero - yh(d.dii.net) : zero} height={Math.max(1.5, Math.abs(yh(d.dii.net)))} />
            </g>
          );
        })}
        {[0, n - 1].map((i, k) => (
          <text key={k} x={padL + slot * i + slot / 2} y={height - 6} fontSize="11" fill="var(--text-3)" textAnchor={k ? 'end' : 'start'}>
            {history[i].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </text>
        ))}
      </svg>
      {hi != null && (
        <Tooltip x={padL + slot * hi + slot / 2} width={width}>
          <p className="text-[11px] text-ink-3 whitespace-nowrap">{history[hi].date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p className="text-[12px] num whitespace-nowrap mt-0.5">Foreign <span style={{ color: toneColor(history[hi].fii.net) }}>{cr(history[hi].fii.net)}</span></p>
          <p className="text-[12px] num whitespace-nowrap">Domestic <span style={{ color: toneColor(history[hi].dii.net) }}>{cr(history[hi].dii.net)}</span></p>
        </Tooltip>
      )}
    </div>
  );
}
