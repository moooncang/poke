// A compact yearly snapshot of the life, so the player can look back at how the simulation actually moved:
// money, reputation, the five stats, party strength, collection and the region they lived in.
// One row per simulated year (written by advanceYear before the year's event), at most HISTORY_LIMIT rows.
import { xpLevel, badgeCount, championships } from './battle.js';
import { currentRegion, regionState } from './world.js';

export const HISTORY_LIMIT = 110;
export const HISTORY_KEYS = {
  money: '소지금', rep: '명성', joy: '행복', vit: '건강', cou: '용기', wis: '지식', bond: '유대',
  lv: '최고 레벨', party: '파티', box: '박스', badges: '배지', titles: '타이틀', seen: '도감',
  eco: '지방 경기', saf: '지방 치안', ecl: '지방 생태', income: '수입', expense: '지출', infamy: '악명', debt: '빚',
};

/** Appends this year's snapshot (mutates `s`). */
export function recordYear(s) {
  s.history ||= [];
  const region = regionState(s, currentRegion(s));
  s.history.push({
    age: s.age, town: s.town, money: Math.round(s.money), rep: Math.round(s.reputation),
    joy: s.stats.joy, vit: s.stats.vitality, cou: s.stats.courage, wis: s.stats.wisdom, bond: s.stats.bond,
    lv: Math.max(0, ...s.party.map(xpLevel)), party: s.party.length, box: s.box.length,
    badges: badgeCount(s), titles: championships(s), seen: s.seen.length,
    eco: Math.round(region.economy), saf: Math.round(region.safety), ecl: Math.round(region.ecology),
    income: s.ledger?.income ?? 0, expense: s.ledger?.expense ?? 0, infamy: s.infamy || 0, debt: Math.round(s.debt || 0),
  });
  if (s.history.length > HISTORY_LIMIT) s.history.splice(0, s.history.length - HISTORY_LIMIT);
}

const int = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
/** Save validation for one history row. */
export const validHistoryRow = (row, age, townId) => Boolean(row) && typeof row === 'object' && int(row.age, 0, age) && townId(row.town)
  && Object.keys(HISTORY_KEYS).every(k => Number.isFinite(row[k]) && row[k] >= 0 && row[k] <= 1e9);

/** The values of one key over the life: [[age, value], …]. */
export const series = (s, key) => (s.history || []).map(row => [row.age, row[key]]);

/** Peaks and lows over the recorded years. */
export function historyHighlights(s) {
  const rows = s.history || [];
  if (!rows.length) return null;
  const best = key => rows.reduce((a, b) => b[key] > a[key] ? b : a);
  const worst = key => rows.reduce((a, b) => b[key] < a[key] ? b : a);
  const totalIncome = rows.reduce((n, r) => n + r.income, 0), totalExpense = rows.reduce((n, r) => n + r.expense, 0);
  return {
    richest: { age: best('money').age, value: best('money').money },
    poorest: { age: worst('money').age, value: worst('money').money },
    famous: { age: best('rep').age, value: best('rep').rep },
    happiest: { age: best('joy').age, value: best('joy').joy },
    hardest: { age: worst('joy').age, value: worst('joy').joy },
    strongest: { age: best('lv').age, value: best('lv').lv },
    totalIncome, totalExpense,
    firstTitleAge: rows.find(r => r.titles > 0)?.age ?? null,
    firstBadgeAge: rows.find(r => r.badges > 0)?.age ?? null,
  };
}
