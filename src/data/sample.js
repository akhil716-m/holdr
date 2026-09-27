import { isoDaysAgo, isoDaysAhead, DAY } from '../lib/dates';
import { seedFromString, seedRandom } from '../lib/seed';

/*
  Sample portfolio. Everything here is illustrative and is always labelled "Sample" in the UI.
  Dates are relative to today so tax windows and events stay meaningful whenever the app is opened.
  Sample holdings never receive live prices: mixing real quotes with made-up buy prices
  produced nonsense returns in version 1.
*/

export const SAMPLE_HOLDINGS = [
  {
    id: 'tcs', symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT Services',
    qty: 12, avgPrice: 3450, ltp: 3812, buyDate: isoDaysAgo(680), dayChange: 0.84,
    thesis: 'Steady compounder. Largest IT exporter with a strong deal pipeline and consistent dividends.',
    thesisStatus: 'intact', verdict: 'hold',
    events: [{ label: 'Q2 results', date: isoDaysAhead(12), type: 'earnings' }],
  },
  {
    id: 'hdfcbank', symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking (Private)',
    qty: 30, avgPrice: 1540, ltp: 1487, buyDate: isoDaysAgo(301), dayChange: -0.62,
    thesis: 'Post-merger value play. NIM recovery and deposit growth should re-rate the stock.',
    thesisStatus: 'shaky', verdict: 'watch',
    events: [{ label: 'Ex-dividend', date: isoDaysAhead(6), type: 'dividend' }],
  },
  {
    id: 'eternal', symbol: 'ETERNAL', name: 'Eternal (Zomato)', sector: 'Consumer Internet',
    qty: 150, avgPrice: 268, ltp: 231, buyDate: isoDaysAgo(560), dayChange: -1.36,
    thesis: 'Quick-commerce land grab. Blinkit growth justifies the premium if margins hold.',
    thesisStatus: 'broken', verdict: 'review',
    events: [{ label: 'Lock-in expiry', date: isoDaysAhead(18), type: 'risk' }],
  },
  {
    id: 'infy', symbol: 'INFY', name: 'Infosys', sector: 'IT Services',
    qty: 20, avgPrice: 1390, ltp: 1542, buyDate: isoDaysAgo(810), dayChange: 1.12,
    thesis: 'GenAI services bet. Margin expansion as AI-led deals scale.',
    thesisStatus: 'intact', verdict: 'hold',
    events: [{ label: 'Board meeting on buyback', date: isoDaysAhead(24), type: 'corporate' }],
  },
  {
    id: 'tatamotors', symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto & EV',
    qty: 45, avgPrice: 920, ltp: 1015, buyDate: isoDaysAgo(318), dayChange: 1.47,
    thesis: 'EV leadership plus the JLR turnaround. The demerger should unlock value in each business.',
    thesisStatus: 'intact', verdict: 'hold',
    events: [],
  },
  {
    id: 'paytm', symbol: 'PAYTM', name: 'One97 Communications', sector: 'Fintech',
    qty: 60, avgPrice: 410, ltp: 365, buyDate: isoDaysAgo(190), dayChange: -0.41,
    thesis: 'Turnaround bet. Path to profitability through lending distribution and cost cuts.',
    thesisStatus: 'shaky', verdict: 'review',
    events: [{ label: 'AGM', date: isoDaysAhead(33), type: 'corporate' }],
  },
];

export const SAMPLE_NEWS = [
  { holding: 'tcs', tag: 'Earnings', text: 'Net profit beats estimates, up 9% on strong deal wins across BFSI and retail.', hoursAgo: 2 },
  { holding: 'eternal', tag: 'Sentiment', text: 'Brokerages cut target prices, citing rising delivery costs and quick-commerce competition.', hoursAgo: 3 },
  { holding: null, tag: 'Markets', text: 'Nifty IT gains 1.4% as US tech earnings open stronger than expected.', hoursAgo: 4 },
  { holding: 'hdfcbank', tag: 'Regulatory', text: 'RBI flags concerns over unsecured loan growth across private banks.', hoursAgo: 5 },
  { holding: 'infy', tag: 'Guidance', text: 'Raises revenue growth guidance to 4.5 to 5.5% on large AI-led deal ramp-ups.', hoursAgo: 6 },
  { holding: 'tatamotors', tag: 'Sales', text: 'EV sales cross 10,000 units a month for the first time.', hoursAgo: 8 },
  { holding: 'paytm', tag: 'Regulatory', text: 'NPCI extends the deadline for UPI third-party handle migration.', hoursAgo: 12 },
];

/* NIFTY used only when live index data can't be reached */
export const SAMPLE_NIFTY = { price: 24812, dayChg: 0.62 };

export const SECTORS = [
  { name: 'Defence & Aerospace', chg: 14.2, note: 'Record order books on rising defence capex',
    stocks: [['HAL', 'Hindustan Aeronautics', 18.4], ['BEL', 'Bharat Electronics', 15.1], ['MAZDOCK', 'Mazagon Dock', 12.6]] },
  { name: 'Capital Goods', chg: 9.7, note: 'Private capex cycle finally broadening',
    stocks: [['LT', 'Larsen & Toubro', 11.2], ['ABB', 'ABB India', 9.8], ['SIEMENS', 'Siemens India', 7.4]] },
  { name: 'Auto & EV', chg: 6.8, note: 'EV adoption inflecting and rural demand is back',
    stocks: [['TATAMOTORS', 'Tata Motors', 9.1], ['M&M', 'Mahindra & Mahindra', 8.3], ['BAJAJ-AUTO', 'Bajaj Auto', 4.2]] },
  { name: 'PSU Banks', chg: 5.6, note: 'Credit growth strong, bad loans at decade lows',
    stocks: [['SBIN', 'State Bank of India', 7.0], ['BANKBARODA', 'Bank of Baroda', 5.2], ['CANBK', 'Canara Bank', 4.1]] },
  { name: 'IT Services', chg: 4.1, note: 'AI-led deals ramping as US spending recovers',
    stocks: [['TCS', 'Tata Consultancy', 5.0], ['INFY', 'Infosys', 4.4], ['LTIM', 'LTIMindtree', 3.1]] },
  { name: 'Pharma & Healthcare', chg: 3.3, note: 'US generics pricing stabilising',
    stocks: [['SUNPHARMA', 'Sun Pharma', 4.6], ['DIVISLAB', "Divi's Labs", 3.8], ['MAXHEALTH', 'Max Healthcare', 2.9]] },
  { name: 'Energy & Power', chg: 2.8, note: 'Peak demand records and a renewables capex surge',
    stocks: [['NTPC', 'NTPC', 4.0], ['POWERGRID', 'Power Grid', 2.5], ['TATAPOWER', 'Tata Power', 1.9]] },
  { name: 'FMCG', chg: 1.8, note: 'Volume recovery slow, margins improving',
    stocks: [['ITC', 'ITC', 3.2], ['HINDUNILVR', 'Hindustan Unilever', 1.1], ['NESTLEIND', 'Nestlé India', 0.8]] },
  { name: 'Banking (Private)', chg: 1.2, note: 'Margin pressure persists, valuations reasonable',
    stocks: [['ICICIBANK', 'ICICI Bank', 3.4], ['HDFCBANK', 'HDFC Bank', 0.6], ['KOTAKBANK', 'Kotak Mahindra', -0.4]] },
  { name: 'Realty', chg: 0.9, note: 'Premium housing strong, affordable lagging',
    stocks: [['DLF', 'DLF', 2.1], ['OBEROIRLTY', 'Oberoi Realty', 0.7], ['LODHA', 'Macrotech', -0.3]] },
  { name: 'Metals & Mining', chg: -1.6, note: 'Soft China demand keeps global prices capped',
    stocks: [['TATASTEEL', 'Tata Steel', -0.8], ['HINDALCO', 'Hindalco', -1.9], ['JSWSTEEL', 'JSW Steel', -2.4]] },
  { name: 'Consumer Internet', chg: -3.4, note: 'Discount wars compressing margins',
    stocks: [['ETERNAL', 'Eternal (Zomato)', -4.8], ['NYKAA', 'Nykaa', -2.9], ['POLICYBZR', 'PB Fintech', -1.7]] },
  { name: 'Fintech', chg: -5.2, note: 'Regulatory overhang on UPI monetisation',
    stocks: [['PAYTM', 'One97 (Paytm)', -6.3], ['ANGELONE', 'Angel One', -4.4], ['CDSL', 'CDSL', -2.1]] },
];

export const IDEAS = [
  { symbol: 'HAL', name: 'Hindustan Aeronautics', sector: 'Defence & Aerospace',
    why: 'Strongest sector over three months, with a record order book. You have no defence exposure.' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma & Healthcare',
    why: 'Healthcare is missing from your portfolio. A defensive balance to a tech-heavy mix.' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Auto & EV',
    why: 'Same sector as Tata Motors with different exposure: SUVs plus the farm equipment cycle.' },
];

export const CALENDAR = [
  { label: 'RBI policy review', inDays: 9, note: 'Banks and realty are rate-sensitive' },
  { label: 'Q2 earnings season opens', inDays: 12, note: 'TCS reports first, setting the tone for IT' },
  { label: 'GST council meeting', inDays: 21, note: 'Possible rate cut on EV components' },
  { label: 'Tata Capital IPO', inDays: 27, note: 'Largest NBFC listing this year' },
];

export const MACRO = [
  { id: 'usdinr', label: 'USD / INR', value: 83.42, chg: 0.14, unit: '',
    summary: 'Rupees per US dollar. A rising line means a weaker rupee: good for exporters that earn in dollars (TCS, Infosys), a headwind for companies that import fuel or raw materials.' },
  { id: 'gold', label: 'Gold', value: 72840, chg: 0.42, unit: '/10g',
    summary: 'Gold per 10 grams in rupees. When investors get nervous about stocks, money moves into gold, so a sharp rise often signals caution building in the market.' },
  { id: 'silver', label: 'Silver', value: 91250, chg: -0.61, unit: '/kg',
    summary: 'Silver per kilogram in rupees. It is both a safe haven and an industrial metal, so its trend mixes investor caution with real factory demand.' },
  { id: 'crude', label: 'Brent crude', value: 68.4, chg: -1.18, unit: '/bbl',
    summary: 'Oil per barrel in dollars. India imports most of its oil, so a falling price eases inflation and helps the rupee. A spike does the opposite.' },
];
export const SAMPLE_VIX = { value: 13.2, chg: -3.1 };

/* deterministic FII/DII history for when the NSE bridge isn't running */
export function sampleFlows(days = 20) {
  const rnd = seedRandom(seedFromString('fii-dii'));
  const out = [];
  let d = new Date();
  while (out.length < days) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const fb = 9000 + rnd() * 7000, fs = 9500 + rnd() * 7000;
      const db = 11000 + rnd() * 8000, ds = 9000 + rnd() * 7000;
      out.unshift({ date: new Date(d), fii: { buy: fb, sell: fs, net: fb - fs }, dii: { buy: db, sell: ds, net: db - ds } });
    }
    d = new Date(d.getTime() - DAY);
  }
  return out;
}

/* known symbols, used by search and to enrich imported holdings */
export const STOCK_INFO = {
  TCS: ['Tata Consultancy Services', 'IT Services'],
  HDFCBANK: ['HDFC Bank', 'Banking (Private)'],
  ETERNAL: ['Eternal (Zomato)', 'Consumer Internet'],
  ZOMATO: ['Eternal (Zomato)', 'Consumer Internet'],
  INFY: ['Infosys', 'IT Services'],
  TATAMOTORS: ['Tata Motors', 'Auto & EV'],
  PAYTM: ['One97 Communications', 'Fintech'],
  RELIANCE: ['Reliance Industries', 'Energy & Power'],
  ICICIBANK: ['ICICI Bank', 'Banking (Private)'],
  BAJFINANCE: ['Bajaj Finance', 'Fintech'],
  ADANIENT: ['Adani Enterprises', 'Diversified'],
  ITC: ['ITC', 'FMCG'],
  WIPRO: ['Wipro', 'IT Services'],
  SUNPHARMA: ['Sun Pharma', 'Pharma & Healthcare'],
  HAL: ['Hindustan Aeronautics', 'Defence & Aerospace'],
  BEL: ['Bharat Electronics', 'Defence & Aerospace'],
  LT: ['Larsen & Toubro', 'Capital Goods'],
  'M&M': ['Mahindra & Mahindra', 'Auto & EV'],
  SBIN: ['State Bank of India', 'PSU Banks'],
  KOTAKBANK: ['Kotak Mahindra Bank', 'Banking (Private)'],
  HINDUNILVR: ['Hindustan Unilever', 'FMCG'],
  NESTLEIND: ['Nestlé India', 'FMCG'],
  NTPC: ['NTPC', 'Energy & Power'],
  POWERGRID: ['Power Grid', 'Energy & Power'],
  TATASTEEL: ['Tata Steel', 'Metals & Mining'],
  HINDALCO: ['Hindalco', 'Metals & Mining'],
  DIVISLAB: ["Divi's Labs", 'Pharma & Healthcare'],
  LTIM: ['LTIMindtree', 'IT Services'],
  DLF: ['DLF', 'Realty'],
};
