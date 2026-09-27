import { useEffect, useRef, useState } from 'react';
import { HouseIcon, StackIcon, ReceiptIcon, GlobeHemisphereEastIcon, PlusIcon, CheckIcon } from '@phosphor-icons/react';
import { useHoldr } from '../state';
import { href } from '../hooks/useRoute';
import MoodMark from './MoodMark';
import { Change, Segmented, Button } from './ui';
import { MOOD_COPY } from '../lib/mood';

export const TABS = [
  ['today', 'Today', HouseIcon],
  ['holdings', 'Holdings', StackIcon],
  ['tax', 'Tax', ReceiptIcon],
  ['market', 'Market', GlobeHemisphereEastIcon],
];

function MoodChip() {
  const { mood, nifty, market, moodPreview } = useHoldr();
  const loading = market.niftyStatus === 'loading' && !moodPreview;
  return (
    <a
      href={href('/market')}
      className="press flex items-center gap-2 h-8 pl-2 pr-3 rounded-full border border-line bg-surface/70 hover:border-line-strong"
      aria-label={`${MOOD_COPY[mood].name}. NIFTY 50 ${nifty.dayChg.toFixed(2)} percent`}
    >
      <MoodMark mood={mood} className="w-7 h-3.5" strokeWidth={1.6} />
      <span className="text-[12px] text-ink-2 hidden sm:inline">NIFTY</span>
      {loading ? <span className="text-[12px] text-ink-3">...</span> : nifty.sample && !moodPreview ? <span className="text-[12px] text-ink-3">offline</span> : <Change value={nifty.dayChg} digits={2} className="text-[12px] font-medium" />}
    </a>
  );
}

function ProfileMenu() {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Portfolio and profile settings"
        className="press flex items-center gap-2 h-8 pl-1 pr-3 rounded-full border border-line bg-surface/70 hover:border-line-strong"
      >
        <span className="w-6 h-6 rounded-full bg-surface-3 text-[12px] font-medium flex items-center justify-center">{s.profile.charAt(0).toUpperCase()}</span>
        <span className="text-[12px] text-ink-2">{s.mode === 'sample' ? 'Sample' : s.profile === 'You' ? 'Mine' : s.profile}</span>
      </button>

      {open && (
        <div className="view-enter absolute right-0 top-[calc(100%+8px)] z-40 w-[300px] max-w-[calc(100vw-32px)] rounded-2xl border border-line-strong bg-surface p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
          <p className="text-[12px] text-ink-3 mb-2">Portfolio</p>
          <Segmented label="Portfolio" value={s.mode} onChange={m => { s.setMode(m); }} options={[['sample', 'Sample'], ['mine', 'Mine']]} size="sm" />
          {s.mode === 'mine' && !s.hasMine && <p className="text-[12px] text-ink-3 mt-2">Nothing imported yet for {s.profile}.</p>}

          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-[12px] text-ink-3 mb-1">Profile</p>
            <ul>
              {s.profiles.map(p => (
                <li key={p}>
                  <button onClick={() => s.switchProfile(p)} className="row-hover w-full flex items-center justify-between h-9 px-2 -mx-2 rounded-[10px] text-[13px]">
                    {p}
                    {p === s.profile && <CheckIcon size={14} className="text-ink-2" />}
                  </button>
                </li>
              ))}
            </ul>
            {naming ? (
              <form className="flex gap-2 mt-1" onSubmit={e => { e.preventDefault(); s.addProfile(name); setName(''); setNaming(false); }}>
                <label className="sr-only" htmlFor="profile-name">Profile name</label>
                <input id="profile-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Name"
                  className="flex-1 h-9 px-3 rounded-[10px] bg-surface-2 border border-line-strong text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-accent" />
                <Button type="submit" variant="secondary" disabled={!name.trim()}>Add</Button>
              </form>
            ) : (
              <button onClick={() => setNaming(true)} className="row-hover w-full flex items-center gap-2 h-9 px-2 -mx-2 rounded-[10px] text-[13px] text-ink-2">
                <PlusIcon size={14} /> New profile
              </button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-[12px] text-ink-3 mb-2">Market mood</p>
            <Segmented
              label="Preview market mood"
              size="sm"
              value={s.moodPreview || 'live'}
              onChange={v => s.setMoodPreview(v === 'live' ? null : v)}
              options={[['live', 'Live'], ['bull', 'Bull'], ['bear', 'Bear'], ['flat', 'Flat']]}
            />
            <p className="text-[12px] text-ink-3 mt-2">{s.moodPreview ? 'Previewing. Switch back to Live to follow NIFTY.' : 'Follows NIFTY 50 through the day.'}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setOpen(false); s.openAdd(); }}>Import holdings</Button>
            {s.hasMine && (confirmClear
              ? <Button variant="danger" onClick={() => { s.clearMine(); setOpen(false); }}>Confirm clear</Button>
              : <Button variant="ghost" onClick={() => setConfirmClear(true)}>Clear {s.profile === 'You' ? 'mine' : `${s.profile}'s`}</Button>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopBar({ section }) {
  return (
    <header className="sticky top-0 z-30 bg-bg/75 backdrop-blur-md border-b border-line">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <a href={href('/today')} className="text-[17px] font-semibold tracking-tight mr-2">Holdr</a>
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {TABS.map(([key, label]) => (
            <a
              key={key}
              href={href('/' + key)}
              aria-current={section === key ? 'page' : undefined}
              className={`press h-8 px-3 rounded-full flex items-center text-[13px] font-medium ${section === key ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink-2'}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <MoodChip />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

export function BottomBar({ section }) {
  return (
    <nav aria-label="Main" className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/85 backdrop-blur-md border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-4">
        {TABS.map(([key, label, Icon]) => {
          const on = section === key;
          return (
            <a key={key} href={href('/' + key)} aria-current={on ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 h-14 text-[11px] font-medium ${on ? 'text-ink' : 'text-ink-3'}`}>
              <Icon size={20} weight={on ? 'fill' : 'regular'} />
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
    <div role="status" className="view-enter fixed z-50 left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 px-4 h-10 flex items-center rounded-full bg-ink text-bg text-[13px] font-medium shadow-lg">
      {toast}
    </div>
  );
}
