import { annualTraining, careerMilestone } from './data/progression.js';
import { activityRecord } from './data/activity-records.js';
import { BACKGROUNDS, ENVIRONMENTS, seasonalEvent, wildEncounter, resolveSimulation } from './data/life-events.js';
import { relationshipEvent, resolveRelationship } from './data/relationships.js';
import { MEGA, maxHP, trainParty } from './game.js';
import { BRANCH_EVENTS } from './data/quests.js';
import { CHALLENGE_EVENTS, academyExam, successChance } from './data/challenges.js';
export { successChance } from './data/challenges.js';
import { REGIONAL_EVENTS } from './data/regional-stories.js';
import { regionOf } from './data/regions.js';
import { ensureGame, freshGame } from './game.js';
import { TOWNS, CAREERS, NPCS, EVENTS, WORK_EVENTS, FAMILY, TRAITS } from './data/world.js';

export const SAVE_KEY = 'pokelife.story.v1';
export const VERSION = 1;
export const GENDERS = {male:'남성',female:'여성',unspecified:'미지정'};
export const STAT_LABELS = { joy: '행복', vitality: '건강', courage: '용기', wisdom: '지혜', bond: '유대' };
const EVOLUTIONS = { 10: 12, 13: 15, 16: 17, 19: 20, 25: 26, 29: 30, 35: 36, 37: 38, 41: 42, 43: 44, 52: 53, 54: 55, 60: 61, 69: 70, 72: 73, 74: 75, 81: 82, 92: 93, 98: 99, 104: 105, 118: 119, 120: 121, 129: 130, 133: 196, 218: 219, 261: 262, 263: 264, 265: 267, 270: 271, 273: 274, 276: 277, 278: 279, 280: 281, 285: 286, 287: 288, 298: 183, 300: 301, 320: 321, 322: 323, 353: 354, 363: 364 };

export function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}
function random(state) {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}
function pick(state, values) { return values[Math.floor(random(state) * values.length)]; }
export function townOf(state) { return TOWNS.find(t => t.id === state.town); }
export function stageOf(age) { return age < 6 ? '유년기' : age < 16 ? '초보 트레이너' : age < 30 ? '성인기' : age < 55 ? '전성기' : age < 70 ? '중년기' : '노년기'; }
export function partnerOf(state) { return state.party[0] || null; }

function apply(state, effects = {}) {
  for (const [key, value] of Object.entries(effects)) {
    if (key === 'money') state.money = Math.max(0, state.money + value);
    else if (key in state.stats) state.stats[key] = Math.min(100, Math.max(0, state.stats[key] + value));
  }
}
function remember(state, entry) {
  if (!state.memories.includes(entry.id)) state.memories.push(entry.id);
}
function log(state, event) {
  if (event.choices && recordsSinceDecision(state) < recordGap(state)) {
    state.scheduledEvent = event;
    return log(state, activityRecord(state, townOf(state)));
  }
  const entry = { age: state.age, season: state.season ?? 0,
    town: state.town, partnerId: state.party[0]?.id || null, kind: 'life', effects: {}, ...event, sourceId: event.id || null,
    id: `${state.seed}-${state.age}-${state.log.length}` };
  state.log.push(entry);
  apply(state, entry.effects);
  if (entry.memory || ['encounter', 'milestone', 'choice', 'ending'].includes(entry.kind)) remember(state, entry);
  if (entry.choices) state.pending = entry.id;
  if (entry.encounter) state.encounter = { ...entry.encounter, logId: entry.id };
  return state;
}
function seen(state, pokemonId) {
  if (!state.seen.includes(pokemonId)) state.seen.push(pokemonId);
}
function encounter(state, data) {
  if (data.pokemonId) seen(state, data.pokemonId);
  if (data.npc && !state.people.some(person => person.id === data.npc)) state.people.push({ id: data.npc, age: state.age });
  if (data.join) { state.party.push({ id: data.pokemonId, joined: state.age, shiny: data.type === 'shiny' }); ensureGame(state); }
  return log(state, { title: data.title, body: data.body, kind: 'encounter', effects: data.effects || { joy: 8 }, encounter: data });
}

export function createLife({ name = '하루', seed = String(Date.now()), town = 'random', gender = 'random' } = {}) {
  const state = { version: VERSION, name: name.trim().slice(0, 12) || '하루', seed: String(seed).slice(0, 40), rng: hashSeed(seed), age: 0,
    town: '', hometown: '', family: '', trait: '', career: null, money: 1800,
    stats: { joy: 72, vitality: 85, courage: 32, wisdom: 18, bond: 0 }, party: [], box: [], people: [], seen: [],
    log: [], memories: [], used: [], flags: {}, pending: null, encounter: null, ended: false, visited: [], lifespan: 0, game: freshGame() };
  state.gender = Object.hasOwn(GENDERS,gender) ? gender : hashSeed(`${seed}-gender`) % 2 ? 'female' : 'male';
  state.town = TOWNS.some(t => t.id === town) ? town : pick(state, TOWNS).id;
  state.lifespan = 64 + Math.floor(random(state) * 37);
  state.season = 0;
  const bg = pick(state, BACKGROUNDS);
  state.background = {...bg, environment: pick(state, ENVIRONMENTS)};
  state.money = bg.money;state.stats.wisdom += bg.wisdom;state.stats.bond += bg.bond;
  state.relationship = {name:pick(state,['유진','서윤','지호','도윤']),status:'single',chapter:0,trust:20,children:0};
  state.hometown = state.town;
  state.visited.push(state.town);
  state.family = state.background.family;
  state.trait = pick(state, TRAITS);
  log(state, { title: '출생 등록', body: `${townOf(state).region}지방 ${townOf(state).name}. ${state.family}의 품에서 태어났습니다. 6세에 첫 파트너를 만나고 7세에 배울 방식을 정합니다.`, kind: 'milestone', memory: true });
  return state;
}

function recordsSinceDecision(state) {
  const index = state.log.findLastIndex(e => e.choices);
  return index < 0 ? state.log.length : state.log.length - index - 1;
}
function recordGap(state) {
  return 4 + hashSeed(`${state.seed}-gap-${state.log.filter(e=>e.choices).length}`) % 4;
}
export function advance(input) {
  if(input.ended||input.pending||input.encounter||input.game?.battle)return input;
  if (input.scheduledEvent) {
    const s = structuredClone(input);
    if (recordsSinceDecision(s) < recordGap(s)) return log(s, activityRecord(s, townOf(s)));
    const event = s.scheduledEvent;
    delete s.scheduledEvent;
    return log(s, event);
  }
  return advanceYear(input);
}
function advanceYear(input) {
  if (input.ended || input.pending || input.encounter || input.game?.battle) return input;
  const s = ensureGame(structuredClone(input));
  s.age += 1;
  s.season = Math.floor(random(s) * 4);

  trainParty(s, annualTraining(s));
  s.game.balls = Math.min(30,s.game.balls + 3);
  if (s.age >= 60 && (s.age >= s.lifespan || random(s) < (100-s.stats.vitality)/3500)) {
    s.ended = true;
    return log(s, {kind: "ending", title: "생애 종료", body: `${s.name}의 생애가 ${s.age}세에 끝났습니다. 방문 마을 ${s.visited.length}곳, 관측 포켓몬 ${s.seen.length}종. 기록을 내보내거나 새 게임을 시작할 수 있습니다.`});
  }
  if (s.career && s.age < 65) s.money += Math.round(CAREERS[s.career].income * (1 + (s.careerRank || 0) * .15));
  if (s.age >= 65) s.money += 100;
  if (s.party.length) apply(s, { bond: 1 });
  if (s.age > 60) apply(s, { vitality: -1 });

  if (s.age === 6) {
    return encounter(s, { type: 'partner', pokemonId: pick(s, townOf(s).pool), join: true,
      title: '첫 파트너 등록', subtitle: 'PARTNER REGISTERED',
      body: '마을 연구소에서 첫 파트너를 등록했습니다. 이제 생활 속 배틀·포획·훈련 사건에서 파트너와 함께 결정합니다.', effects: { bond: 20, joy: 10 } });
  }
  if (s.age === 10) {
    const npc = townOf(s).region === '관동' ? 'oak' : 'steven';
    return encounter(s, { type: 'npc', npc, title: '공식 트레이너와의 만남', subtitle: 'TRAINER ENCOUNTER',
      body: `${NPCS[npc].name}에게 배틀과 도감 수집에 관한 조언을 받았습니다. 다른 지방의 초대와 이동 제안이 도착하기 시작합니다.`, effects: { wisdom: 10, courage: 6 } });
  }
  const education = s.education || 'undecided';
  const school = {
    7: {title:'어린 시절의 학습 방식',body:'가족과 앞으로 배울 방식을 정한다. 학교에 다니지 않는 길도 선택할 수 있다.',options:[['트레이너 스쿨 입학','school-enrolled',{wisdom:6},'school'],['가족과 가정학습','home-learning',{bond:6},'home'],['보호자와 현장 체험','guided-learning',{courage:5,vitality:2},'field']]},
    12: {title:'성장기 활동 방향',body:'지금까지의 생활을 돌아보고 다음 활동을 정한다. 학교로 진학하거나 다른 방식으로 배울 수 있다.',options:[['중등 학교에 진학','secondary-school',{wisdom:8},'school'],['가정학습과 자율 연구','independent-study',{wisdom:5,bond:3},'home'],['돌봄 센터에서 체험 학습','care-experience',{bond:8},'field'],['지역 탐방과 체력 회복','youth-break',{vitality:8,joy:4},'pause']]},
    18: {title:education==='school'?'학교 졸업 후의 선택':'성인기의 새로운 방향',body:education==='school'?'학교 과정을 마쳤다. 진학은 여러 선택 중 하나다.':'학교 밖에서 쌓은 경험을 바탕으로 앞으로의 생활을 결정한다.',options:[['전문 아카데미에 진학','higher-education',{wisdom:8},'academy'],['현장 견습 시작','field-training',{courage:6,money:300},'apprentice'],['돌봄 센터에 바로 취업','direct-work',{money:500,courage:4},'work'],['지방을 여행하며 탐색','gap-travel',{courage:8,joy:4},'travel'],['휴식하며 다음 계획 준비','adult-break',{vitality:10,joy:5},'pause']]},
    22: {title:education==='academy'?'전문 과정 졸업':education==='apprentice'?'견습 과정 수료':'앞으로의 활동 계획',body:'현재까지의 경험을 바탕으로 활동 방향을 다시 선택한다. 진학이나 취업을 미뤄도 된다.',options:[['전문 교육으로 역량 보완','continued-study',{wisdom:7},'study'],[s.career?'현재 진로에서 경력 확장':'포켓몬 돌봄 업무 시작','experienced',{courage:5,money:400},'work'],['지역 공동체에서 활동','community-worker',{bond:7},'community'],['여행과 자율 연구를 계속','independent-life',{courage:4,wisdom:4},'travel'],['가족과 지내며 재충전','family-break',{bond:5,vitality:7},'pause']]},
  }[s.age];
  if(school)return log(s,{kind:'choice',title:school.title,body:school.body,choices:school.options.map(([label,flag,effects,education])=>({label,flag,effects,education,...(education==='work'?{career:s.career||'keeper'}:{}),description:'선택한 방식에 따라 이후 사건이 달라집니다',outcome:`${label}을 선택했다. 이후 생활 계획에 반영한다.`})).concat(s.age===18||s.age===22?[academyExam]:[])});
  const careerEvent = careerMilestone(s);
  if(careerEvent)return log(s,careerEvent);
  if (s.age === 20) return log(s, { kind: 'choice', title: '거주지 변경 제안', body: '새 거주지와 활동 기반을 선택합니다. 이주하면 출현 포켓몬과 지방 사건이 달라집니다.', choices: [
    { label: '새로운 마을로 떠난다', description: '이사 비용 600P · 새로운 만남', cost: 600, move: true, effects: { courage: 8, money: -600 }, outcome: '새 지방으로 이주했습니다. 현재 위치와 방문 기록이 갱신되었습니다.' },
    { label: '이곳에 나의 자리를 만든다', description: '행복 +7 · 고향에서의 삶', effects: { joy: 7, bond: 3 }, flag: 'rooted', outcome: '현재 마을에 정착했습니다. 지역 활동을 계속합니다.' },
  ] });
  if (s.age === 24) return log(s, { kind: 'choice', title: '전설의 포켓몬 조사 의뢰', body: `${townOf(s).region}지방 연구소가 전설의 포켓몬 목격 자료를 공개했다. 현장 조사에 참여하면 이후 특별 관측 확률이 높아진다.`, choices: [
    { label: '현장 조사에 참여', description: '용기 +5 · 새로운 사건의 시작', flag: 'legend-quest', effects: { courage: 5 }, outcome: '장기 조사에 등록했습니다. 29세부터 전설의 포켓몬 관측 확률이 증가합니다.' },
    { label: '자료 분석만 수행', description: '지혜 +5 · 지금의 일상에 머물기', effects: { wisdom: 5 }, outcome: '목격 자료의 교차 검증을 완료했습니다. 현장 조사에는 참여하지 않습니다.' },
  ] });
  if (s.age === 28 && s.flags['legend-quest']) return log(s, { kind: 'milestone', title: '전설 조사 좌표 확보', body: '여러 목격 기록에서 공통 좌표를 확보했습니다. 다음 해부터 현장 탐사를 시작합니다.', effects: { courage: 5, wisdom: 5 }, memory: true });
  if (s.age === 30) return log(s, { kind: 'choice', title: '파티 추가 모집', body: '보호소에서 새 포켓몬을 영입할 기회가 생겼습니다. 파티에 빈 슬롯이 필요합니다.', choices: [
    { label: '새 포켓몬 영입', description: '동행 포켓몬 +1 · 준비 비용 400P', cost: 400, join: pick(s, townOf(s).pool), effects: { money: -400, joy: 7 }, outcome: '새 포켓몬을 파티에 등록했습니다.' },
    {label:'무료 보호 활동',description:'유대 +3 · 비용 없음',effects:{bond:3},outcome:'보호소 활동을 도왔습니다.'},
    { label: '보호소 후원', description: '행복 +5 · 돌봄을 위한 기부 100P', cost: 100, effects: { money: -100, joy: 5 }, outcome: '보호소 운영비를 후원했습니다.' },
  ] });
  if (s.age === 55 && s.town !== s.hometown) return log(s, { kind: 'choice', title: '귀향 제안', body: '출생지의 빈집을 제공받을 수 있습니다. 이동 비용 없이 고향으로 돌아갈 수 있습니다.', choices: [
    { label: '고향으로 돌아간다', description: '익숙한 풍경과의 재회', home: true, effects: { joy: 8 }, outcome: '거주지를 출생지로 변경했습니다.' },
    { label: '여기서 조금 더 살아간다', description: '지금의 마을도 나의 고향', effects: { joy: 5, wisdom: 4 }, outcome: '현재 거주지에서 활동을 계속하기로 결정했습니다.' },
  ] });
  if (s.age === 65) return log(s, { kind: 'milestone', title: '은퇴 및 연금 지급 시작', body: '정규 직업 수입이 종료되고 연간 연금 100P가 지급됩니다. 생활 사건과 지방 교류는 계속됩니다.', effects: { joy: 8, vitality: 5 } });
  if (s.age >= 105) {
    s.ended = true;
    return log(s, { kind: 'ending', title: '평범해서, 다시 없을 나의 삶', body: `${s.name}의 이야기는 ${townOf(s).name}의 조용한 햇살 속에서 마지막 장에 닿았습니다. ${s.party.length}마리의 동행, ${s.visited.length}개의 마을, 수많은 작은 순간들. 플레이 기록을 저장할 수 있습니다.`, memory: true });
  }

  const roll = random(s);
  const legendChance = s.flags['legend-quest'] && s.age >= 29 ? 0.15 : 0.022;
  if (s.age >= 22 && !s.flags.legendary && roll < legendChance) {
    s.flags.legendary = true;
    const pokemonId = pick(s, regionOf(townOf(s)).legend);
    return encounter(s, { type: 'legendary', pokemonId, title: '전설의 포켓몬 출현', subtitle: 'LEGENDARY ENCOUNTER',
      body: '지방 조사 중 전설의 포켓몬을 관측했습니다. 도감에 관측 기록을 등록했습니다. 이 사건은 포획 이벤트가 아닙니다.', effects: { joy: 15, courage: 10, wisdom: 8 } });
  }
  if(s.age>=8 && s.party.length && (s.age-(s.lastWildOffer??5)>=3 || random(s)<(s.career==='traveler'?.22:s.career==='researcher'?.16:.10))){s.lastWildOffer=s.age;return log(s,wildEncounter(s));}
  if(s.age>=19&&s.age%2===1){const relationship=relationshipEvent(s);if(relationship)return log(s,relationship);}
  const challenges = CHALLENGE_EVENTS.filter(e => s.age >= e.min && s.age <= e.max && !s.used.includes(e.id) && (!e.married || s.relationship.status === 'married'));
  if (s.age >= 23 && !s.flags['elite-academy'] && !s.used.includes('academy-retry')) challenges.push({id:'academy-retry',kind:'choice',title:'아카데미 특별전형 추가 모집',body:'학교 밖 경험도 지원 자격으로 인정한다. 진학 여부를 다시 선택할 수 있다.',choices:[academyExam,{label:'현재 활동을 이어간다',description:'확정 결과 · 지혜 +3',effects:{wisdom:3},outcome:'현재 활동을 계속하기로 했다.'}]});
  if (challenges.length && random(s) < 0.5) { const event = pick(s, challenges); s.used.push(event.id); return log(s,event); }
  if(s.age>=6&&random(s)<0.35)return log(s,seasonalEvent(s));

  const branchPool = [...REGIONAL_EVENTS, ...BRANCH_EVENTS].filter(e => s.age >= e.min && s.age <= e.max && !s.used.includes(e.id) && (!e.region || e.region === townOf(s).map) && (!e.requires || s.flags[e.requires]));
  const continuations = branchPool.filter(e => e.requires);
  if (s.age >= 7 && s.age % 5 !== 0 && branchPool.length) {
    const regional = branchPool.filter(e => e.region);
    const selected = pick(s, continuations.length ? continuations : s.age % 3 === 2 && regional.length ? regional : branchPool);
    s.used.push(selected.id); return log(s, selected);
  }
  if (s.age >= 18 && !s.flags.evolved && partnerOf(s) && EVOLUTIONS[partnerOf(s).id] && s.stats.bond >= 42) {
    s.flags.evolved = true;
    const oldId = s.party[0].id;
    s.party[0].id = EVOLUTIONS[oldId];
    return encounter(s, { type: 'evolution', pokemonId: s.party[0].id, oldId, title: '파트너 진화', subtitle: 'EVOLUTION',
      body: '파트너가 성장 조건을 충족해 진화했습니다. 도감 정보가 갱신됩니다.', effects: { bond: 8, joy: 8 } });
  }
  if (s.age >= 12 && roll > 0.92 && !s.flags.shiny) {
    s.flags.shiny = true;
    return encounter(s, { type: 'shiny', pokemonId: pick(s, townOf(s).pool), join: s.party.length < 6, title: '색이 다른 포켓몬 출현', subtitle: 'SHINY ENCOUNTER',
      body: '풀숲 사이로 낯익고도 낯선 색이 반짝입니다. 특별한 색의 포켓몬이 고개를 갸웃하더니 당신의 발걸음을 따라오기 시작합니다.', effects: { joy: 10, bond: 4 } });
  }
  if (s.age >= 15 && roll > 0.78 && roll <= 0.92) {
    const npcPool = (townOf(s).region === '관동' ? ['misty', 'brock', 'erika', 'red'] : ['steven', 'brock', 'red']).filter(id => !s.people.some(p => p.id === id));
    if (npcPool.length) {
      const npc = pick(s, npcPool);
      return encounter(s, { type: 'npc', npc, title: '유명 트레이너와의 교류', subtitle: 'TRAINER ENCOUNTER', body: `잠시 쉬어 가던 길에서 ${NPCS[npc].name}와 마주쳤습니다. 포켓몬 이야기를 나누다 보니 해가 기울어 있었습니다.`, effects: { wisdom: 7, courage: 5 } });
    }
  }
  if (s.age > 32 && !s.flags['npc-return'] && s.people.length && roll > 0.6 && roll < 0.72) {
    s.flags['npc-return'] = true;
    const person = s.people[0];
    return log(s, { kind: 'milestone', title: '이전 협력자의 연구 요청', body: `${s.age - person.age}년 전 만났던 ${NPCS[person.id].name}에게 공동 연구 요청이 왔습니다. 축적한 배틀 기록을 공유하고 연구 자료를 받았습니다.`, effects: { joy: 7, wisdom: 4 } });
  }
  if (s.career && s.age < 65 && roll > 0.38 && roll < 0.67) {
    const work = WORK_EVENTS[s.career].map(([title, body, effects], i) => ({ id: `work-${s.career}-${i}`, title, body, effects, kind: 'work' })).filter(e => !s.used.includes(e.id));
    if (work.length) { const event = pick(s, work); s.used.push(event.id); return log(s, withDecision(event, s)); }
  }
  const candidates = EVENTS.filter(e => s.age >= e.min && s.age <= e.max && !s.used.includes(e.id));
  if (candidates.length) { const event = pick(s, candidates); s.used.push(event.id); return log(s, withDecision(event, s)); }
  const visitor = pick(s, townOf(s).pool);
  seen(s, visitor);
  return log(s, withDecision({title: '연간 활동 계획', body: `${townOf(s).name}에서 다음 활동을 결정합니다.`, effects: {}, visitor},s));
}

export function choose(input, index) {
  if (!input.pending || input.encounter) return input;
  const s = structuredClone(input);
  const entry = s.log.find(e => e.id === s.pending);
  let choice = entry?.choices?.[index];
  if (!choice || (choice.cost || 0) > s.money || (choice.join && s.party.length >= 6)) return input;
  let check;
  if (choice.challenge) {
    const chance = successChance(s, choice);
    const roll = random(s) * 100;
    const success = roll < chance;
    check = { chance, roll, success, stat: choice.challenge.stat };
    const result = success ? choice : { label: choice.label, ...choice.challenge.failure };
    choice = { ...result, effects: { ...result.effects, money: (result.effects.money || 0) - (choice.cost || 0) } };
  }
  apply(s, choice.effects);
  if(choice.education)s.education=choice.education;
  if(choice.destination&&TOWNS.some(t=>t.id===choice.destination))s.town=choice.destination;
  if(choice.observe)seen(s,choice.observe);
  if(choice.training)trainParty(s,choice.training);
  if(choice.equipment){s.game.gear.push(choice.equipment);if(choice.equipment==='mega')s.game.megaStones=Object.keys(MEGA).map(Number);if(choice.equipment==='z')s.game.crystals=['노말','불꽃','물','풀','전기','비행','독','땅','바위','격투','벌레','고스트','강철','얼음','에스퍼','드래곤','악','페어리'];}
  if(choice.relationship)resolveRelationship(s,choice.relationship);
  if (choice.career) {if(s.career!==choice.career)s.careerRank=0;s.career = choice.career;}
  if(choice.promotion)s.careerRank=Math.min(5,(s.careerRank||0)+1);
  if(choice.leaveCareer){s.career=null;s.careerRank=0;}
  if(choice.captureJoin){const p={id:choice.captureJoin,joined:s.age,shiny:false,xp:Math.floor(Math.max(0,(s.party[0]?.xp||0)*.65))};p.hp=maxHP(p);(s.party.length<6?s.party:s.box).push(p);seen(s,p.id);s.game.catches++;}
  if (choice.flag) s.flags[choice.flag] = true;
  if (choice.move) s.town = pick(s, TOWNS.filter(t => t.id !== s.town)).id;
  if (choice.home) s.town = s.hometown;
  if (!s.visited.includes(s.town)) s.visited.push(s.town);
  if (choice.join && s.party.length < 6) { s.party.push({ id: choice.join, joined: s.age, shiny: false }); seen(s, choice.join); }
  ensureGame(s);
  entry.resolution = { index, label: choice.label, text: choice.outcome, effects: choice.effects };
  if (check) entry.resolution.check = check;
  entry.newTown = s.town;
  s.pending = null;
  if(choice.simulation){const message=resolveSimulation(s,choice);const current=s.log.find(e=>e.id===entry.id);current.resolution.text+=' '+message;s.party.forEach(p=>p.hp=maxHP(p));}

  const mode = choice.education && ['school','home','academy','study'].includes(choice.education) ? 'wisdom'
    : choice.relationship ? 'bond'
    : Object.keys(STAT_LABELS).sort((a,b)=>(choice.effects?.[b]||0)-(choice.effects?.[a]||0))[0];
  s.activity = { label: choice.label, mode, parentId: entry.id, step: 0, failed: check?.success === false };

  return s;
}

export function acknowledge(input) { return { ...input, encounter: null }; }
export function toggleMemory(input, id) { return { ...input, memories: input.memories.includes(id) ? input.memories.filter(x => x !== id) : [...input.memories, id] }; }
export function autoChoice(input) {
  if (!input.pending) return input;
  const s = structuredClone(input);
  const entry = s.log.find(e => e.id === s.pending);
  const available = entry.choices.map((c, i) => ({ c, i })).filter(({ c }) => (!c.cost || c.cost <= s.money) && (!c.join || s.party.length < 6));
  return available.length ? choose(s, pick(s, available).i) : s;
}

export function parseSave(raw) {
  try {
    const s = JSON.parse(raw);
    const validId = id => Number.isInteger(id) && id >= 1 && id <= 1025;
    const validEncounter = e => e && ['partner', 'npc', 'legendary', 'shiny', 'evolution'].includes(e.type)
      && typeof e.title === 'string' && typeof e.body === 'string'
      && (e.type === 'npc' ? Boolean(NPCS[e.npc]) : validId(e.pokemonId));
    const validEffects = effects => effects && typeof effects === 'object' && !Array.isArray(effects)
      && Object.entries(effects).every(([key, value]) => (key in STAT_LABELS || key === 'money') && Number.isFinite(value));
    const validChoice = c => c && typeof c.label === 'string' && typeof c.description === 'string'
      && typeof c.outcome === 'string' && validEffects(c.effects)
      && (!c.captureJoin || validId(c.captureJoin))
      && (!c.career || Boolean(CAREERS[c.career])) && (!c.join || validId(c.join))
      && (c.cost === undefined || Number.isFinite(c.cost) && c.cost >= 0)
      && (!c.challenge || c.challenge.stat in STAT_LABELS && Number.isFinite(c.challenge.difficulty) && typeof c.challenge.failure?.outcome === 'string' && validEffects(c.challenge.failure.effects));
    if (!s || s.version !== VERSION || typeof s.name !== 'string' || typeof s.seed !== 'string'
      || s.name.length > 12 || s.seed.length > 40 || typeof s.family !== 'string' || typeof s.trait !== 'string'
      || !Number.isInteger(s.age) || s.age < 0 || s.age > 105 || !Number.isInteger(s.rng)
      || typeof s.ended !== 'boolean' || (s.ended && s.age < 60)
      || !TOWNS.some(t => t.id === s.town) || !TOWNS.some(t => t.id === s.hometown)
      || !s.stats || !Object.keys(STAT_LABELS).every(k => Number.isFinite(s.stats[k]) && s.stats[k] >= 0 && s.stats[k] <= 100)
      || !Number.isFinite(s.money) || s.money < 0 || !['log', 'party', 'people', 'memories', 'seen', 'used', 'visited'].every(k => Array.isArray(s[k]))
      || !s.flags || typeof s.flags !== 'object' || Array.isArray(s.flags) || (s.career && !CAREERS[s.career])
      || !s.log.length || s.log.length > 800 || !s.log.every(e => typeof e.id === 'string' && typeof e.title === 'string' && typeof e.body === 'string'
        && Number.isInteger(e.age) && e.age >= 0 && e.age <= s.age && Number.isInteger(e.season) && e.season >= 0 && e.season <= 3
        && TOWNS.some(t => t.id === e.town) && validEffects(e.effects)
        && (!e.partnerId || validId(e.partnerId)) && (!e.encounter || validEncounter(e.encounter))
        && (!e.choices || Array.isArray(e.choices) && e.choices.length > 0 && e.choices.every(validChoice))
        && (!e.resolution || typeof e.resolution.label === 'string' && typeof e.resolution.text === 'string' && validEffects(e.resolution.effects)))
      || new Set(s.log.map(e => e.id)).size !== s.log.length
      || !s.memories.every(id => s.log.some(e => e.id === id)) || !s.seen.every(validId)
      || !s.visited.every(id => TOWNS.some(t => t.id === id))
      || s.party.length > 6 || !s.party.every(p => validId(p.id) && Number.isInteger(p.joined) && p.joined >= 0 && p.joined <= s.age && typeof p.shiny === 'boolean')
      || !s.people.every(p => NPCS[p.id] && Number.isInteger(p.age) && p.age <= s.age)
      || (s.pending && !s.log.some(e => e.id === s.pending && Array.isArray(e.choices)))
      || (s.encounter && (!s.log.some(e => e.id === s.encounter.logId) || !validEncounter(s.encounter)))) return null;
    if (s.scheduledEvent && (s.pending || !Array.isArray(s.scheduledEvent.choices) || !s.scheduledEvent.choices.length || !s.scheduledEvent.choices.every(validChoice) || typeof s.scheduledEvent.title !== 'string' || typeof s.scheduledEvent.body !== 'string')) return null;
    if (s.activity && (!(s.activity.mode in STAT_LABELS) || typeof s.activity.label !== 'string' || !Number.isInteger(s.activity.step) || s.activity.step < 0)) return null;
    s.box ??= [];
    if(!Array.isArray(s.box)||s.box.length>1000||!s.box.every(p=>validId(p.id)&&Number.isInteger(p.joined)&&p.joined>=0&&p.joined<=s.age&&typeof p.shiny==='boolean'&&Number.isInteger(p.xp)&&p.xp>=0&&p.xp<=1000000))return null;
    if(s.careerRank!==undefined&&(!Number.isInteger(s.careerRank)||s.careerRank<0||s.careerRank>5))return null;
    s.gender ??= 'unspecified';
    if (!Object.hasOwn(GENDERS,s.gender)) return null;
    // Migrate v1 saves without dropping a pending decision or the original RNG state.
    if (s.lifespan === undefined) s.lifespan = Math.max(s.age+1,64 + hashSeed(s.seed+'lifespan') % 37);
    if (!Number.isInteger(s.lifespan) || s.lifespan < 60 || s.lifespan > 106) return null;
    if (s.game && !validGame(s.game, s)) return null;
    s.season ??= 0;
    s.background ??= {id:'legacy',family:s.family,wealth:'기존 기록',home:'기존 거주지',environment:townOf(s).environment};
    s.relationship ??= {name:'유진',status:'single',chapter:0,trust:20,children:0};
    if(!Number.isInteger(s.season)||s.season<0||s.season>3||!s.background||typeof s.background.environment!=='string'||!s.relationship||!Number.isInteger(s.relationship.chapter)||s.relationship.chapter<0||s.relationship.chapter>18||typeof s.relationship.name!=='string')return null;
    ensureGame(s);
    if(s.game.battle){s.game.battle=null;s.party.forEach(p=>p.hp=maxHP(p));}
    delete s.game.ap;
    return ensureGame(s);
  } catch { return null; }
}

function withDecision(event,s) {
 if (s.age < 6 || event.choices) return event;
 const focus=s.game?.focus;
 return {...event,kind:'choice',choices:[
 {label:'현장 배틀 훈련',description:`용기 +${focus==='battle'?8:5} · 건강 −2`,effects:{courage:focus==='battle'?8:5,vitality:-2},outcome:'현장 훈련을 완료하고 전술 경험을 쌓았다.'},
 {label:'서식지 조사 수행',description:`지혜 +${focus==='research'?8:5} · 연구비 100P`,effects:{wisdom:focus==='research'?8:5,money:100},outcome:'관찰 기록을 연구소에 제출했다.'},
 {label:'파트너 돌봄과 휴식',description:`유대 +${focus==='care'?8:5} · 건강 +4`,effects:{bond:focus==='care'?8:5,vitality:4},outcome:'파트너를 돌보고 체력을 회복했다.'}
 ]};
}
function validGame(g,s) {
 const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 return g && g.position && int(g.position.x,1,14)&&int(g.position.y,4,9)
 && int(g.balls,0,1000000) && int(g.steps,0,10000000) && int(g.wins,0,100000) && int(g.catches,0,100000)
 && ['balanced','battle','research','care'].includes(g.focus) && typeof g.teraCharge==='boolean'
 && typeof g.teraType==='string' && ['gear','megaStones','crystals','gmax','feed','claimed'].every(k=>Array.isArray(g[k]))
 && g.gear.every(k=>['mega','z','dynamax','tera'].includes(k)) && g.feed.every(e=>typeof e.text==='string'&&typeof e.id==='string')
 && g.badges && Object.values(g.badges).every(n=>int(n,0,8))
 && s.party.every(p=>p.xp===undefined||int(p.xp,0,1000000)) && s.party.every(p=>p.hp===undefined||Number.isFinite(p.hp)&&p.hp>=0&&p.hp<=670)
 && (!g.battle || (['wild','gym','raid'].includes(g.battle.kind)&&s.party.length>0&&int(g.battle.id,1,1025)&&int(g.battle.level,1,100)&&Number.isFinite(g.battle.hp)&&g.battle.hp>=0&&Number.isFinite(g.battle.maxHp)&&g.battle.maxHp>0&&g.battle.hp<=g.battle.maxHp&&Array.isArray(g.battle.messages)&&g.battle.messages.every(m=>typeof m==='string')&&int(g.battle.turn,0,100000)&&int(g.battle.turnsLeft,0,3)&&[null,'mega','z','dynamax','gmax','tera'].includes(g.battle.form)&&[null,'win','lose','caught','escape'].includes(g.battle.result)));
}
