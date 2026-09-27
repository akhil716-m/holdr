import { STOCK_INFO } from '../data/sample';
import { isoDaysAgo } from './dates';

/* reads broker exports (Zerodha, Groww, Upstox and similar) into holdings */

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(v => v.trim() !== '')) rows.push(row); }
  return rows;
}

/* 'symbol' and 'name' are tried before 'isin': ISINs are a last-resort identifier */
const COLUMN_ALIASES = {
  symbol: ['tradingsymbol', 'symbol', 'instrument', 'stock', 'scrip'],
  name: ['scripname', 'companyname', 'securityname', 'stockname', 'particulars', 'description', 'name'],
  isin: ['isin'],
  qty: ['qty', 'quantity', 'shares', 'units', 'netquantity', 'currentqty', 'holdingqty'],
  avgPrice: ['avgprice', 'avgcost', 'averageprice', 'averagecost', 'buyprice', 'buyavg', 'avg', 'costprice', 'purchaseprice'],
  ltp: ['ltp', 'lastprice', 'currentprice', 'marketprice', 'cmp', 'closingprice', 'price'],
  buyValue: ['buyvalue', 'buyamount', 'totalbuyvalue', 'purchasevalue', 'buyvalueinr'],
};
const ISIN_RE = /^IN[A-Z0-9]{10}$/;
const normalize = h => String(h).toLowerCase().replace(/[^a-z0-9]/g, '');

function findCol(headers, aliases) {
  const n = headers.map(normalize);
  for (const a of aliases) { const i = n.indexOf(a); if (i !== -1) return headers[i]; }
  for (const a of aliases) { const i = n.findIndex(h => h.includes(a)); if (i !== -1) return headers[i]; }
  return null;
}

/* broker P&L reports put title rows above the real table: find the row that looks like a header */
function tableFromRows(rows) {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map(c => String(c ?? '').trim());
    const hasId = findCol(cells, COLUMN_ALIASES.symbol) || findCol(cells, COLUMN_ALIASES.name) || findCol(cells, COLUMN_ALIASES.isin);
    if (hasId && findCol(cells, COLUMN_ALIASES.qty)) {
      const table = rows.slice(i + 1).map(r => Object.fromEntries(cells.map((h, j) => [h, String(r[j] ?? '').trim()])));
      return { headers: cells, table };
    }
  }
  throw new Error("Couldn't find a holdings table in this file.");
}

export function makeHolding({ symbol: symbolRaw, name: nameRaw, qty, avgPrice, ltp, buyDate }) {
  let symbol = String(symbolRaw).trim().toUpperCase();
  let id = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  let displayName = null;
  if (ISIN_RE.test(symbol) && nameRaw) {
    displayName = nameRaw.trim();
    id = symbol.toLowerCase();
    symbol = displayName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || symbol;
  }
  const info = STOCK_INFO[symbol];
  return {
    id,
    symbol,
    name: info?.[0] || displayName || symbol,
    sector: info?.[1] || 'Other',
    qty,
    avgPrice: avgPrice || ltp || 0,
    ltp: ltp || avgPrice || 0,
    buyDate: buyDate || isoDaysAgo(0),
    buyDateKnown: Boolean(buyDate),
    thesis: '',
    thesisStatus: null,
    verdict: 'watch',
    events: [],
  };
}

/* aggregates multi-row P&L reports per symbol: avg price = total buy value / total quantity */
function rowsToHoldings(headers, table) {
  const cols = Object.fromEntries(Object.entries(COLUMN_ALIASES).map(([k, a]) => [k, findCol(headers, a)]));
  const idCol = cols.symbol || cols.name || cols.isin;
  if (!idCol || !cols.qty) throw new Error("Couldn't find symbol and quantity columns in this file.");
  const num = v => parseFloat(String(v).replace(/,/g, ''));
  const agg = new Map();
  for (const row of table) {
    const raw = row[idCol];
    const qty = Math.abs(num(row[cols.qty]));
    if (!raw || !qty || Number.isNaN(qty)) continue;
    const symbol = raw.trim().toUpperCase();
    if (!symbol || symbol.length > 24) continue;
    const nameRaw = cols.name && idCol !== cols.name ? row[cols.name] : null;
    const avg = cols.avgPrice ? num(row[cols.avgPrice]) : NaN;
    const bv = cols.buyValue ? num(row[cols.buyValue]) : NaN;
    const ltp = cols.ltp ? num(row[cols.ltp]) : NaN;
    const e = agg.get(symbol) || { qty: 0, buyValue: 0, ltp: 0, name: nameRaw };
    e.qty += qty;
    e.buyValue += !Number.isNaN(avg) ? avg * qty : !Number.isNaN(bv) ? bv : 0;
    if (!Number.isNaN(ltp)) e.ltp = ltp;
    if (!e.name && nameRaw) e.name = nameRaw;
    agg.set(symbol, e);
  }
  const out = [];
  for (const [symbol, e] of agg) {
    if (!e.qty) continue;
    out.push(makeHolding({
      symbol, name: e.name,
      qty: Math.round(e.qty * 100) / 100,
      avgPrice: e.buyValue ? Math.round((e.buyValue / e.qty) * 100) / 100 : 0,
      ltp: e.ltp || 0,
    }));
  }
  if (!out.length) throw new Error('No holdings found in this file.');
  return out;
}

const preview = rows => rows.slice(0, 8).map(r => r.join(' | ')).join('\n');

export async function parsePortfolioFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    const rows = parseCSV(await file.text());
    try {
      const { headers, table } = tableFromRows(rows);
      return rowsToHoldings(headers, table);
    } catch (e) {
      e.debug = preview(rows);
      throw e;
    }
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx'); // loaded only when someone imports a spreadsheet
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheets = wb.SheetNames.map(n => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })]);
    for (const [, rows] of sheets) {
      try {
        const { headers, table } = tableFromRows(rows);
        return rowsToHoldings(headers, table);
      } catch { /* try the next sheet */ }
    }
    const err = new Error("Couldn't find a holdings table in this file.");
    err.debug = sheets.map(([n, rows]) => `Sheet "${n}":\n${preview(rows)}`).join('\n\n');
    throw err;
  }
  throw new Error('Please upload a CSV or XLSX file.');
}
