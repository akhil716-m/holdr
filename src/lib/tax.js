import { DAY, startOfToday } from './dates';

/* listed equity, delivery, from 23 Jul 2024 */
export const LTCG_RATE = 0.125;
export const STCG_RATE = 0.2;
export const LTCG_EXEMPTION = 125000;

export function taxInfo(h, price) {
  const buy = new Date(h.buyDate);
  const heldDays = Math.max(0, Math.floor((startOfToday() - buy) / DAY));
  const isLT = heldDays > 365;
  const ltDate = new Date(buy.getTime() + 366 * DAY);
  const gain = (price - h.avgPrice) * h.qty;
  return {
    heldDays,
    isLT,
    daysToLT: isLT ? 0 : 366 - heldDays,
    ltDate,
    gain,
    waitSaving: !isLT && gain > 0 ? gain * (STCG_RATE - LTCG_RATE) : 0,
  };
}
