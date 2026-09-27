import { Component, useEffect } from 'react';
import { fmtPct, toneColor } from '../lib/format';
import { fmtTime } from '../lib/dates';

/* signed change with its direction glyph: ▲ +1.2%  ▼ −0.6% */
export function Change({ value, digits = 1, className = '', glyph = true }) {
  if (value == null) return <span className={`text-ink-3 ${className}`}>n/a</span>;
  return (
    <span className={`whitespace-nowrap ${className}`} style={{ color: toneColor(value) }}>
      {glyph && (value > 0 ? '▲ ' : value < 0 ? '▼ ' : '')}{fmtPct(value, digits)}
    </span>
  );
}

/* a frame with its title set into the top border */
export function Panel({ title, aside, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <div className="panel-head">
          {title ? <h2 className="label !text-ink-2">{title}</h2> : <span />}
          {aside ? <span className="label">{aside}</span> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tabs({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="tabs">
      {options.map(o => {
        const [key, text] = Array.isArray(o) ? o : [o, o];
        return (
          <button key={key} role="radio" aria-checked={key === value} onClick={() => onChange(key)} className="tab">
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function Button({ children, solid = false, className = '', ...rest }) {
  return <button className={`btn ${solid ? 'btn-solid' : ''} ${className}`} {...rest}>{children}</button>;
}

/* ---------------------------- glyph drawing ---------------------------- */
const BLOCKS = '▁▂▃▄▅▆▇█';
const PARTIAL = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

/* sparkline from block characters */
export function Spark({ data, width = 14, className = '' }) {
  if (!data || data.length < 2) return <span className={`text-ink-3 ${className}`}>{'·'.repeat(width)}</span>;
  const pts = Array.from({ length: width }, (_, i) => data[Math.round((i / (width - 1)) * (data.length - 1))]);
  const min = Math.min(...pts), max = Math.max(...pts), r = max - min || 1;
  const line = pts.map(v => BLOCKS[Math.round(((v - min) / r) * (BLOCKS.length - 1))]).join('');
  return <span aria-hidden="true" className={`whitespace-pre ${className}`}>{line}</span>;
}

/* horizontal bar made of full and partial blocks, on a dotted track */
export function Bar({ value, max, width = 20, color = 'var(--text-2)', className = '' }) {
  const cells = Math.max(0, Math.min(1, max ? value / max : 0)) * width;
  const full = Math.floor(cells);
  const rest = PARTIAL[Math.round((cells - full) * 7)] || '';
  return (
    <span aria-hidden="true" className={`whitespace-pre ${className}`}>
      <span style={{ color }}>{'█'.repeat(full)}{rest}</span>
      <span className="text-line-2">{'·'.repeat(Math.max(0, width - full - (rest ? 1 : 0)))}</span>
    </span>
  );
}

/* bar either side of a centre line: losses grow left, gains grow right */
export function SplitBar({ value, max, half = 12 }) {
  const n = Math.max(value ? 1 : 0, Math.round(Math.min(1, Math.abs(value) / (max || 1)) * half));
  const left = value < 0 ? '·'.repeat(half - n) + '█'.repeat(n) : '·'.repeat(half);
  const right = value > 0 ? '█'.repeat(n) + '·'.repeat(half - n) : '·'.repeat(half);
  const paint = (s, c) => s.split(/(█+)/).filter(Boolean).map((p, i) => (
    <span key={i} style={{ color: p[0] === '█' ? c : 'var(--line-2)' }}>{p}</span>
  ));
  return (
    <span aria-hidden="true" className="whitespace-pre">
      {paint(left, 'var(--down)')}
      <span className="text-ink-3">│</span>
      {paint(right, 'var(--up)')}
    </span>
  );
}

export function Loading({ text = 'Loading', className = '' }) {
  return <p className={`loading-glyphs ${className}`}>░░░ {text}</p>;
}

/* where a number comes from, in plain words */
export function SourceStamp({ source, at, className = '' }) {
  const label = source === 'upstox' ? 'Live, Upstox'
    : source === 'yahoo' ? 'Delayed, Yahoo'
      : source === 'file' ? 'From your file'
        : source === 'sample' ? 'Sample data'
          : 'Unavailable';
  return (
    <span className={`label ${className}`}>
      {label}{at && (source === 'upstox' || source === 'yahoo') ? ` ${fmtTime(at)}` : ''}
    </span>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="flex flex-col items-start gap-2 py-2">
      <p className="text-ink">{title}</p>
      {body && <p className="text-ink-2 max-w-[56ch]">{body}</p>}
      {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/* bottom sheet on phones, framed dialog on larger screens */
export function Sheet({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-[12vh] justify-center bg-black/75" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        className="view-enter w-full bg-bg border border-line-2 max-h-[88dvh] overflow-y-auto" style={{ maxWidth: width }}>
        <div className="sticky top-0 bg-bg flex items-center justify-between px-5 h-12 border-b border-line">
          <h2 className="label !text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="tab">[esc]</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-md py-24">
        <p className="text-down">ERR  This screen tripped over something.</p>
        <p className="text-ink-2 mt-2">Your holdings are safe. A reload usually sorts it.</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }
}
