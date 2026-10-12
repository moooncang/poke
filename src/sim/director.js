import { TALENT_EVENTS } from '../data/talent-events.js';
import { ADVENTURE_SAGAS } from '../data/adventure-sagas.js';
import { BREEDING_EVENTS } from '../data/breeding-events.js';
import { CAREER_SAGAS } from '../data/career-sagas.js';
import { LEAGUE_SAGAS, LEAGUE_TRAVEL } from '../data/league-sagas.js';
import { goalWeight } from './goals.js';
import { hasPerk } from './perks.js';
import { diff } from './difficulty.js';
import { LEGACY_EVENTS } from '../data/legacy-events.js';
import { CONTEST_EVENTS } from '../data/contests.js';
import { FRONTIER_EVENTS } from '../data/frontier.js';
import { TOWN_STORIES } from '../data/town-stories.js';
import { TYPE_COMPANIONS } from '../data/type-companions.js';
import { VILLAIN_ARCS } from '../data/villain-arcs.js';
import { HOBBIES } from '../data/hobbies.js';
import { LIFE_CHAPTERS } from '../data/life-chapters.js';
import { MISFORTUNE } from '../data/misfortune.js';
import { VILLAIN_ROUTE } from '../data/villain-route.js';
// Picks each year's main event. Instead of a fixed age ladder, every pool is a "storylet" with conditions,
// and categories are weighted by the state of the world, the people around the player and their personality.
import { STORYLETS } from '../data/storylets.js';
import { MORE_LIFE } from '../data/more-life.js';
import { MORE_WORK } from '../data/more-work.js';
import { MORE_PLACES } from '../data/more-places.js';
import { careerReview, CAREER_REVIEWS, PROMOTION_REVIEW } from '../data/progression.js';
import { LIFE_STORYLETS } from '../data/life-events.js';
import { CHALLENGE_EVENTS, academyExam } from '../data/challenges.js';
import { BRANCH_EVENTS } from '../data/quests.js';
import { REGIONAL_EVENTS } from '../data/regional-stories.js';
import { relationshipEvent, romanceAvailable } from '../data/relationships.js';
import { TOWNS, NPCS } from '../data/world.js';
import { regionOf } from '../data/regions.js';
import { STAT_LABELS } from './labels.js';
import { josa, poke } from './text.js';
import { weighted, pick, hashSeed } from './random.js';
import { hasCondition, regionState, currentRegion } from './world.js';
import { badgeCount } from './battle.js';

const town = s => TOWNS.find(t => t.id === s.town);
const ownedLegends = s => [...s.party, ...s.box].filter(m => m.locked).length;

// ── Existing pools, extended with lasting consequences ──
const challengeStorylets = CHALLENGE_EVENTS.map(event => ({
  id: event.id, category: 'challenge', min: event.min, max: event.max,
  when: s => !event.married || s.relationship.status === 'married',
  build: () => ({ ...structuredClone(event), choices: event.choices.map(c => !c.challenge ? c : {
    ...structuredClone(c), effects: { ...c.effects, reputation: 2 },
    challenge: { ...structuredClone(c.challenge), failure: { ...structuredClone(c.challenge.failure),
      follow: [{ id: 'second-chance', delay: [2, 4], p: 0.35, data: { title: event.title, stat: c.challenge.stat, statLabel: STAT_LABELS[c.challenge.stat], difficulty: c.challenge.difficulty, success: c.outcome } }] } },
  }) }),
}));

const academyRetry = {
  id: 'academy-retry', category: 'challenge', min: 23, when: s => !s.flags['elite-academy'],
  build: () => ({ kind: 'choice', title: '아카데미 특별전형 추가 모집', body: '학교 밖 경험도 지원 자격으로 인정한다. 진학 여부를 다시 선택할 수 있다.',
    choices: [academyExam, { label: '현재 활동을 이어간다', description: '확정 결과 · 지혜 +3', effects: { wisdom: 3 }, outcome: '현재 활동을 계속하기로 했다.' }] }),
};

const routeStorylets = BRANCH_EVENTS.map(event => ({
  id: event.id, category: 'route', min: event.min, max: event.max, weight: () => event.requires ? 3 : 1,
  when: s => !event.requires || s.flags[event.requires],
  build: () => {
    const copy = structuredClone(event);
    if (event.requires) {
      const [complete, team, research] = copy.choices;
      complete.effects.reputation = 3;
      team.follow = [{ id: 'old-teammate', delay: [5, 12], p: 0.5, data: { route: event.title } }];
      research.follow = [{ id: 'paper-cited', delay: [4, 9], p: 0.4 }];
    }
    return copy;
  },
}));

const regionalStorylets = REGIONAL_EVENTS.map(event => ({
  id: event.id, category: 'regional', min: event.min, max: event.max, weight: () => event.requires ? 3 : 1,
  when: s => (!event.region || event.region === currentRegion(s)) && (!event.requires || s.flags[event.requires]),
  build: () => {
    const copy = structuredClone(event);
    copy.choices.forEach((c, i) => { c.world = event.requires ? (i === 0 ? { safety: 5 } : { safety: 3, ecology: 3 }) : { safety: 2 }; if (event.requires) c.effects.reputation = 3; });
    return copy;
  },
}));

// Career reviews are guaranteed once per career stage, at a life-specific age within the first years of the stage.
const careerReviews = Object.keys(CAREER_REVIEWS).map(Number).filter(phase => phase > 16).map(phase => ({
  id: `career-review-${phase}`, category: 'career', min: phase, max: phase + 3,
  urgent: s => s.age >= phase + hashSeed(`${s.seed}-career-${phase}`) % 3,
  build: s => careerReview(s, phase),
}));

const romance = { id: 'romance', category: 'romance', once: false, min: 19, when: romanceAvailable, build: relationshipEvent,
  cooldown: s => ['friends', 'dating', 'engaged'].includes(s.relationship.status) ? 1 : 3 };

// ── Special encounters ──
const legendEncounter = {
  id: 'legend-encounter', category: 'legend', once: false, cooldown: 5, min: 16,
  when: s => s.party.length && regionOf(town(s)).legend.some(id => !s.flags[`legend-${id}`]),
  build: s => {
    const id = pick(s, regionOf(town(s)).legend.filter(x => !s.flags[`legend-${x}`]));
    s.flags[`legend-${id}`] = true;
    const capture = 30 - badgeCount(s) * 2 - (s.flags['legend-quest'] ? 10 : 0);
    const returns = p => ({ id: 'legend-return', delay: [4, 10], p, data: { id } });
    return { kind: 'choice', title: '전설의 포켓몬 출현', memory: true,
      body: `${town(s).region}지방 깊은 곳에서 전설의 포켓몬 ${poke(id, '과', '와')} 마주쳤다. 손에 넣는다면 언제나 파티에 함께한다.`,
      encounter: { type: 'legendary', pokemonId: id, title: '전설의 포켓몬 출현', subtitle: 'LEGENDARY ENCOUNTER', body: '지방 조사 중 전설의 포켓몬을 관측했다. 이제 어떻게 할지 정해야 한다.' },
      choices: [
        { label: '포획을 시도한다', tone: 'bold', description: '용기 판정 · 성공하면 파티에 고정 합류', join: id, joinOrigin: 'legend', effects: { joy: 15, courage: 8, reputation: 10 }, outcome: `몬스터볼이 세 번 흔들리고 멈췄다. ${poke(id, '이', '가')} 파티에 합류했다.`,
          challenge: { stat: 'courage', difficulty: capture, failure: { effects: { courage: 3 }, follow: [returns(0.5)], outcome: '볼에서 빠져나온 전설의 포켓몬은 하늘 너머로 사라졌다.' } } },
        { label: '곁에서 신뢰를 쌓는다', tone: 'caring', description: '유대 판정 · 성공하면 스스로 따라온다', join: id, joinOrigin: 'legend', effects: { joy: 15, bond: 10, reputation: 8 }, outcome: '오랜 시간 곁을 지키자 전설의 포켓몬이 먼저 다가왔다.',
          challenge: { stat: 'bond', difficulty: capture - 5, failure: { effects: { bond: 4 }, follow: [returns(0.7)], outcome: '전설의 포켓몬은 한동안 지켜보다가 떠났다. 다시 만날 것 같은 예감이 든다.' } } },
        { label: '관찰만 하고 보내준다', tone: 'curious', description: '지혜 +8 · 명성 +3', effects: { wisdom: 8, joy: 10, reputation: 3 }, follow: [returns(0.4)], outcome: '관측 기록을 남기고 조용히 길을 비켜 주었다.' },
      ] };
  },
};

const shinyEncounter = {
  id: 'shiny-encounter', category: 'special', min: 12, weight: s => (0.5 + regionState(s).ecology / 100) * (hasPerk(s, 'shiny-charm') ? 3 : 1),
  build: s => ({ kind: 'encounter', title: '색이 다른 포켓몬 출현', body: '풀숲 사이로 낯익고도 낯선 색이 반짝인다. 특별한 색의 포켓몬이 고개를 갸웃하더니 당신의 발걸음을 따라오기 시작했다.', effects: { joy: 10, bond: 4 },
    encounter: { type: 'shiny', pokemonId: pick(s, town(s).pool), join: true, title: '색이 다른 포켓몬 출현', subtitle: 'SHINY ENCOUNTER', body: '특별한 색의 포켓몬이 따라오기 시작했다.' } }),
};

const npcPool = s => (town(s).region === '관동' ? ['misty', 'brock', 'erika', 'red'] : ['steven', 'brock', 'red']).filter(id => !s.people.some(p => p.id === id));
const npcEncounter = {
  id: 'npc-meet', category: 'special', once: false, cooldown: 6, min: 15, when: s => npcPool(s).length > 0,
  build: s => { const npc = pick(s, npcPool(s));
    return { kind: 'encounter', title: '유명 트레이너와의 교류', body: `잠시 쉬어 가던 길에서 ${josa(NPCS[npc].name, '과', '와')} 마주쳤다. 포켓몬 이야기를 나누다 보니 해가 기울어 있었다.`, effects: { wisdom: 7, courage: 5 },
      encounter: { type: 'npc', npc, title: '유명 트레이너와의 교류', subtitle: 'TRAINER ENCOUNTER', body: '' } }; },
};

const yearlyPlan = {
  id: 'yearly-plan', category: 'plan', once: false, min: 6,
  build: s => { const focus = s.activity?.mode;
    return { kind: 'choice', title: '올해의 활동 계획', body: `${town(s).name}에서 올해 무엇에 힘을 쏟을지 정한다.`, choices: [
      { label: '현장 배틀 훈련', tone: 'bold', description: `용기 +${focus === 'courage' ? 7 : 5} · 건강 −2 · 파티 경험치 +20`, training: 20, effects: { courage: focus === 'courage' ? 7 : 5, vitality: -2 }, outcome: '현장 훈련을 완료하고 전술 경험을 쌓았다.' },
      { label: '서식지 조사 수행', tone: 'curious', description: `지혜 +${focus === 'wisdom' ? 7 : 5} · 연구비 100P`, effects: { wisdom: focus === 'wisdom' ? 7 : 5, money: 100 }, outcome: '관찰 기록을 연구소에 제출했다.' },
      { label: '파트너 돌봄과 휴식', tone: 'caring', description: `유대 +${focus === 'bond' ? 7 : 5} · 건강 +4`, effects: { bond: focus === 'bond' ? 7 : 5, vitality: 4 }, outcome: '파트너를 돌보고 체력을 회복했다.' },
    ] }; },
};

export const ALL_STORYLETS = [...TALENT_EVENTS, ...ADVENTURE_SAGAS, ...BREEDING_EVENTS, ...CAREER_SAGAS, ...LEAGUE_SAGAS, ...LEAGUE_TRAVEL, ...LEGACY_EVENTS, ...CONTEST_EVENTS, ...FRONTIER_EVENTS, ...TOWN_STORIES, ...TYPE_COMPANIONS, ...VILLAIN_ARCS, ...HOBBIES, ...LIFE_CHAPTERS, ...MISFORTUNE, ...VILLAIN_ROUTE, ...STORYLETS, ...MORE_LIFE, ...MORE_WORK, ...MORE_PLACES, ...careerReviews, PROMOTION_REVIEW, ...LIFE_STORYLETS, ...challengeStorylets, academyRetry, ...routeStorylets, ...regionalStorylets,
  romance, legendEncounter, shinyEncounter, npcEncounter, yearlyPlan];

// How strongly each kind of event pulls this year. Only categories with an available event compete.
const CATEGORY_WEIGHT = {
  league: s => Object.keys(s.flags).some(k=>k.startsWith('league-')&&k.endsWith('-licensed')) ? 7 : s.career==='traveler' ? 3 : 1,
  contest: s => 0.7 + (s.flags['contest-registered'] ? 0.6 : 0),
  frontier: () => 0.9,
  prison: () => 5,
  dark: s => ((s.career === 'syndicate' ? 3.5 : 2.5) + (s.infamy || 0) / 40 + (hasCondition(s, 'syndicate') ? 0.8 : 0)) * diff(s, 'dark'),
  misfortune: s => (3 + (s.money <= 0 ? 0.8 : 0) + ((s.debt || 0) > 0 ? 0.8 : 0) + (s.stats.vitality < 40 ? 0.8 : 0) + (regionState(s).safety < 40 ? 0.8 : 0)) * diff(s, 'misfortune'),
  childhood: () => 3,
  career: () => 3,
  stage: () => 1.8,
  family: () => 1.4,
  pokemon: () => 1.2,
  work: () => 1.6,
  cast: () => 2.4,
  world: () => 3,
  opportunity: () => 1.6,
  romance: s => ({ single: s.age < 40 ? 2 : 0.8, friends: 3, dating: 6, engaged: 8, married: 1.5 })[s.relationship.status] ?? 1,
  challenge: () => 1.3,
  route: () => 1.3,
  regional: s => 1 + (hasCondition(s, 'syndicate') ? 1.5 : 0) + (regionState(s).safety < 40 ? 0.7 : 0),
  local: () => 1,
  field: () => 1.2,
  legend: s => (0.45 + (hasCondition(s, 'legend') ? 2 : 0) + (s.flags['legend-quest'] ? 1.2 : 0) + (regionState(s).ecology > 70 ? 0.3 : 0)) * 0.4 ** ownedLegends(s),
  special: () => 0.5,
  plan: () => 0.25,
};

const available = (s, st) => s.age >= (st.min ?? 0) && s.age <= (st.max ?? 120)
  && (st.once === false ? s.age - (s.cooldowns[st.id] ?? -99) >= (typeof st.cooldown === 'function' ? st.cooldown(s) : st.cooldown ?? 1) : !s.used.includes(st.id))
  && (!st.when || Boolean(st.when(s)));

// Small, everyday kinds of events the character may settle alone between the player's decisions.
// People (cast) and regional (world) events stay with the player: they shape relationships and investments.
export const AUTO_CATEGORIES = ['local', 'pokemon', 'stage', 'family', 'opportunity', 'work', 'childhood'];

/**
 * Chooses and builds this year's main event (mutates RNG and usage bookkeeping).
 * With `auto`, only non-urgent everyday events are considered (an event the character decides alone).
 */
export function directEvent(s, { auto = false } = {}) {
  const groups = {};
  // Behind bars only prison events happen (and nothing is settled alone).
  const jailed = (s.prison || 0) > 0;
  if (jailed && auto) return null;
  const open = ALL_STORYLETS.filter(st => available(s, st) && (!jailed || st.category === 'prison')
    && (!auto || AUTO_CATEGORIES.includes(st.category) && !(typeof st.urgent === 'function' ? st.urgent(s) : st.urgent)));
  if (auto) {
    if (!open.length) return null;
    const category = weighted(s, [...new Set(open.map(st => st.category))], c => CATEGORY_WEIGHT[c](s) * goalWeight(s, c));
    const storylet = weighted(s, open.filter(st => st.category === category), st => st.weight?.(s) ?? 1);
    if (storylet.once === false) s.cooldowns[storylet.id] = s.age; else s.used.push(storylet.id);
    const event = storylet.build(s);
    return event?.choices?.length && !event.encounter ? { ...event, id: storylet.once === false ? `${storylet.id}@${s.age}` : storylet.id } : null;
  }
  // Urgent storylets (a death in the family, a crisis) take the year when they become possible.
  const urgent = open.filter(st => typeof st.urgent === 'function' ? st.urgent(s) : st.urgent);
  // A farewell cannot be postponed by routine overdue encounters or league invitations.
  const farewell = open.filter(st => st.id === 'family-farewell');
  for (const st of farewell.length ? farewell : urgent.length ? urgent : open) (groups[st.category] ||= []).push(st);
  // The player's life goal tilts the categories (see sim/goals.js).
  const category = weighted(s, Object.keys(groups), c => CATEGORY_WEIGHT[c](s) * goalWeight(s, c));
  if (!category) return null;
  const storylet = weighted(s, groups[category], st => (st.weight?.(s) ?? 1) * (hasPerk(s, 'oval-charm') && st.id.startsWith('nursery-') ? 2 : 1));
  if (storylet.once === false) s.cooldowns[storylet.id] = s.age; else s.used.push(storylet.id);
  const event = storylet.build(s);
  return event && { ...event, id: storylet.once === false ? `${storylet.id}@${s.age}` : storylet.id };
}

