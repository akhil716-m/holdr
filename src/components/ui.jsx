import { Component, useEffect } from 'react';
import { XIcon } from '@phosphor-icons/react';
import { fmtPct, toneColor } from '../lib/format';
import { fmtTime } from '../lib/dates';

/* neutral monogram: stock identity without borrowing the gain/loss colours */
export function Mark({ symbol, size = 32 }) {
  const letters = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 2);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 font-medium text-ink-2 bg-surface-3"
      style={{ width: size, height: size, fontSize: size * 0.34, letterSpacing: '0.02em' }}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}

/* signed percentage in the gain/loss colour */
export function Change({ value, digits = 1, className = '' }) {
  if (value == null) return <span className={`num text-ink-3 ${className}`}>n/a</span>;
  return <span className={`num ${className}`} style={{ color: toneColor(value) }}>{fmtPct(value, digits)}</span>;
}

export function Segmented({ options, value, onChange, size = 'md', label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center rounded-full bg-surface-2 border border-line p-[3px]">
      {options.map(o => {
        const [key, text] = Array.isArray(o) ? o : [o, o];
        const on = key === value;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(key)}
            className={`press rounded-full font-medium num ${size === 'sm' ? 'px-2.5 h-7 text-[12px]' : 'px-3.5 h-8 text-[13px]'} ${on ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink-2'}`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...rest }) {
  const styles = {
    primary: 'bg-ink text-bg hover:bg-white',
    secondary: 'bg-surface-2 text-ink border border-line-strong hover:bg-surface-3',
    ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
    danger: 'text-down hover:bg-surface-2',
  };
  return (
    <button
      className={`press inline-flex items-center justify-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-medium whitespace-nowrap disabled:opacity-35 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/* where a number comes from, in plain words */
export function SourceStamp({ source, at, className = '' }) {
  const label = source === 'upstox' ? 'Live from Upstox'
    : source === 'yahoo' ? 'Delayed from Yahoo'
      : source === 'file' ? 'Price from your file'
        : source === 'sample' ? 'Sample data'
          : 'Unavailable';
  return (
    <span className={`text-[12px] text-ink-3 ${className}`}>
      {label}{at && (source === 'upstox' || source === 'yahoo') ? `, ${fmtTime(at)}` : ''}
    </span>
  );
}

export function SectionHead({ title, aside, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <h2 className="text-[15px] font-medium tracking-tight">{title}</h2>
      {aside && <div className="text-[12px] text-ink-3 text-right">{aside}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="flex flex-col items-start gap-2 py-8">
      <p className="text-[14px] font-medium">{title}</p>
      {body && <p className="text-[13px] text-ink-2 max-w-[46ch] leading-relaxed">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* bottom sheet on phones, centred dialog on larger screens */
export function Sheet({ title, onClose, children, width = 460 }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-[12vh] justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="view-enter w-full bg-surface border border-line-strong rounded-t-2xl sm:rounded-2xl max-h-[88dvh] overflow-y-auto"
        style={{ maxWidth: width }}
      >
        <div className="sticky top-0 bg-surface flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[16px] font-medium tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="press w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-2">
            <XIcon size={16} />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
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
      <div className="max-w-md mx-auto px-4 py-24">
        <p className="text-[16px] font-medium">This screen tripped over something.</p>
        <p className="text-[13px] text-ink-2 mt-2">Your holdings are safe. A reload usually sorts it.</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }
}
