import { daysUntil, fmtDay } from './dates';
import { fmtINR } from './format';

/*
  Turns portfolio state into a short list of things worth your time, most serious first.
  Every item says why it's here and where to act.
*/
export function attentionItems(rows) {
  const items = [];

  rows.forEach(r => {
    if (r.thesisStatus === 'broken') {
      items.push({ key: `thesis-${r.id}`, tone: 'down', rank: 0, holding: r,
        title: `${r.symbol}: your reason for owning it no longer holds`,
        body: r.thesis || 'You marked this thesis as broken.',
        action: 'Review', to: `/holdings/${r.id}` });
    } else if (r.thesisStatus === 'shaky' && r.verdict === 'review') {
      items.push({ key: `thesis-${r.id}`, tone: 'warn', rank: 1, holding: r,
        title: `${r.symbol} is wobbling against your thesis`,
        body: r.thesis,
        action: 'Review', to: `/holdings/${r.id}` });
    }

    if (!r.tax.isLT && r.tax.waitSaving > 0 && r.tax.daysToLT <= 75) {
      items.push({ key: `tax-${r.id}`, tone: 'accent', rank: 2, holding: r,
        title: `Hold ${r.symbol} ${r.tax.daysToLT} more days to pay less tax`,
        body: `On ${fmtDay(r.tax.ltDate)} its gain turns long-term. Selling after that saves about ${fmtINR(Math.round(r.tax.waitSaving))} at today's price.`,
        action: 'See tax', to: '/tax' });
    }

    (r.events || []).forEach(e => {
      const d = daysUntil(e.date);
      if (d < 0 || d > 14) return;
      const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : `on ${fmtDay(e.date)}`;
      const body = e.type === 'dividend'
        ? 'Hold it through that date to receive the dividend.'
        : e.type === 'earnings'
          ? 'Results can move the price sharply in either direction.'
          : e.type === 'risk'
            ? 'Early investors can sell after this date, which often weighs on price.'
            : 'A company event that may matter to your thesis.';
      items.push({ key: `event-${r.id}-${e.label}`, tone: e.type === 'risk' ? 'warn' : 'neutral', rank: 3, holding: r,
        title: `${r.symbol}: ${e.label} ${when}`, body, action: 'Open', to: `/holdings/${r.id}` });
    });

    if (r.weight > 30 && rows.length > 2) {
      items.push({ key: `weight-${r.id}`, tone: 'warn', rank: 4, holding: r,
        title: `${r.symbol} is ${Math.round(r.weight)}% of your portfolio`,
        body: 'One stock this large means a single bad quarter can move your whole portfolio.',
        action: 'Open', to: `/holdings/${r.id}` });
    }
  });

  return items.sort((a, b) => a.rank - b.rank);
}
