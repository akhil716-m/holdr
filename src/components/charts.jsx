import { useEffect, useRef, useState } from 'react';
import { useWidth } from '../hooks/useWidth';
import { resample } from '../lib/seed';

/*
  Charts in the tape language: plotted into a grid of character cells, like the creature.
  A series is drawn with line glyphs (─ ╱ ╲ │), a comparison series with dots (·),
  reference levels with a dashed row (╌). Labels sit in the same monospace grid.
*/

const FONT = 11;
const CH = 14;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
const resolve = c => (c && c.startsWith('var(') ? cssVar(c.slice(4, -1)) : c);

const tickFormat = period => t => {
  const d = new Date(t);
  if (period === '1D') return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (period === '1W') return d.toLocaleDateString('en-IN', { weekday: 'short' });
  if (period === '1Y' || period === 'YTD') return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
export const longDate = (period, t) => {
  const d = new Date(t);
  return period === '1D' || period === '1W'
    ? d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function useCellWidth() {
  const [cw, setCw] = useState(6.6);
  useEffect(() => {
    const measure = () => {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${FONT}px "Geist Mono Variable", ui-monospace, monospace`;
      setCw(ctx.measureText('0').width || 6.6);
    };
    measure();
    document.fonts?.ready.then(measure);
  }, []);
  return cw;
}

/*
  lines: [{ data, color, style: 'line' | 'dots' }]  (the first line is the main one)
  reference: { value, label }  optional level drawn as a dashed row
  tooltip: index -> node, index into the main line's original data
*/
export function GlyphChart({ lines, times, period = '1M', height = 230, formatY = v => v.toFixed(0), reference, tooltip }) {
  const [box, width] = useWidth();
  const canvas = useRef(null);
  const cw = useCellWidth();
  const [hover, setHover] = useState(null);
  const [reveal, setReveal] = useState(0);
  const main = lines[0].data;
  const key = `${period}:${main.length}:${main[0]}:${main[main.length - 1]}`;

  /* draw-in: columns appear left to right, once per new series */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setReveal(1); return; }
    setReveal(0);
    const t0 = performance.now();
    let id;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 700);
      setReveal(p);
      if (p < 1) id = setTimeout(step, 30);
    };
    id = setTimeout(step, 30);
    return () => clearTimeout(id);
  }, [key]);

  const labelCols = 10;
  const cols = Math.max(10, Math.floor(width / cw) - labelCols);
  const rows = Math.max(4, Math.floor(height / CH) - 1);
  const series = lines.map(l => ({ ...l, pts: resample(l.data, cols) }));
  const vals = series.flatMap(s => s.pts).concat(reference ? [reference.value] : []);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.06 || Math.abs(max) * 0.01 || 1;
  min -= pad; max += pad;
  const rowOf = v => ((max - v) / (max - min)) * (rows - 1);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = width * dpr; el.height = height * dpr;
    el.style.width = width + 'px'; el.style.height = height + 'px';
    const ctx = el.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = `${FONT}px "Geist Mono Variable", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    const put = (ch, c, r, color, alpha = 1) => { ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillText(ch, c * cw, r * CH); };
    const faint = cssVar('--line-2'), dim = cssVar('--text-3');
    const shown = Math.ceil(cols * reveal);
    const taken = new Set();

    if (reference) {
      const r = Math.round(rowOf(reference.value));
      for (let c = 0; c < cols; c++) put('╌', c, r, dim, 0.7);
    }

    /* braille plotting: every cell is a 2 x 4 grid of dots, so lines stay smooth but remain text */
    const BIT = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
    const cells = new Map(); // "c:r" -> { bits, color, main }
    const plot = (x, y, color, isMain) => {
      const c = Math.floor(x / 2), r = Math.floor(y / 4);
      if (c < 0 || r < 0 || c >= shown || r >= rows) return;
      const k = c + ':' + r;
      const cell = cells.get(k) || { bits: 0, color, main: false };
      cell.bits |= BIT[y % 4][x % 2];
      if (isMain) { cell.color = color; cell.main = true; }
      cells.set(k, cell);
    };
    /* draw comparison series first, so the main line wins shared cells */
    [...series].reverse().forEach(s => {
      const isMain = s === series[0];
      const col = resolve(s.color) || cssVar('--text');
      const pts = resample(s.data, cols * 2);
      const yOf = v => Math.round(((max - v) / (max - min)) * (rows * 4 - 1));
      let prev = null;
      pts.forEach((v, x) => {
        const y = yOf(v);
        if (s.style === 'dots') { if (x % 3 === 0) plot(x, y, col, false); return; }
        if (prev != null) for (let k = Math.min(prev, y); k <= Math.max(prev, y); k++) plot(x, k, col, isMain);
        else plot(x, y, col, isMain);
        prev = y;
      });
    });
    /* each set bit becomes a small square dot at its sub-cell position: the braille grid,
       drawn directly so it stays crisp in any font */
    const dot = Math.max(1.4, Math.min(cw / 2, CH / 4) * 0.62);
    cells.forEach((cell, k) => {
      const [c, r] = k.split(':').map(Number);
      ctx.globalAlpha = cell.main ? 1 : 0.8;
      ctx.fillStyle = cell.color;
      BIT.forEach((row, yy) => row.forEach((b, xx) => {
        if (cell.bits & b) ctx.fillRect(c * cw + (xx + 0.5) * (cw / 2) - dot / 2, r * CH + (yy + 0.5) * (CH / 4) - dot / 2, dot, dot);
      }));
      taken.add(k);
    });

    [0, Math.floor((rows - 1) / 2), rows - 1].forEach(r => {
      put(formatY(max - (r / (rows - 1)) * (max - min)).padStart(9), cols, r, dim);
    });
    if (reference) put(` ${reference.label}`, cols, Math.round(rowOf(reference.value)), cssVar('--text-2'));

    if (times && times.length > 1) {
      const fmt = tickFormat(period);
      const labels = [0, 0.5, 1].map(f => fmt(times[Math.round(f * (times.length - 1))]));
      put(labels[0], 0, rows, dim);
      put(labels[1], Math.floor(cols / 2 - labels[1].length / 2), rows, dim);
      put(labels[2], cols - labels[2].length, rows, dim);
    }

    if (hover != null) {
      for (let r = 0; r < rows; r++) if (!taken.has(hover + ':' + r)) put('┊', hover, r, dim, 0.7);
      put('█', hover, Math.round(rowOf(series[0].pts[hover])), resolve(series[0].color) || cssVar('--text'));
    }
    ctx.globalAlpha = 1;
    // everything drawn is derived from these inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, key, reveal, hover, cw, reference?.value]);

  const onMove = e => {
    const c = Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / cw);
    setHover(c >= 0 && c < cols ? c : null);
  };
  const dataIndex = hover == null ? null : Math.round((hover / (cols - 1)) * (main.length - 1));

  return (
    <div ref={box} className="relative w-full select-none touch-pan-y" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <canvas ref={canvas} className="absolute inset-0" aria-hidden="true" />
      {hover != null && tooltip && (
        <div className="absolute top-0 z-10 pointer-events-none bg-bg border border-line-2 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: hover * cw, transform: hover > cols * 0.6 ? 'translateX(calc(-100% - 10px))' : 'translateX(14px)' }}>
          {tooltip(dataIndex)}
        </div>
      )}
    </div>
  );
}

/* net FII and DII per day as glyph columns: buying above the line, selling below.
   FII is drawn with █ and DII with ▒, so the two read apart without extra colours. */
export function FlowColumns({ history, height = 154 }) {
  const [box, width] = useWidth();
  const canvas = useRef(null);
  const cw = useCellWidth();
  const [hover, setHover] = useState(null);
  const n = history.length;
  const slot = Math.max(3, Math.floor(width / cw / n));

  useEffect(() => {
    const el = canvas.current;
    if (!el || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = width * dpr; el.height = height * dpr;
    el.style.width = width + 'px'; el.style.height = height + 'px';
    const ctx = el.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = `${FONT}px "Geist Mono Variable", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    const rows = Math.floor(height / CH) - 1;
    const mid = Math.floor(rows / 2);
    const maxAbs = Math.max(...history.flatMap(d => [Math.abs(d.fii.net), Math.abs(d.dii.net)]), 1);
    const put = (ch, c, r, color, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillText(ch, c * cw, r * CH); };
    const up = cssVar('--up'), down = cssVar('--down'), dim = cssVar('--text-3'), faint = cssVar('--line-2');
    for (let c = 0; c < Math.floor(width / cw); c++) put('┈', c, mid, faint);
    history.forEach((d, i) => {
      const a = hover == null || hover === i ? 1 : 0.3;
      [[d.fii.net, '█', 0], [d.dii.net, '▒', 1]].forEach(([v, g, off]) => {
        const h = Math.max(1, Math.round((Math.abs(v) / maxAbs) * mid));
        for (let k = 1; k <= h; k++) put(g, i * slot + off, v >= 0 ? mid - k : mid + k, v >= 0 ? up : down, a);
      });
    });
    const f = x => x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const last = f(history[n - 1].date);
    put(f(history[0].date), 0, rows, dim);
    put(last, Math.max(0, (n - 1) * slot + 2 - last.length), rows, dim);
    ctx.globalAlpha = 1;
  }, [width, height, history, hover, n, cw, slot]);

  const cr = v => (v >= 0 ? '+' : '−') + '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN') + ' cr';
  return (
    <div ref={box} className="relative w-full select-none touch-pan-y" style={{ height }}
      onPointerMove={e => {
        const i = Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / (slot * cw));
        setHover(i >= 0 && i < n ? i : null);
      }}
      onPointerLeave={() => setHover(null)}>
      <canvas ref={canvas} className="absolute inset-0" aria-hidden="true" />
      {hover != null && (
        <div className="absolute top-0 right-0 z-10 pointer-events-none bg-bg border border-line-2 px-2.5 py-1.5 whitespace-nowrap">
          <p className="label">{history[hover].date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p>█ Foreign <span style={{ color: history[hover].fii.net >= 0 ? 'var(--up)' : 'var(--down)' }}>{cr(history[hover].fii.net)}</span></p>
          <p>▒ Domestic <span style={{ color: history[hover].dii.net >= 0 ? 'var(--up)' : 'var(--down)' }}>{cr(history[hover].dii.net)}</span></p>
        </div>
      )}
    </div>
  );
}
