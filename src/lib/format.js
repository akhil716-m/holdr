const MINUS = '−';

export const fmtINR = (n, digits = 0) =>
  (n < 0 ? MINUS : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const fmtSignedINR = n => (n > 0 ? '+' : n < 0 ? MINUS : '') + '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');

export const fmtPct = (v, digits = 1, signed = true) => {
  if (v == null || Number.isNaN(v)) return '';
  const sign = v > 0 ? (signed ? '+' : '') : v < 0 ? MINUS : '';
  return sign + Math.abs(v).toFixed(digits) + '%';
};

export const fmtNum = (n, digits = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

/* Indian short units: ₹2.1L, ₹1.4Cr */
export function fmtCompactINR(n) {
  const a = Math.abs(n);
  const sign = n < 0 ? MINUS : '';
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(1)}k`;
  return `${sign}₹${Math.round(a)}`;
}

export const toneOf = v => (v == null ? 'flat' : v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
export const toneColor = v => (v == null || v === 0 ? 'var(--text-2)' : v > 0 ? 'var(--up)' : 'var(--down)');
