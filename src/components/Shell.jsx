import { useEffect, useRef, useState } from 'react';
import { useHoldr } from '../state';
import { href } from '../hooks/useRoute';
import { Button, Change, Tabs } from './ui';
import { useCreature } from '../hooks/useCreature';

export const TABS = [
  ['today', 'Today'],
  ['holdings', 'Holdings'],
  ['tax', 'Tax'],
  ['market', 'Market'],
];

const ANIMAL = { bull: 'BULL', bear: 'BEAR', crab: 'CRAB', quiet: 'QUIET' };

/* the day's animal and NIFTY's move, as a line of tape */
function MoodTicker() {
  const { nifty } = useHoldr();
  const { kind, state } = useCreature();
  const known = state === 'live' || state === 'preview';
  return (
    <a href={href('/market')} className="hidden sm:flex items-center gap-2 h-8 px-2.5 border border-line hover:border-line-2 text-[12px]"
      aria-label={`Market mood ${ANIMAL[kind]}. NIFTY 50 ${known ? nifty.dayChg.toFixed(2) + ' percent' : 'unavailable'}`}>
      <span className="text-mood">{state === 'loading' ? '░░░░' : ANIMAL[kind]}</span>
      <span className="text-ink-3">NIFTY</span>
      {known ? <Change value={nifty.dayChg} digits={2} /> : <span className="text-ink-3">{state === 'loading' ? '...' : 'offline'}</span>}
    </a>
  );
}

function Menu() {
  const s = useHoldr();
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) { setNaming(false); setConfirmClear(false); return; }
    const onDown = e => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = e => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const who = s.mode === 'sample' ? 'sample' : s.profile === 'You' ? 'mine' : s.profile.toLowerCase();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Portfolio and profile settings"
        className={`h-8 px-2.5 border text-[12px] ${open ? 'bg-ink text-bg border-ink' : 'border-line hover:border-line-2'}`}>
        {who} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="view-enter absolute right-0 top-[calc(100%+6px)] z-40 w-[300px] max-w-[calc(100vw-32px)] bg-bg border border-line-2 p-4 flex flex-col gap-4">
          <div>
            <p className="label mb-1.5">Portfolio</p>
            <Tabs label="Portfolio" value={s.mode} onChange={m => s.setMode(m)} options={[['sample', 'Sample'], ['mine', 'Mine']]} />
            {s.mode === 'mine' && !s.hasMine && <p className="text-ink-3 mt-2 text-[12px]">Nothing imported yet for {s.profile}.</p>}
          </div>

          <div className="rule" />
          <div>
            <p className="label mb-1">Profile</p>
            <ul>
              {s.profiles.map(p => (
                <li key={p}>
                  <button onClick={() => s.switchProfile(p)} className="row w-full flex justify-between px-1.5 -mx-1.5 h-7 text-left">
                    <span>{p}</span>{p === s.profile && <span className="text-ink-3">●</span>}
                  </button>
                </li>
              ))}
            </ul>
            {naming ? (
              <form className="flex gap-2 mt-1" onSubmit={e => { e.preventDefault(); s.addProfile(name); setName(''); setNaming(false); }}>
                <label className="sr-only" htmlFor="profile-name">Profile name</label>
                <input id="profile-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="name"
                  className="flex-1 h-8 px-2 bg-transparent border border-line-2 text-ink placeholder:text-ink-3 outline-none focus:border-ink" />
                <Button type="submit" disabled={!name.trim()}>Add</Button>
              </form>
            ) : (
              <button onClick={() => setNaming(true)} className="row w-full text-left px-1.5 -mx-1.5 h-7 text-ink-2">+ New profile</button>
            )}
          </div>

          <div className="rule" />
          <div>
            <p className="label mb-1.5">Market mood</p>
            <Tabs label="Preview market mood" value={s.moodPreview || 'live'} onChange={v => s.setMoodPreview(v === 'live' ? null : v)}
              options={[['live', 'Live'], ['bull', 'Bull'], ['bear', 'Bear'], ['flat', 'Crab']]} />
            <p className="text-ink-3 mt-2 text-[12px]">{s.moodPreview ? 'Previewing. Switch back to Live to follow NIFTY.' : 'Follows NIFTY 50 through the day.'}</p>
          </div>

          <div className="rule" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setOpen(false); s.openAdd(); }}>Import holdings</Button>
            {s.hasMine && (confirmClear
              ? <Button className="!text-down" onClick={() => { s.clearMine(); setOpen(false); }}>Confirm clear</Button>
              : <Button onClick={() => setConfirmClear(true)}>Clear mine</Button>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopBar({ section }) {
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-sm border-b border-line">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-12 flex items-center gap-6">
        <a href={href('/today')} className="font-semibold tracking-[0.12em] text-[13px]">HOLDR</a>
        <nav className="hidden md:flex tabs" aria-label="Main">
          {TABS.map(([key, label]) => (
            <a key={key} href={href('/' + key)} aria-current={section === key ? 'page' : undefined} className="tab">{label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <MoodTicker />
          <Menu />
        </div>
      </div>
    </header>
  );
}

export function BottomBar({ section }) {
  return (
    <nav aria-label="Main" className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-4">
        {TABS.map(([key, label]) => {
          const on = section === key;
          return (
            <a key={key} href={href('/' + key)} aria-current={on ? 'page' : undefined}
              className={`h-12 flex items-center justify-center text-[11px] uppercase tracking-[0.06em] ${on ? 'bg-ink text-bg' : 'text-ink-3'}`}>
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function Toast() {
  const { toast } = useHoldr();
  if (!toast) return null;
  return (
    <div role="status" className="view-enter fixed z-50 left-1/2 -translate-x-1/2 bottom-16 md:bottom-8 px-3 h-9 flex items-center bg-ink text-bg text-[12px] whitespace-nowrap">
      &gt; {toast}
    </div>
  );
}
