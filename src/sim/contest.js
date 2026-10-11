// Pokémon contests: five categories, four ranks. The trainer enters the party member that best fits the category;
// type, affection, level and the trainer's mood decide the appeal. Winning a rank gives that member a ribbon and
// opens the next rank of the category. Results are stored as flags (ribbon-<category>-<rank>) and on the member.
import { typesOf, xpLevel } from './battle.js';
import { random, between } from './random.js';
import { poke } from './text.js';

export const CONTEST_CATEGORIES = {
  cool: { name: '멋짐', types: ['불꽃', '격투', '드래곤', '강철', '전기', '비행'] },
  beauty: { name: '아름다움', types: ['물', '얼음', '페어리', '에스퍼', '비행'] },
  cute: { name: '귀여움', types: ['노말', '페어리', '풀', '전기', '벌레'] },
  clever: { name: '슬기로움', types: ['에스퍼', '고스트', '악', '강철', '독'] },
  tough: { name: '강인함', types: ['바위', '땅', '격투', '강철', '노말'] },
};
export const CONTEST_RANKS = ['노말', '슈퍼', '하이퍼', '마스터'];
export const CONTEST_FEES = [0, 100, 200, 300];
export const CONTEST_PRIZES = [200, 400, 700, 1200];
export const ribbonFlag = (category, rank) => `ribbon-${category}-${rank}`;
export const ribbonName = (category, rank) => `${CONTEST_CATEGORIES[category].name} ${CONTEST_RANKS[rank]}랭크 리본`;

/** The next rank this trainer can enter in a category (4 = every rank won). */
export function nextContestRank(s, category) {
  let rank = 0;
  while (rank < CONTEST_RANKS.length && s.flags[ribbonFlag(category, rank)]) rank++;
  return rank;
}
export const ribbonCount = s => Object.keys(s.flags).filter(k => /^ribbon-[a-z]+-\d$/.test(k)).length;
export const masterRibbons = s => Object.keys(CONTEST_CATEGORIES).filter(c => s.flags[ribbonFlag(c, 3)]).length;

/** How well a member fits a category, 0–100 before the day's luck. */
export function contestAppeal(s, member, category) {
  const fit = typesOf(member.id).some(t => CONTEST_CATEGORIES[category].types.includes(t)) ? 25 : 0;
  return fit + member.affection * 0.25 + Math.min(100, xpLevel(member)) * 0.3 + (s.stats.joy + s.stats.bond) / 10 + (member.shiny ? 3 : 0);
}
export const contestEntrant = (s, category) => [...s.party].sort((a, b) => contestAppeal(s, b, category) - contestAppeal(s, a, category) || a.uid - b.uid)[0] || null;

/** Runs one contest and applies its results to `s` (mutated). Returns the text for the decision's result. */
export function runContest(s, { category, rank }) {
  const member = contestEntrant(s, category);
  if (!member) return ' 아직 함께 나갈 포켓몬이 없어 객석에서 구경했다.';
  const score = Math.round(contestAppeal(s, member, category) + random(s) * 15);
  const rivals = [0, 1, 2].map(() => 35 + rank * 13 + between(s, 0, 20));
  const place = 1 + rivals.filter(r => r > score).length;
  const label = `${CONTEST_CATEGORIES[category].name} 부문 ${CONTEST_RANKS[rank]}랭크`;
  member.affection = Math.min(100, member.affection + 2);
  if (place === 1) {
    s.flags[ribbonFlag(category, rank)] = true;
    member.ribbons = [...(member.ribbons || []), `${category}-${rank}`].slice(-60);
    s.money += CONTEST_PRIZES[rank];
    s.reputation = Math.min(100, s.reputation + rank + 1);
    s.stats.joy = Math.min(100, s.stats.joy + 3);
    return ` ${poke(member.id, '이', '가')} ${label}에서 우승했다(점수 ${score} · 경쟁자 최고 ${Math.max(...rivals)}). ${ribbonName(category, rank)}을 받고 상금 ${CONTEST_PRIZES[rank]}P를 받았다.`;
  }
  s.stats.wisdom = Math.min(100, s.stats.wisdom + 1);
  return ` ${poke(member.id, '과', '와')} ${label}에 나가 ${place}위를 했다(점수 ${score} · 우승 점수 ${Math.max(...rivals)}). 다음에는 연기를 더 다듬기로 했다.`;
}
