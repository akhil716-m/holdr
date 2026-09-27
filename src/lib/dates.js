export const DAY = 86400000;

export const now = () => new Date();

export const isoDaysAgo = n => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
export const isoDaysAhead = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
export const daysUntil = iso => Math.ceil((new Date(iso) - startOfToday()) / DAY);

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const fmtDay = (d, opts = {}) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...opts });
export const fmtTime = d => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/* NSE cash session, 9:15 to 15:30 IST, Monday to Friday (exchange holidays not modelled) */
export function marketSession(at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(at).map(p => [p.type, p.value]),
  );
  const mins = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  const weekend = parts.weekday === 'Sat' || parts.weekday === 'Sun';
  if (weekend) return { open: false, label: 'Market closed for the weekend' };
  if (mins < 9 * 60 + 15) return { open: false, label: 'Market opens at 9:15' };
  if (mins > 15 * 60 + 30) return { open: false, label: 'Market closed for the day' };
  return { open: true, label: 'Market open' };
}

export function greeting(at = new Date()) {
  const h = at.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* Indian financial year: 1 Apr to 31 Mar */
export function financialYear(at = new Date()) {
  const y = at.getMonth() >= 3 ? at.getFullYear() : at.getFullYear() - 1;
  return { label: `FY ${y}-${String(y + 1).slice(2)}`, start: new Date(y, 3, 1), end: new Date(y + 1, 2, 31) };
}
