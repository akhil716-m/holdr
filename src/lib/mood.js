/* the day's market mood, from NIFTY 50's day change */
export function moodFrom(dayChg) {
  if (dayChg == null) return 'flat';
  if (dayChg >= 0.25) return 'bull';
  if (dayChg <= -0.25) return 'bear';
  return 'flat';
}

export const MOOD_COPY = {
  bull: { name: 'Bull day', line: 'Buyers are in control.' },
  bear: { name: 'Bear day', line: 'Sellers have the upper hand.' },
  flat: { name: 'Sideways day', line: 'Neither side is pushing hard.' },
};
