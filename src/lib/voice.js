import { fmtINR } from './format';

/*
  Holdr's voice: a calm friend who knows markets. Short, plain, a little dry.
  States facts first, then one opinion at most. Never cheers losses or panics on red.
*/

/* one line under the day's headline, about you rather than the market */
export function dayTake({ kind, state, dayMove }) {
  if (state === 'loading') return '';
  if (state === 'offline') return 'Your holdings still add up. The animal comes back with the data.';
  if (dayMove == null) return 'Your own prices haven’t arrived yet.';
  const amt = fmtINR(Math.abs(Math.round(dayMove)));
  const up = dayMove >= 0;
  if (kind === 'bull') return up ? `You’re up ${amt} with it. Enjoy the day, don’t chase it.` : `You’re down ${amt} on a green day. Worth seeing what’s lagging.`;
  if (kind === 'bear') return up ? `You’re up ${amt} anyway. The bear didn’t find you.` : `You’re down ${amt}. Red days test your reasons more than your returns.`;
  return Math.abs(dayMove) < 1 ? 'Nothing moved, you included. Nothing needs doing.' : `You’re ${up ? 'up' : 'down'} ${amt}. Small moves, nothing to act on.`;
}

export const GROUP_LABEL = {
  review: 'Needs a second look',
  watch: 'Keep an eye on',
  hold: 'Doing their job',
};
