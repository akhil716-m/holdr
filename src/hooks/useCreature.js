import { useHoldr } from '../state';

/* which animal the day gets: from real index data, or a preview the user chose */
export function useCreature() {
  const { mood, nifty, market, moodPreview } = useHoldr();
  if (moodPreview) return { kind: moodPreview === 'flat' ? 'crab' : moodPreview, state: 'preview' };
  if (market.niftyStatus === 'loading') return { kind: 'crab', state: 'loading' };
  if (nifty.sample) return { kind: 'quiet', state: 'offline' };
  return { kind: mood === 'flat' ? 'crab' : mood, state: 'live' };
}
