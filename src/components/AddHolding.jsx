import { useRef, useState } from 'react';
import { useHoldr } from '../state';
import { Sheet, Tabs, Button } from './ui';
import { parsePortfolioFile, makeHolding } from '../lib/importer';
import { STOCK_INFO } from '../data/sample';
import { isoDaysAgo } from '../lib/dates';

const inputCls = 'w-full h-9 px-2.5 bg-transparent border border-line-2 text-ink placeholder:text-ink-3 outline-none focus:border-ink';

function Field({ id, label, help, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {help && <p className="text-ink-3 text-[12px]">{help}</p>}
    </div>
  );
}

function ImportTab({ onDone }) {
  const { addHoldings } = useHoldr();
  const [status, setStatus] = useState('idle');
  const [file, setFile] = useState(null);
  const [found, setFound] = useState([]);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState('');
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const read = f => {
    if (!f) return;
    setFile(f.name); setStatus('reading'); setError(null); setDebug('');
    parsePortfolioFile(f)
      .then(list => { setFound(list); setStatus('done'); })
      .catch(e => { setError(e.message); setDebug(e.debug || ''); setStatus('error'); });
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); }}
        className={`border border-dashed px-5 py-8 flex flex-col items-center gap-2 text-center ${over ? 'border-ink bg-hover' : 'border-line-2 hover:bg-hover'}`}
      >
        <span aria-hidden="true" className="text-ink-2">[ &uarr; ]</span>
        <span className="text-ink">{file || 'Choose or drop a holdings file'}</span>
        <span className="text-ink-3 text-[12px]">CSV or XLSX from Zerodha, Groww, Upstox and most brokers</span>
      </button>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => read(e.target.files[0])} />

      {status === 'reading' && <p className="loading-glyphs">░░░ Reading {file}</p>}
      {status === 'error' && (
        <div>
          <p className="text-down">! {error}</p>
          {debug && (
            <details className="mt-2 text-ink-3">
              <summary className="cursor-pointer link text-[12px]">show what the file contains</summary>
              <pre className="mt-2 p-3 border border-line text-[11px] overflow-x-auto max-h-48">{debug}</pre>
            </details>
          )}
        </div>
      )}
      {status === 'done' && (
        <div className="border border-line p-3">
          <p>{found.length} holding{found.length === 1 ? '' : 's'} found</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {found.map(h => (
              <li key={h.id} className="text-[12px] px-1.5 border border-line-2">{h.symbol} <span className="text-ink-3">{h.qty}</span></li>
            ))}
          </ul>
          <p className="text-[12px] text-ink-3 mt-3">~ Broker files don't include buy dates, so tax timing starts from today until you set them on each holding.</p>
        </div>
      )}
      <Button solid disabled={status !== 'done'} onClick={() => { addHoldings(found); onDone(); }}>Import {found.length || ''} holdings</Button>
    </div>
  );
}

function ManualTab({ onDone }) {
  const { addHoldings } = useHoldr();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(isoDaysAgo(0));

  const q = query.trim().toUpperCase();
  const matches = Object.entries(STOCK_INFO)
    .filter(([sym, [name]]) => !q || sym.includes(q) || name.toUpperCase().includes(q))
    .slice(0, 6);
  const custom = q && !matches.length && /^[A-Z0-9&-]{2,20}$/.test(q) ? q : null;

  const submit = e => {
    e.preventDefault();
    if (!picked || !Number(qty) || !Number(price)) return;
    addHoldings(makeHolding({ symbol: picked, qty: Number(qty), avgPrice: Number(price), ltp: Number(price), buyDate: date }));
    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field id="stock-search" label="Stock">
        <div className="relative">
          <span aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">&gt;</span>
          <input id="stock-search" value={query} onChange={e => { setQuery(e.target.value); setPicked(null); }}
            placeholder="Symbol or company, like RELIANCE" autoComplete="off" className={`${inputCls} pl-6`} />
        </div>
      </Field>
      {!picked && (
        <ul className="flex flex-col -mt-2">
          {matches.map(([sym, [name]]) => (
            <li key={sym}>
              <button type="button" onClick={() => { setPicked(sym); setQuery(sym); }} className="row w-full flex items-center gap-3 h-8 px-2 -mx-2 text-left">
                <span className="w-28 shrink-0">{sym}</span>
                <span className="text-ink-3 truncate">{name}</span>
              </button>
            </li>
          ))}
          {custom && (
            <li>
              <button type="button" onClick={() => setPicked(custom)} className="row w-full flex items-center gap-2 h-8 px-2 -mx-2 text-left">
                Use <span className="text-ink">{custom}</span> as an NSE symbol
              </button>
            </li>
          )}
        </ul>
      )}
      {picked && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field id="qty" label="Quantity">
              <input id="qty" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls} />
            </Field>
            <Field id="avg" label="Average buy price (₹)">
              <input id="avg" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls} />
            </Field>
          </div>
          <Field id="bought" label="Bought on" help="Used to work out when your gains become long-term.">
            <input id="bought" type="date" value={date} max={isoDaysAgo(0)} onChange={e => setDate(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
          </Field>
        </>
      )}
      <Button solid type="submit" disabled={!picked || !Number(qty) || !Number(price)}>Add {picked || 'holding'}</Button>
    </form>
  );
}

export default function AddHolding() {
  const { closeAdd } = useHoldr();
  const [tab, setTab] = useState('import');
  return (
    <Sheet title="Add your holdings" onClose={closeAdd}>
      <Tabs label="How to add" value={tab} onChange={setTab} options={[['import', 'Import a file'], ['manual', 'Add one']]} />
      <div className="mt-5">{tab === 'import' ? <ImportTab onDone={closeAdd} /> : <ManualTab onDone={closeAdd} />}</div>
    </Sheet>
  );
}
