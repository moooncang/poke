// Where a person stands in the world: reputation and infamy tiers, career rank titles, debt, prison and the
// syndicate road. Pure helpers plus the yearly bookkeeping the engine calls (tickStanding mutates `s`).
import { CAREERS, CAREER_RANKS, TOWNS } from '../data/world.js';
import { REGIONS } from '../data/regions.js';
import { clamp, random, chance } from './random.js';
import { currentRegion } from './world.js';

export const DEBT_INTEREST = 0.08;
export const DEBT_REPAY_SHARE = 0.3;
export const BANKRUPTCY_DEBT = 8000;
export const LOAN_LIMIT = 5000;
export const WANTED_INFAMY = 60;
export const ARREST_DIVISOR = 400;
export const PRISON_MAX = 8;

export const reputationTier = r => r < 15 ? '무명' : r < 35 ? '동네에서 알려짐' : r < 60 ? '지방의 유명인' : r < 85 ? '전국구 트레이너' : '살아 있는 전설';
export const infamyTier = n => n <= 0 ? null : n < 15 ? '소문이 도는' : n < 35 ? '요주의 인물' : n < WANTED_INFAMY ? '악명 높은' : n < 85 ? '수배 중' : '전설적인 무법자';
export const infamyOf = s => s.infamy || 0;
export const isWanted = s => infamyOf(s) >= WANTED_INFAMY;
export const inPrison = s => (s.prison || 0) > 0;
export const isOutlaw = s => s.career === 'syndicate';
export const debtOf = s => s.debt || 0;

/** The rank title of the current career ('자율 활동' without one). */
export const careerTitle = s => s.career ? CAREER_RANKS[s.career]?.[Math.min(5, s.careerRank || 0)] || CAREERS[s.career].short : '자율 활동';
/** The organisation an outlaw belongs to (the villain group of the region they joined in, else the current one). */
export const syndicateName = s => REGIONS.find(r => r.id === (s.flags['syndicate-region'] || currentRegion(s)))?.villain || '조직';

/** One-line social standing for cards: title, affiliation, conditions. */
export function standingOf(s) {
  const town = TOWNS.find(t => t.id === s.town);
  const lines = [];
  if (inPrison(s)) lines.push(`복역 중 · ${s.prison}년 남음`);
  if (isWanted(s)) lines.push('수배 중');
  if (isOutlaw(s)) lines.push(`${syndicateName(s)} ${careerTitle(s)}`);
  if (debtOf(s) > 0) lines.push(`빚 ${debtOf(s).toLocaleString()}P`);
  return { town: town ? `${town.region} · ${town.name}` : '', job: s.career ? `${CAREERS[s.career].name} · ${careerTitle(s)}${s.work?.retired ? ' · 은퇴' : ''}` : '자율 활동',
    reputation: reputationTier(s.reputation), infamy: infamyTier(infamyOf(s)), conditions: lines };
}

/**
 * Yearly bookkeeping for debt, infamy and prison. Returns records to queue.
 * - Debt grows with interest and is repaid from spare money; past BANKRUPTCY_DEBT it is wiped at a heavy cost.
 * - Infamy fades slowly outside the syndicate; wanted outlaws risk arrest each year (infamy / ARREST_DIVISOR).
 * - A prison term counts down; release is logged when it ends.
 */
export function tickStanding(s) {
  const records = [];
  s.infamy ||= 0; s.debt ||= 0; s.prison ||= 0;
  if (s.prison > 0) {
    s.prison -= 1;
    s.infamy = clamp(s.infamy - 4, 0, 100);
    s.stats.joy = clamp(s.stats.joy - 3, 0, 100);
    s.stats.vitality = clamp(s.stats.vitality - 1, 0, 100);
    if (s.prison === 0) {
      // Time served clears the warrant; the name stays tarnished.
      s.infamy = Math.min(s.infamy, WANTED_INFAMY - 15);
      records.push({ kind: 'milestone', title: '출소', effects: { joy: 6 }, body: '형기를 마치고 교도소 문을 나섰다. 파트너들이 센터에서 기다리고 있었다. 세상은 조금 달라져 있었고, 사람들의 눈길도 그랬다.' });
    }
    return records;
  }
  if (s.debt > 0) {
    s.debt = Math.round(s.debt * (1 + DEBT_INTEREST));
    const repay = Math.min(s.debt, Math.floor(Math.max(0, s.money) * DEBT_REPAY_SHARE));
    if (repay > 0) { s.money -= repay; s.debt -= repay; }
    if (s.debt >= BANKRUPTCY_DEBT) {
      const sold = [...s.box].sort((a, b) => a.affection - b.affection).slice(0, Math.ceil(s.box.length / 2));
      s.box = s.box.filter(m => !sold.includes(m));
      if (s.partyPlan) s.partyPlan = { ...s.partyPlan, pinned: s.partyPlan.pinned.filter(uid => !sold.some(m => m.uid === uid)) };
      s.money = 0; s.debt = 0; s.flags.bankrupt = true;
      s.reputation = clamp(s.reputation - 15, 0, 100); s.stats.joy = clamp(s.stats.joy - 12, 0, 100);
      records.push({ kind: 'milestone', title: '파산', effects: {}, body: `빚이 ${BANKRUPTCY_DEBT.toLocaleString()}P를 넘어 파산을 신청했다. 남은 돈은 모두 압류됐고${sold.length ? ` PC 박스의 포켓몬 ${sold.length}마리는 다른 트레이너에게 넘어갔다` : ' 가진 것이 없어 더 가져갈 것도 없었다'}. 빚은 사라졌지만 평판도 함께 무너졌다.` });
    }
  }
  if (s.infamy > 0 && !isOutlaw(s)) s.infamy -= 1;
  if (isOutlaw(s) && !s.work.retired) { s.infamy = clamp(s.infamy + 2, 0, 100); s.reputation = clamp(s.reputation - 1, 0, 100); }
  if (isWanted(s) && chance(s, s.infamy / ARREST_DIVISOR)) {
    const years = clamp(Math.round(1 + s.infamy / 25 + random(s) * 2), 1, PRISON_MAX);
    s.prison = years; s.flags.arrested = (s.flags.arrested || 0) + 1;
    if (isOutlaw(s)) { s.career = null; s.careerRank = 0; }
    s.reputation = clamp(s.reputation - 10, 0, 100);
    records.push({ kind: 'milestone', title: '체포', effects: { joy: -8 }, body: `수배 끝에 체포됐다. 재판에서 ${years}년 형을 받았다. 파트너들은 포켓몬센터에 맡겨졌고, 조직은 아무도 보내지 않았다.` });
  }
  return records;
}

/** A loan: money now, debt later. Returns false when over the limit. */
export function takeLoan(s, amount) {
  if (!(amount > 0) || debtOf(s) + amount > LOAN_LIMIT) return false;
  s.money += amount; s.debt = debtOf(s) + amount;
  return true;
}
