import { useEffect, useState } from 'react';

/* hash routes: #/today, #/holdings, #/holdings/:id, #/tax, #/market */
const parse = () => {
  const path = window.location.hash.replace(/^#/, '') || '/today';
  const [, section = 'today', id = null] = path.split('/');
  return { section, id, path };
};

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const navigate = to => { window.location.hash = to; };
export const href = to => '#' + to;
