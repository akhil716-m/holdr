import { useEffect, useState } from 'react';
import { fetchFlows, fetchMacro, fetchNifty, fetchQuote, mapLimit } from '../lib/market';

const MACRO_IDS = ['gold', 'silver', 'crude', 'vix'];

/*
  Loads NIFTY and macro and FII/DII (always) and quotes for your own holdings (only in
  "mine" mode), refreshing every two minutes. Each part lands as soon as it arrives and
  carries its own status, so the page fills in progressively instead of waiting on the slowest source.
*/
export function useMarket({ period, symbols }) {
  const [state, setState] = useState({
    status: 'loading', niftyStatus: 'loading', quotesStatus: 'loading',
    nifty: null, quotes: {}, macro: {}, flows: null, inr: null, updated: null, source: null,
  });
  const key = symbols.join(',');

  useEffect(() => {
    let cancelled = false;
    const patch = p => !cancelled && setState(s => ({ ...s, ...p }));
    setState(s => ({ ...s, status: 'loading', niftyStatus: s.nifty ? s.niftyStatus : 'loading', quotesStatus: 'loading' }));

    async function load() {
      const niftyP = fetchNifty(period).then(nifty => {
        patch({ nifty, niftyStatus: nifty ? 'live' : 'unavailable', ...(nifty ? { source: nifty.src, updated: new Date() } : {}) });
        return nifty;
      });

      const quotesP = mapLimit(symbols, 4, s => fetchQuote(s, period)).then(res => {
        const quotes = {};
        symbols.forEach((s, i) => { if (res[i]) quotes[s] = res[i]; });
        const n = Object.keys(quotes).length;
        patch({ quotes, quotesStatus: !symbols.length ? 'idle' : n ? 'live' : 'unavailable', ...(n ? { updated: new Date() } : {}) });
        return n;
      });

      fetchMacro('usdinr', '1M', 1).then(async usd => {
        const inr = usd?.price || 83.4;
        patch({ inr, macro: { usdinr: usd } });
        const res = await mapLimit(MACRO_IDS, 2, id => fetchMacro(id, '1M', inr));
        const macro = { usdinr: usd };
        MACRO_IDS.forEach((id, i) => { macro[id] = res[i]; });
        patch({ macro });
      });

      fetchFlows().then(flows => patch({ flows }));

      const [nifty, n] = await Promise.all([niftyP, quotesP]);
      patch({ status: nifty || n ? 'live' : 'offline' });
    }

    load();
    const iv = setInterval(load, 120000);
    return () => { cancelled = true; clearInterval(iv); };
    // symbols is represented by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, key]);

  return state;
}
