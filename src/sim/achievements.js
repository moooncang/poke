// Achievements of one life: medals, the trainer card, ending cards and regional Pokédex progress.
// Pure functions of a (finished or running) life; the legacy store in sim/legacy.js collects them across lives.
import { TOWNS, CAREERS } from '../data/world.js';
import { REGIONS } from '../data/regions.js';
import { LEAGUE_REGIONS, championFlag } from '../data/league-sagas.js';
import { xpLevel, badgeCount, championships } from './battle.js';
import { PARTY_LIMIT } from './party.js';
import { TALENT_FIELDS, TALENT_TIERS } from './talent.js';
import { goalOf, GOALS } from './goals.js';
import { poke, josa } from './text.js';
import { ribbonCount, masterRibbons, CONTEST_CATEGORIES } from './contest.js';
import { frontierSymbols, frontierGold, facilityStreaks, REGION_FACILITIES, facilityTier } from '../data/frontier.js';
import { historyHighlights } from './history.js';
import { RULES, hasRule } from './perks.js';
import { infamyOf, isOutlaw, isWanted, careerTitle, syndicateName, debtOf } from './standing.js';
import { difficultyOf, difficultyRank } from './difficulty.js';

export const RARITIES = { common: '일반', rare: '레어', epic: '에픽', legendary: '레전드' };

// National Pokédex ranges per region (used for regional completion).
export const DEX_REGIONS = [
  ['kanto', 1, 151], ['johto', 152, 251], ['hoenn', 252, 386], ['sinnoh', 387, 493], ['unova', 494, 649],
  ['kalos', 650, 721], ['alola', 722, 809], ['galar', 810, 905], ['paldea', 906, 1025],
].map(([id, from, to]) => ({ id, name: REGIONS.find(r => r.id === id).name, from, to, total: to - from + 1 }));
export const DEX_TOTAL = 1025;

export const members = s => [...s.party, ...s.box];
export const titlesOf = s => LEAGUE_REGIONS.filter(r => s.flags[championFlag(r)]);
export const regionsVisited = s => [...new Set(s.visited.map(id => TOWNS.find(t => t.id === id)?.map).filter(Boolean))];
export const ownedSpecies = s => [...new Set(members(s).map(m => m.id))];

/** Regional Pokédex completion for a list of species ids. */
export function dexProgress(ids) {
  const set = new Set(ids);
  return DEX_REGIONS.map(r => {
    let count = 0;
    for (let id = r.from; id <= r.to; id++) if (set.has(id)) count++;
    return { ...r, count, percent: Math.round(count / r.total * 100) };
  });
}

// ── Medals ──
// `test` receives the finished (or current) life. Medals are listed in display order and grouped by `group`.
export const MEDAL_GROUPS = { partner: '파트너', collection: '도감과 수집', battle: '배틀과 리그', contest: '콘테스트', frontier: '배틀 시설', life: '삶과 사람', hobby: '취미와 일상', world: '여행', dark: '그늘의 길', legacy: '가문', challenge: '도전 규칙' };
const finished = s => Boolean(s.ended);
// Distinct storylets of a pack that this life actually went through (by id prefix, repeatable ids end in @age).
const seenEvents = (s, prefix) => new Set(s.log.map(e => String(e.sourceId || '').split('@')[0]).filter(id => id.startsWith(prefix))).size;
const villainArcs = s => Object.keys(s.flags).filter(k => /^villain-[a-z]+-5-done$/.test(k)).length;
const maxBy = (list, f) => list.reduce((best, x) => f(x) > f(best) ? x : best, list[0]);
export const MEDALS = [
  { id: 'first-partner', group: 'partner', name: '첫 파트너', detail: '첫 파트너를 만났다.', test: s => members(s).some(m => m.origin === 'partner') },
  { id: 'partner-evolved', group: 'partner', name: '함께 자란 날', detail: '첫 파트너가 진화했다.', test: s => Boolean(s.flags.partnerEvolved) },
  { id: 'lifelong-partner', group: 'partner', name: '평생의 파트너', detail: '첫 파트너가 끝까지 파티에 남아 친밀도 90 이상을 지켰다.', test: s => s.party.some(m => m.origin === 'partner' && m.affection >= 90) },
  { id: 'partner-100', group: 'partner', name: '정점의 콤비', detail: '첫 파트너가 Lv.100에 도달했다.', test: s => members(s).some(m => m.origin === 'partner' && xpLevel(m) >= 100) },
  { id: 'full-party', group: 'collection', name: '여섯 개의 몬스터볼', detail: '파티 6마리를 채웠다.', test: s => s.party.length >= PARTY_LIMIT },
  { id: 'box-30', group: 'collection', name: '붐비는 PC 박스', detail: '동료 30마리와 함께했다.', test: s => members(s).length >= 30 },
  { id: 'dex-100', group: 'collection', name: '도감 100', detail: '포켓몬 100종을 관측했다.', test: s => s.seen.length >= 100 },
  { id: 'dex-300', group: 'collection', name: '도감 300', detail: '포켓몬 300종을 관측했다.', test: s => s.seen.length >= 300 },
  { id: 'regional-dex', group: 'collection', name: '지방 도감 완성', detail: '한 지방의 도감을 모두 채웠다.', test: s => dexProgress(s.seen).some(r => r.count === r.total) },
  { id: 'shiny', group: 'collection', name: '반짝이는 만남', detail: '색이 다른 포켓몬과 함께했다.', test: s => members(s).some(m => m.shiny) },
  { id: 'legend', group: 'collection', name: '전설의 동행', detail: '전설의 포켓몬과 함께했다.', test: s => members(s).some(m => m.locked) },
  { id: 'legend-3', group: 'collection', name: '신화의 수집가', detail: '전설의 포켓몬 3마리와 함께했다.', test: s => members(s).filter(m => m.locked).length >= 3 },
  { id: 'egg', group: 'collection', name: '알에서 태어난 동료', detail: '알을 부화시켜 동료로 맞았다.', test: s => members(s).some(m => m.origin === 'egg') },
  { id: 'badges-8', group: 'battle', name: '배지 케이스', detail: '한 지방의 배지 8개를 모았다.', test: s => Object.values(s.game.badges).some(n => n >= 8) },
  { id: 'badges-24', group: 'battle', name: '세 지방의 배지', detail: '배지를 24개 모았다.', test: s => badgeCount(s) >= 24 },
  { id: 'badges-all', group: 'battle', name: '배지 마스터', detail: '9개 지방의 배지 72개를 모두 모았다.', test: s => badgeCount(s) >= 72 },
  { id: 'wins-100', group: 'battle', name: '백전노장', detail: '배틀에서 100번 이겼다.', test: s => s.game.wins >= 100 },
  { id: 'champion', group: 'battle', name: '챔피언', detail: '지방 리그 정상에 올랐다.', test: s => championships(s) >= 1 },
  { id: 'champion-3', group: 'battle', name: '삼관왕', detail: '세 지방의 리그 정상에 올랐다.', test: s => championships(s) >= 3 },
  { id: 'champion-all', group: 'battle', name: '전 지방 제패', detail: '9개 지방 리그를 모두 제패했다.', test: s => championships(s) >= LEAGUE_REGIONS.length },
  { id: 'gear-all', group: 'battle', name: '모든 힘을 손에', detail: '메가진화·Z기술·다이맥스·거다이맥스·테라스탈 장비를 모두 얻었다.', test: s => s.game.gear.length >= 5 },
  { id: 'married', group: 'life', name: '평생의 반려', detail: '결혼했다.', test: s => s.relationship.status === 'married' },
  { id: 'family-2', group: 'life', name: '든든한 가족', detail: '자녀가 둘 이상이다.', test: s => s.relationship.children >= 2 },
  { id: 'career-top', group: 'life', name: '업계의 정점', detail: '경력 5단계에 올랐다.', test: s => (s.careerRank || 0) >= 5 },
  { id: 'rich', group: 'life', name: '부호', detail: '소지금 30,000P를 넘겼다.', test: s => s.money >= 30000 },
  { id: 'legendary-name', group: 'life', name: '살아 있는 전설', detail: '명성 85에 도달했다.', test: s => s.reputation >= 85 },
  { id: 'age-90', group: 'life', name: '장수', detail: '90세를 넘겼다.', test: s => s.age >= 90 },
  { id: 'age-100', group: 'life', name: '백 년의 트레이너', detail: '100세를 넘겼다.', test: s => s.age >= 100 },
  { id: 'late-bloomer', group: 'life', name: '노력의 천재', detail: '기초형 재능으로 리그 정상에 올랐다.', test: s => s.talent?.level === 1 && championships(s) >= 1 },
  { id: 'genius', group: 'life', name: '천재의 삶', detail: '천재 재능을 타고났다.', test: s => s.talent?.level === 5 },
  { id: 'towns-15', group: 'world', name: '방랑자', detail: '마을 15곳에 머물렀다.', test: s => s.visited.length >= 15 },
  { id: 'regions-all', group: 'world', name: '세계 일주', detail: '9개 지방에 모두 머물렀다.', test: s => regionsVisited(s).length >= REGIONS.length },
  { id: 'homebody', group: 'world', name: '고향 지킴이', detail: '태어난 마을을 떠나지 않고 60세를 넘겼다.', test: s => s.age >= 60 && s.visited.length === 1 },
  { id: 'heir', group: 'legacy', name: '이어진 알', detail: '선대에게 물려받은 알에서 파트너가 태어났다.', test: s => Boolean(s.heritage) },
  { id: 'generation-3', group: 'legacy', name: '3대째 트레이너', detail: '가문의 세 번째 세대가 되었다.', test: s => (s.heritage?.generation || 1) >= 3 },
  { id: 'generation-5', group: 'legacy', name: '5대째 트레이너', detail: '가문의 다섯 번째 세대가 되었다.', test: s => (s.heritage?.generation || 1) >= 5 },
  { id: 'ancestor-partner', group: 'legacy', name: '선대의 동료', detail: '선대의 파트너를 다시 동료로 맞았다.', test: s => Boolean(s.flags['heritage-old-partner']) },
  { id: 'starter-pick', group: 'legacy', name: '가문의 계열', detail: '가문이 함께해 온 계열에서 첫 파트너를 골랐다.', test: s => Boolean(s.starter) },
  // 파트너
  { id: 'nickname', group: 'partner', name: '이름을 지어 준 날', detail: '동료에게 별명을 지어 주었다.', test: s => members(s).some(m => m.nickname) },
  { id: 'partner-50-wins', group: 'partner', name: '오십 번의 승리', detail: '한 동료가 배틀에서 50번 이겼다.', test: s => members(s).some(m => (m.wins || 0) >= 50) },
  { id: 'evolved-twice', group: 'partner', name: '두 번의 진화', detail: '한 동료가 두 번 진화했다.', test: s => members(s).some(m => (m.evolutions?.length || 0) >= 2) },
  { id: 'partner-70', group: 'partner', name: '칠십 년의 우정', detail: '첫 파트너와 70년을 함께했다.', test: s => members(s).some(m => m.origin === 'partner' && s.age - m.joined >= 70) },
  { id: 'party-100', group: 'partner', name: '정점의 파티', detail: '파티 6마리가 모두 Lv.100이다.', test: s => s.party.length >= PARTY_LIMIT && s.party.every(m => xpLevel(m) >= 100) },
  // 콘테스트
  { id: 'ribbon-first', group: 'contest', name: '첫 리본', detail: '콘테스트에서 처음 우승했다.', test: s => ribbonCount(s) >= 1 },
  { id: 'ribbon-10', group: 'contest', name: '리본 열 개', detail: '리본 10개를 모았다.', test: s => ribbonCount(s) >= 10 },
  { id: 'ribbon-master', group: 'contest', name: '마스터랭크', detail: '마스터랭크에서 우승했다.', test: s => masterRibbons(s) >= 1 },
  { id: 'ribbon-all', group: 'contest', name: '리본 마스터', detail: '다섯 부문의 마스터랭크 리본을 모두 모았다.', test: s => masterRibbons(s) >= Object.keys(CONTEST_CATEGORIES).length },
  { id: 'grand-festival', group: 'contest', name: '그랜드 페스티벌', detail: '그랜드 페스티벌 무대에 섰다.', test: s => Boolean(s.flags['contest-grand']) },
  { id: 'ribbon-carrier', group: 'contest', name: '리본을 단 동료', detail: '한 동료가 리본 5개를 달았다.', test: s => members(s).some(m => (m.ribbons?.length || 0) >= 5) },
  // 배틀 시설
  { id: 'frontier-pass', group: 'frontier', name: '프런티어 패스', detail: '배틀프런티어 패스를 받았다.', test: s => Boolean(s.flags['frontier-pass']) },
  { id: 'frontier-silver', group: 'frontier', name: '실버 심볼', detail: '배틀프런티어 심볼을 처음 받았다.', test: s => frontierSymbols(s) >= 1 },
  { id: 'frontier-gold', group: 'frontier', name: '골드 심볼', detail: '골드 심볼을 받았다.', test: s => frontierGold(s) >= 1 },
  { id: 'frontier-7', group: 'frontier', name: '일곱 개의 심볼', detail: '프런티어 7개 시설의 심볼을 모두 받았다.', test: s => frontierSymbols(s) >= 7 },
  { id: 'frontier-master', group: 'frontier', name: '프런티어 정복', detail: '7개 시설의 골드 심볼을 모두 받았다.', test: s => frontierGold(s) >= 7 },
  { id: 'facility-top', group: 'frontier', name: '전광판의 이름', detail: '지방 배틀 시설의 최고 기록 단계에 올랐다.', test: s => REGION_FACILITIES.some(f => facilityTier(s, f.id) >= 3) },
  { id: 'facility-tour', group: 'frontier', name: '시설 순례', detail: '지방 배틀 시설 기록 단계 합계 8 이상.', test: s => facilityStreaks(s) >= 8 },
  // 삶 (연간 기록)
  { id: 'comeback', group: 'life', name: '재기', detail: '빈털터리가 된 뒤 다시 10,000P를 모았다.', test: s => { const h = s.history || []; const low = h.findIndex(r => r.money < 100 && r.age >= 18); return low >= 0 && h.slice(low).some(r => r.money >= 10000); } },
  { id: 'peak-50000', group: 'life', name: '대부호', detail: '한때 소지금 50,000P를 넘겼다.', test: s => (s.history || []).some(r => r.money >= 50000) || s.money >= 50000 },
  { id: 'joy-100', group: 'life', name: '더할 나위 없는 해', detail: '행복이 100에 닿은 해가 있었다.', test: s => (s.history || []).some(r => r.joy >= 100) },
  { id: 'young-champion', group: 'battle', name: '어린 챔피언', detail: '20세 이전에 리그 정상에 올랐다.', test: s => { const age = historyHighlights(s)?.firstTitleAge; return age !== null && age !== undefined && age < 20; } },
  { id: 'late-champion', group: 'battle', name: '늦깎이 챔피언', detail: '60세가 넘어 처음 리그 정상에 올랐다.', test: s => (historyHighlights(s)?.firstTitleAge ?? 0) >= 60 },
  // 악당 조직 · 취미 · 마을 · 일상
  { id: 'villain-1', group: 'battle', name: '음모를 막은 사람', detail: '한 지방의 악당 조직 이야기를 끝까지 해결했다.', test: s => villainArcs(s) >= 1 },
  { id: 'villain-3', group: 'battle', name: '세 지방의 수호자', detail: '세 지방의 악당 조직 이야기를 해결했다.', test: s => villainArcs(s) >= 3 },
  { id: 'villain-all', group: 'battle', name: '모든 음모의 끝', detail: '9개 지방의 악당 조직 이야기를 모두 해결했다.', test: s => villainArcs(s) >= 9 },
  { id: 'rod-super', group: 'hobby', name: '대단한낚싯대', detail: '낚시 끝에 대단한낚싯대를 손에 넣었다.', test: s => Boolean(s.flags['hobby-rod-super']) },
  { id: 'fish-legend', group: 'hobby', name: '전설의 월척', detail: '낚시꾼들 사이에 전해지는 월척을 낚았다.', test: s => Boolean(s.flags['hobby-fish-legend']) },
  { id: 'berry-master', group: 'hobby', name: '나무열매 명인', detail: '나무열매 농사를 끝까지 일궜다.', test: s => Boolean(s.flags['hobby-berry-master']) },
  { id: 'photo-book', group: 'hobby', name: '사진집', detail: '포켓몬 사진집을 펴냈다.', test: s => Boolean(s.flags['hobby-photo-book']) },
  { id: 'hobbies-15', group: 'hobby', name: '다채로운 취미', detail: '취미·축제 사건을 15가지 겪었다.', test: s => seenEvents(s, 'hobby-') >= 15 },
  { id: 'towns-stories-12', group: 'world', name: '마을의 이야기꾼', detail: '마을 고유 사건을 12가지 겪었다.', test: s => seenEvents(s, 'town-') >= 12 },
  { id: 'types-10', group: 'partner', name: '타입 박사', detail: '포켓몬 타입·종과 얽힌 생활 사건을 10가지 겪었다.', test: s => seenEvents(s, 'type-') + seenEvents(s, 'species-') >= 10 },
  { id: 'grandchild', group: 'life', name: '손주의 웃음', detail: '손주를 보았다.', test: s => Boolean(s.flags['lc-grandkid']) },
  { id: 'child-wedding', group: 'life', name: '아이의 결혼식', detail: '아이의 결혼식을 지켜보았다.', test: s => Boolean(s.flags['lc-kid-wed']) },
  { id: 'self-made-50', group: 'life', name: '스스로 걸어온 길', detail: '캐릭터가 스스로 정한 일이 50가지를 넘었다.', test: s => s.log.filter(e => e.auto).length >= 50 },
  // 그늘의 길
  { id: 'outlaw', group: 'dark', name: '그늘로 들어선 날', detail: '악당 조직에 들어갔다.', test: s => isOutlaw(s) || Boolean(s.flags['syndicate-region']) },
  { id: 'syndicate-boss', group: 'dark', name: '두목', detail: '조직의 정점에 올랐다.', test: s => isOutlaw(s) && (s.careerRank || 0) >= 5 },
  { id: 'infamy-60', group: 'dark', name: '수배 전단', detail: '악명 60을 넘겨 수배됐다.', test: s => isWanted(s) || (s.history || []).some(r => (r.infamy ?? 0) >= 60) },
  { id: 'arrested', group: 'dark', name: '철창 너머', detail: '체포되어 복역했다.', test: s => Boolean(s.flags.arrested) || (s.prison || 0) > 0 },
  { id: 'redeemed', group: 'dark', name: '돌아온 길', detail: '조직을 떠나 악명을 10 아래로 되돌렸다.', test: s => Boolean(s.flags['syndicate-region']) && !isOutlaw(s) && infamyOf(s) < 10 && (s.history || []).some(r => (r.infamy ?? 0) >= 30) },
  { id: 'bankrupt', group: 'dark', name: '빈손', detail: '파산했다.', test: s => Boolean(s.flags.bankrupt) },
  { id: 'debt-free', group: 'dark', name: '빚을 갚은 날', detail: '빚 3,000P 이상을 지고도 모두 갚았다.', test: s => debtOf(s) === 0 && (s.history || []).some(r => (r.debt ?? 0) >= 3000) },
  { id: 'lost-companion', group: 'dark', name: '빈 몬스터볼', detail: '동료를 영영 잃었다.', test: s => (s.flags.lost || 0) >= 1 },
  { id: 'survivor', group: 'dark', name: '그래도 살아남다', detail: '빚·복역·동료 상실 중 둘 이상을 겪고 80세를 넘겼다.', test: s => s.age >= 80 && [Boolean(s.flags.bankrupt) || (s.history || []).some(r => (r.debt ?? 0) > 0), Boolean(s.flags.arrested), (s.flags.lost || 0) >= 1].filter(Boolean).length >= 2 },
  // 난이도
  { id: 'hard-life', group: 'challenge', name: '어려움 완주', detail: '어려움 이상으로 삶을 끝까지 살았다.', test: s => finished(s) && difficultyRank(s) >= 2 },
  { id: 'legend-life', group: 'challenge', name: '레전드 생존', detail: '레전드 난이도로 삶을 끝까지 살았다.', test: s => finished(s) && difficultyOf(s) === 'legend' },
  { id: 'legend-80', group: 'challenge', name: '레전드 장수', detail: '레전드 난이도로 80세를 넘겼다.', test: s => difficultyOf(s) === 'legend' && s.age >= 80 },
  { id: 'hard-champion', group: 'challenge', name: '가혹한 정상', detail: '어려움 이상에서 리그 정상에 올랐다.', test: s => difficultyRank(s) >= 2 && championships(s) >= 1 },
  { id: 'legend-champion', group: 'challenge', name: '전설 위의 전설', detail: '레전드 난이도로 리그 정상에 올랐다.', test: s => difficultyOf(s) === 'legend' && championships(s) >= 1 },
  { id: 'legend-rich', group: 'challenge', name: '맨땅의 금고', detail: '레전드 난이도로 10,000P를 모았다.', test: s => difficultyOf(s) === 'legend' && (s.money >= 10000 || (s.history || []).some(r => r.money >= 10000)) },
  // 도전 규칙
  ...Object.entries(RULES).map(([id, rule]) => ({ id: `rule-${id}`, group: 'challenge', name: `${rule.name} 완주`, detail: `‘${rule.name}’ 규칙으로 삶을 끝까지 살았다.`, test: s => finished(s) && hasRule(s, id) })),
  { id: 'rule-solo-champion', group: 'challenge', name: '단짝 챔피언', detail: '‘단짝 여행’ 규칙으로 리그 정상에 올랐다.', test: s => hasRule(s, 'solo') && championships(s) >= 1 },
  { id: 'rule-hard-champion', group: 'challenge', name: '강적의 시대를 넘어', detail: '‘강적의 시대’ 규칙으로 리그 정상에 올랐다.', test: s => hasRule(s, 'hard') && championships(s) >= 1 },
  { id: 'rule-poor-rich', group: 'challenge', name: '맨손의 부', detail: '‘무일푼 출발’로 30,000P를 모았다.', test: s => hasRule(s, 'poor') && (s.history || []).some(r => r.money >= 30000) },
  { id: 'rule-triple', group: 'challenge', name: '삼중고', detail: '도전 규칙 3개 이상으로 삶을 마쳤다.', test: s => finished(s) && (s.rules?.length || 0) >= 3 },
];

export const medalsOf = s => MEDALS.filter(m => m.test(s)).map(m => m.id);

// ── Trainer card ──
// Five stars, like the trainer card in the main series. Each is earned by a different kind of life.
export const STARS = [
  { id: 'league', name: '리그 정상', test: s => championships(s) >= 1 },
  { id: 'dex', name: '도감 200종', test: s => s.seen.length >= 200 },
  { id: 'legend', name: '전설의 동행', test: s => members(s).some(m => m.locked) },
  { id: 'badges', name: '배지 24개', test: s => badgeCount(s) >= 24 },
  { id: 'battles', name: '배틀 100승', test: s => s.game.wins >= 100 },
];
export const CARD_COLORS = ['basic', 'green', 'blue', 'red', 'silver', 'gold'];

/** A title for the whole life, from the most remarkable thing in it. */
export function epithet(s) {
  const titles = titlesOf(s);
  if (isOutlaw(s) && (s.careerRank || 0) >= 5) return `${syndicateName(s)}의 두목`;
  if (isWanted(s)) return '수배 중인 무법자';
  if (isOutlaw(s)) return `${syndicateName(s)} ${careerTitle(s)}`;
  if (infamyOf(s) >= 35) return '악명 높은 트레이너';
  if (titles.length >= LEAGUE_REGIONS.length) return '전 지방의 챔피언';
  if (titles.length >= 2) return `${titles.length}개 지방의 챔피언`;
  if (titles.length === 1) return `${titles[0].name} 챔피언`;
  if (members(s).filter(m => m.locked).length >= 2) return '전설과 함께한 트레이너';
  if (s.seen.length >= 250) return '살아 있는 도감';
  if (s.career === 'researcher' && s.careerRank >= 3) return '포켓몬 박사';
  if (s.career === 'keeper' && s.careerRank >= 3) return '키우미집 명인';
  if (s.career === 'merchant' && s.money >= 20000) return '이름난 상인';
  if (badgeCount(s) >= 8) return '배지 수집가';
  if (s.visited.length >= 12) return '떠돌이 트레이너';
  if (s.relationship.children >= 2) return '든든한 부모';
  if (s.party.some(m => m.origin === 'partner' && m.affection >= 90)) return '파트너의 단짝';
  return '평범하고 따뜻한 트레이너';
}

/** The trainer card shown at the end of a life (and on the hall of past lives). */
export function trainerCard(s) {
  const stars = STARS.filter(star => star.test(s)).map(star => star.id);
  return { name: s.name, gender: s.gender, epithet: epithet(s), stars, color: CARD_COLORS[stars.length],
    badges: badgeCount(s), champions: titlesOf(s).map(r => r.id), seen: s.seen.length, owned: ownedSpecies(s).length,
    wins: s.game.wins, reputation: s.reputation, money: s.money, age: s.age, generation: s.heritage?.generation || 1,
    ribbons: ribbonCount(s), symbols: frontierSymbols(s), facility: facilityStreaks(s), rules: [...(s.rules || [])],
    infamy: infamyOf(s), title: careerTitle(s), career: s.career, difficulty: difficultyOf(s) };
}

// ── Ending cards ──
// A set of collectible cards for one life. Each card has a stable id (kind + subject) so the hall can count them.
const card = (kind, subject, rarity, title, body, extra = {}) => ({ id: `${kind}:${subject}`, kind, rarity, title, body, ...extra });

export function endingCards(s) {
  const cards = [];
  const partner = members(s).find(m => m.origin === 'partner');
  const home = TOWNS.find(t => t.id === s.hometown);
  const titles = titlesOf(s);
  // 1. Hall of fame: the last party.
  cards.push(card('hall', 'party', titles.length ? 'epic' : 'common', titles.length ? '명예의 전당' : '마지막 파티',
    s.party.length ? `마지막까지 함께한 ${s.party.length}마리. ${s.party.map(m => `${poke(m.id)} Lv.${xpLevel(m)}`).join(' · ')}` : '파티 없이 마친 삶.',
    { party: s.party.map(m => ({ id: m.id, shiny: m.shiny, level: xpLevel(m) })) }));
  // 2. The first partner.
  if (partner) {
    const years = s.age - partner.joined, inParty = s.party.includes(partner);
    cards.push(card('partner', partner.id, xpLevel(partner) >= 100 || partner.affection >= 95 ? 'epic' : partner.affection >= 80 ? 'rare' : 'common', '첫 파트너',
      `${partner.joined}세에 만난 ${poke(partner.id, '과', '와')} ${years}년을 함께했다. Lv.${xpLevel(partner)} · 친밀도 ${partner.affection}.${inParty ? ' 마지막까지 파티의 선두를 지켰다.' : ' 마지막에는 PC 박스에서 쉬고 있었다.'}`,
      { pokemon: partner.id, shiny: partner.shiny }));
  }
  // 3. League titles.
  for (const r of titles) cards.push(card('champion', r.id, 'legendary', `${r.name} 챔피언`, `${r.champion}의 대표 팀을 꺾고 ${r.name} 리그 정상에 올랐다.`, { region: r.id }));
  // 4. Legendary and shiny companions.
  for (const m of members(s).filter(m => m.locked)) cards.push(card('legend', m.id, 'legendary', '전설의 동행', `${m.joined}세에 ${poke(m.id, '과', '와')} 함께하게 되었다.`, { pokemon: m.id, shiny: m.shiny }));
  for (const m of members(s).filter(m => m.shiny && !m.locked).slice(0, 3)) cards.push(card('shiny', m.uid, 'epic', '반짝이는 동료', `${m.joined}세에 만난 색이 다른 ${poke(m.id)}.`, { pokemon: m.id, shiny: true }));
  // 5. Badges, dex and gear.
  const badges = badgeCount(s);
  if (badges) cards.push(card('badges', 'case', badges >= 72 ? 'legendary' : badges >= 24 ? 'epic' : badges >= 8 ? 'rare' : 'common', '배지 케이스',
    `배지 ${badges}개. ${REGIONS.filter(r => s.game.badges[r.id]).map(r => `${r.name} ${s.game.badges[r.id]}`).join(' · ')}`, { badges: { ...s.game.badges } }));
  const dex = dexProgress(s.seen).filter(r => r.count);
  cards.push(card('dex', 'seen', s.seen.length >= 300 ? 'legendary' : s.seen.length >= 150 ? 'epic' : s.seen.length >= 60 ? 'rare' : 'common', '도감 기록',
    `관측 ${s.seen.length}종 · 함께한 종 ${ownedSpecies(s).length}종. ${dex.slice(0, 4).map(r => `${r.name} ${r.percent}%`).join(' · ')}`));
  // 6. People.
  const rival = s.cast.rival;
  if (rival?.met) cards.push(card('rival', 'rival', rival.power >= 70 ? 'rare' : 'common', '라이벌', `${josa(rival.name, '은', '는')} 끝까지 좋은 경쟁자였다. 마지막 기록의 실력 ${rival.power}, 관계 ${rival.affinity}.`));
  const friend = s.cast.friend;
  if (friend) cards.push(card('friend', 'friend', friend.affinity >= 80 ? 'rare' : 'common', '소꿉친구', `${home?.name}에서 함께 자란 ${friend.name}. 관계 ${friend.affinity}.`));
  if (s.relationship.status === 'married') cards.push(card('family', 'spouse', s.relationship.children ? 'rare' : 'common', '가족',
    `${josa(s.relationship.name, '과', '와')} ${s.relationship.marriedAt ?? '?'}세에 가정을 꾸렸다.${s.relationship.children ? ` 자녀 ${s.relationship.children}명.` : ''}`));
  // 7. Work, talent, travel.
  if (s.career) cards.push(card('career', s.career, s.careerRank >= 5 ? 'epic' : s.careerRank >= 3 ? 'rare' : 'common', CAREERS[s.career].name,
    `경력 ${s.careerRank || 0}단계 · ${s.work.years}년.${s.work.retired ? ' 정년까지 일을 마쳤다.' : ''}`));
  if (s.talent) cards.push(card('talent', s.talent.field, s.talent.level >= 5 ? 'epic' : s.talent.level >= 4 ? 'rare' : 'common', '타고난 재능',
    `${TALENT_FIELDS[s.talent.field].name} · ${TALENT_TIERS[s.talent.level]}.`));
  const regions = regionsVisited(s);
  cards.push(card('travel', 'route', regions.length >= 9 ? 'legendary' : regions.length >= 4 ? 'rare' : 'common', '발자취',
    `${home?.region} ${home?.name}에서 시작해 ${s.visited.length}곳의 마을, ${regions.length}개 지방에 머물렀다.`));
  if (s.heritage) cards.push(card('heritage', s.heritage.generation, 'rare', `${s.heritage.generation}대째 트레이너`,
    `${josa(s.heritage.ancestor, '이', '가')} 남긴 ${poke(s.heritage.egg, '의', '의')} 알에서 이 삶의 첫 파트너가 태어났다.`, { pokemon: s.heritage.egg }));
  // 8. Contests, battle facilities, the shape of the life, challenge rules.
  const ribbons = ribbonCount(s);
  if (ribbons) cards.push(card('ribbons', 'case', masterRibbons(s) >= 5 ? 'legendary' : masterRibbons(s) ? 'epic' : ribbons >= 6 ? 'rare' : 'common', '리본 케이스',
    `콘테스트 리본 ${ribbons}개 · 마스터랭크 ${masterRibbons(s)}개.${s.flags['contest-grand'] ? ' 그랜드 페스티벌 무대에 섰다.' : ''}`));
  const symbols = frontierSymbols(s), streaks = facilityStreaks(s);
  if (symbols || streaks) cards.push(card('frontier', 'symbols', frontierGold(s) >= 7 ? 'legendary' : frontierGold(s) ? 'epic' : symbols + streaks >= 4 ? 'rare' : 'common', '배틀 시설 기록',
    `프런티어 심볼 ${symbols}개(골드 ${frontierGold(s)}) · 지방 시설 기록 단계 합계 ${streaks}.`));
  const named = members(s).filter(m => m.nickname);
  if (named.length) { const fav = maxBy(named, m => m.affection);
    cards.push(card('named', fav.uid, fav.affection >= 90 ? 'rare' : 'common', `‘${fav.nickname}’`, `${poke(fav.id)}에게 지어 준 이름. ${fav.joined}세부터 함께했다.`, { pokemon: fav.id, shiny: fav.shiny })); }
  const warrior = members(s).length ? maxBy(members(s), m => m.wins || 0) : null;
  if (warrior && (warrior.wins || 0) >= 10) cards.push(card('ace', warrior.uid, warrior.wins >= 50 ? 'epic' : 'rare', '최다승 동료',
    `${poke(warrior.id, '이', '가')} 배틀 ${warrior.battles}번 중 ${warrior.wins}번 이겼다.`, { pokemon: warrior.id, shiny: warrior.shiny }));
  const high = historyHighlights(s);
  if (high) cards.push(card('graph', 'life', 'common', '인생 그래프',
    `가장 부유했던 해 ${high.richest.age}세(${high.richest.value.toLocaleString()}P) · 가장 행복했던 해 ${high.happiest.age}세 · 가장 힘들었던 해 ${high.hardest.age}세 · 평생 수입 ${high.totalIncome.toLocaleString()}P.`));
  const peakInfamy = Math.max(infamyOf(s), ...(s.history || []).map(r => r.infamy ?? 0));
  if (peakInfamy >= 15 || s.flags['syndicate-region']) cards.push(card('shadow', 'path', peakInfamy >= 60 ? 'legendary' : peakInfamy >= 35 ? 'epic' : 'rare', '그늘의 길',
    `${s.flags['syndicate-region'] ? `${syndicateName(s)}에 몸담았다. ` : ''}악명은 최고 ${peakInfamy}까지 올랐다.${s.flags.arrested ? ` ${s.flags.arrested}번 체포됐다.` : ''}${!isOutlaw(s) && s.flags['syndicate-region'] ? ' 끝내 조직을 떠났다.' : ''}`));
  if (s.flags.bankrupt || (s.flags.lost || 0) > 0) cards.push(card('hardship', 'life', 'rare', '잃은 것들',
    `${s.flags.bankrupt ? '파산을 겪었다. ' : ''}${s.flags.lost ? `동료 ${s.flags.lost}마리가 영영 떠났다. ` : ''}그래도 ${s.age}세까지 걸었다.`));
  if (s.rules?.length) cards.push(card('rules', s.rules.slice().sort().join('+'), s.rules.length >= 3 ? 'legendary' : s.rules.length === 2 ? 'epic' : 'rare', '도전 규칙',
    `${s.rules.map(id => RULES[id].name).join(' · ')} 규칙으로 ${s.age}세까지 살았다.`));
  // 9. The epitaph: always last.
  cards.push(card('epitaph', 'life', 'common', epithet(s), `${s.name}, ${s.age}세. ${GOALS[goalOf(s)].name}의 삶. 방문한 마을 ${s.visited.length}곳, 배틀 승리 ${s.game.wins}회, 내린 결정 ${s.log.filter(e => e.resolution).length}번.`));
  return cards;
}

// Every kind of ending card, for the collection book in the family hall.
export const CARD_KINDS = {
  hall: '명예의 전당 · 마지막 파티', partner: '첫 파트너', champion: '지방 챔피언', legend: '전설의 동행', shiny: '반짝이는 동료',
  badges: '배지 케이스', dex: '도감 기록', rival: '라이벌', friend: '소꿉친구', family: '가족', career: '직업', talent: '타고난 재능',
  travel: '발자취', heritage: '가문', ribbons: '리본 케이스', frontier: '배틀 시설 기록', named: '이름 지은 동료', ace: '최다승 동료',
  graph: '인생 그래프', rules: '도전 규칙', shadow: '그늘의 길', hardship: '잃은 것들', epitaph: '삶의 칭호',
};

