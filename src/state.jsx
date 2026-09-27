import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SAMPLE_HOLDINGS } from './data/sample';
import { readJSON, readString, write } from './lib/storage';
import { useMarket } from './hooks/useMarket';
import { buildPortfolio, niftyForPeriod } from './lib/portfolio';
import { moodFrom } from './lib/mood';
import { makeHolding } from './lib/importer';

const Ctx = createContext(null);
export const useHoldr = () => useContext(Ctx);

const holdingsKey = profile => `holdr-v2-holdings-${profile}`;

/* carry over holdings imported in version 1 so nobody loses their portfolio */
function loadMine(profile) {
  const v2 = readJSON(holdingsKey(profile), null);
  if (v2) return v2;
  const v1 = readJSON(`holdr-live-${profile}`, []);
  return v1.map(h => ({
    ...makeHolding({ symbol: h.symbol, name: h.name, qty: h.qty, avgPrice: h.avgPrice, ltp: h.ltp, buyDate: h.buyDate }),
    id: h.id,
    thesis: h.thesis && !/^(Imported|Add a note)/.test(h.thesis) ? h.thesis : '',
  }));
}

function initialPreview() {
  try {
    const m = new URLSearchParams(window.location.search).get('mood');
    return ['bull', 'bear', 'flat'].includes(m) ? m : null;
  } catch {
    return null;
  }
}

export function HoldrProvider({ children }) {
  const [mode, setModeState] = useState(() => readString('holdr-v2-mode', 'sample'));
  const [profile, setProfile] = useState(() => readString('holdr-profile', 'You'));
  const [profiles, setProfiles] = useState(() => readJSON('holdr-profiles', ['You']));
  const [mine, setMine] = useState(() => loadMine(readString('holdr-profile', 'You')));
  const [sample, setSample] = useState(SAMPLE_HOLDINGS);
  const [period, setPeriod] = useState('1Y');
  const [moodPreview, setMoodPreview] = useState(initialPreview);
  const [toast, setToast] = useState(null);
  const [adding, setAdding] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => { write('holdr-v2-mode', mode); }, [mode]);
  useEffect(() => { write('holdr-profile', profile); }, [profile]);
  useEffect(() => { write('holdr-profiles', profiles); }, [profiles]);
  useEffect(() => { write(holdingsKey(profile), mine); }, [mine, profile]);

  const holdings = mode === 'sample' ? sample : mine;
  const setHoldings = mode === 'sample' ? setSample : setMine;

  const flash = useCallback(msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const symbols = useMemo(() => (mode === 'mine' ? mine.map(h => h.symbol) : []), [mode, mine]);
  const market = useMarket({ period, symbols });

  const nifty = useMemo(() => niftyForPeriod(market.nifty, period), [market.nifty, period]);
  const portfolio = useMemo(
    () => buildPortfolio(holdings, { mode, quotes: market.quotes, period, nifty }),
    [holdings, mode, market.quotes, period, nifty],
  );

  /* hold the mood neutral until we know the real one, so the page never flashes the wrong colour */
  /* the mood only ever comes from real index data: neutral while loading or when NIFTY can't be reached */
  const liveMood = market.niftyStatus === 'live' ? moodFrom(nifty.dayChg) : 'flat';
  const mood = moodPreview || liveMood;
  useEffect(() => { document.documentElement.dataset.mood = mood; }, [mood]);

  const actions = useMemo(() => ({
    setMode: m => {
      setModeState(m);
      flash(m === 'sample' ? 'Showing the sample portfolio' : `Showing ${profile === 'You' ? 'your' : `${profile}'s`} portfolio`);
    },
    setPeriod,
    setMoodPreview,
    openAdd: () => setAdding(true),
    closeAdd: () => setAdding(false),
    addHoldings: list => {
      const incoming = Array.isArray(list) ? list : [list];
      let added = 0;
      setMine(prev => {
        const next = [...prev];
        incoming.forEach(h => {
          const i = next.findIndex(x => x.id === h.id);
          if (i === -1) { next.push(h); added++; } else next[i] = { ...next[i], qty: h.qty, avgPrice: h.avgPrice, ltp: h.ltp };
        });
        return next;
      });
      setModeState('mine');
      flash(incoming.length === 1 ? `${incoming[0].symbol} added` : `Imported ${incoming.length} holdings`);
      return added;
    },
    updateHolding: (id, patch) => setHoldings(prev => prev.map(h => (h.id === id ? { ...h, ...patch } : h))),
    removeHolding: id => {
      setMine(prev => prev.filter(h => h.id !== id));
      flash('Removed from your portfolio');
    },
    switchProfile: name => {
      setProfile(name);
      setMine(loadMine(name));
    },
    addProfile: name => {
      const clean = name.trim();
      if (!clean || profiles.includes(clean)) return;
      setProfiles(p => [...p, clean]);
      setProfile(clean);
      setMine(loadMine(clean));
      setModeState('mine');
    },
    clearMine: () => { setMine([]); flash('Cleared your holdings'); },
    flash,
  }), [flash, setHoldings, profile, profiles]);

  const value = {
    mode, profile, profiles, period, mood, liveMood, moodPreview, market, nifty, portfolio,
    holdings, hasMine: mine.length > 0, toast, adding, ...actions,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
