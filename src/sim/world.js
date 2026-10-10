// Every region has its own economy, safety and ecology. They drift each year, react to random
// conditions (recessions, syndicates, climate…) and to the player's choices.
import { REGIONS } from '../data/regions.js';
import { TOWNS } from '../data/world.js';
import { random, pick, between, chance, clamp, weighted, hashSeed } from './random.js';
import { josa } from './text.js';

export const WORLD_KEYS = { economy: '경기', safety: '치안', ecology: '생태' };

export const CONDITIONS = {
  recession: { name: '경기 침체', shift: { economy: -18 }, years: [2, 4], weight: r => 1 + (r.economy > 60 ? 1.5 : 0),
    start: () => '상점 매출과 일자리가 줄고 있다. 소득과 일자리 사건에 영향을 준다.', end: () => '얼어붙었던 경기가 회복세로 돌아섰다.' },
  boom: { name: '개발 호황', shift: { economy: 14, ecology: -8 }, years: [2, 4], weight: r => 1 + (r.economy < 45 ? 1 : 0),
    start: () => '새 도로와 상업 시설 공사가 이어지며 일자리가 늘었다. 서식지 훼손을 걱정하는 목소리도 커졌다.', end: () => '개발 열기가 한풀 꺾였다.' },
  syndicate: { name: r => `${r.villain} 활동`, shift: { safety: -22 }, years: [2, 5], weight: r => 0.8 + (r.safety < 50 ? 1.2 : 0),
    start: r => `${josa(r.villain, '이', '가')} 다시 모습을 드러냈다. 포켓몬 도난 신고가 늘고 있다.`, end: r => `${josa(r.villain, '의', '의')} 활동이 잦아들었다.` },
  climate: { name: '이상 기후', shift: { ecology: -14 }, years: [1, 3], weight: () => 0.9,
    start: () => '폭우와 가뭄이 번갈아 찾아왔다. 서식지와 농가가 흔들리고 있다.', end: () => '날씨가 평년을 되찾았다.' },
  outbreak: { name: '포켓몬 감기 유행', shift: { economy: -5 }, years: [1, 2], weight: () => 0.7,
    start: () => '포켓몬센터마다 감기에 걸린 포켓몬이 줄을 섰다.', end: () => '포켓몬 감기 유행이 끝났다.' },
  league: { name: '대규모 리그 개최', shift: { economy: 8 }, years: [1, 2], weight: () => 0.8,
    start: () => '리그 본선이 열린다. 전국의 트레이너가 모여들고 있다.', end: () => '리그 일정이 모두 끝났다.' },
  discovery: { name: '신종 발견 열풍', shift: { ecology: 4 }, years: [1, 3], weight: r => 0.6 + (r.ecology > 60 ? 0.8 : 0),
    start: () => '미기록 포켓몬 보고가 잇따르며 연구소가 조사원을 모집한다.', end: () => '신종 조사 열기가 가라앉았다.' },
  legend: { name: '전설 목격 소문', shift: {}, years: [1, 3], weight: r => 0.35 + (r.ecology > 65 ? 0.4 : 0),
    start: () => '하늘을 가르는 그림자를 봤다는 목격담이 퍼지고 있다.', end: () => '전설의 포켓몬 목격담이 끊겼다.' },
  harvest: { name: '나무열매 풍작', shift: { economy: 6, ecology: 5 }, years: [1, 1], weight: r => 0.7 + (r.ecology > 55 ? 0.5 : 0),
    start: () => '올해 나무열매가 유난히 잘 열렸다. 시장이 활기를 띤다.', end: () => '풍작의 계절이 지나갔다.' },
  migration: { name: '포켓몬 대이동', shift: { ecology: 6 }, years: [1, 2], weight: () => 0.6,
    start: () => '다른 지방의 포켓몬 무리가 넘어와 정착하기 시작했다.', end: () => '이동하던 포켓몬 무리가 자리를 잡았다.' },
};

const regionById = id => REGIONS.find(r => r.id === id);
export const conditionName = (id, regionId) => {
  const name = CONDITIONS[id].name;
  return typeof name === 'function' ? name(regionById(regionId)) : name;
};

export function createWorld(s, roll = () => random(s)) {
  const regions = Object.fromEntries(REGIONS.map(r => [r.id, {
    economy: 38 + Math.floor(roll() * 25), safety: 42 + Math.floor(roll() * 25), ecology: 40 + Math.floor(roll() * 25),
  }]));
  return { regions, conditions: [] };
}

export const currentRegion = s => TOWNS.find(t => t.id === s.town).map;
export const regionState = (s, regionId = currentRegion(s)) => s.world.regions[regionId];
export const hasCondition = (s, id, regionId = currentRegion(s)) => s.world.conditions.some(c => c.id === id && c.region === regionId);
// Income multiplier between ~0.64 (deep recession) and ~1.36 (boom).
export const economyFactor = (s, regionId) => 0.6 + regionState(s, regionId).economy / 125;

export function shiftRegion(s, changes = {}, regionId = currentRegion(s)) {
  const region = s.world.regions[regionId];
  for (const [key, value] of Object.entries(changes)) if (key in region) region[key] = clamp(Math.round(region[key] + value), 0, 100);
}

function news(regionId, title, body, important) {
  return { kind: 'news', automatic: true, title, body, effects: {}, region: regionId, ...(important ? { important: true } : {}) };
}

/** Advances one year of the world. Returns news records for the journal. */
export function tickWorld(s) {
  const here = currentRegion(s), records = [];
  for (const condition of s.world.conditions.filter(c => c.until < s.age)) {
    if (condition.region === here && condition.until > condition.since) records.push(news(here, `${regionById(here).name}지방 소식 · ${conditionName(condition.id, here)} 종료`, CONDITIONS[condition.id].end(regionById(here))));
  }
  s.world.conditions = s.world.conditions.filter(c => c.until >= s.age);

  for (const [id, region] of Object.entries(s.world.regions)) {
    for (const key of Object.keys(WORLD_KEYS)) {
      const pressure = s.world.conditions.filter(c => c.region === id).reduce((sum, c) => sum + (CONDITIONS[c.id].shift[key] || 0) * 0.2, 0);
      region[key] = clamp(Math.round(region[key] + (50 - region[key]) * 0.12 + between(s, -4, 4) + pressure), 3, 97);
    }
  }

  const spawns = chance(s, 0.5) ? (chance(s, 0.2) ? 2 : 1) : 0;
  for (let i = 0; i < spawns; i++) {
    const regionId = chance(s, 0.55) ? here : pick(s, REGIONS).id;
    const region = regionById(regionId), state = s.world.regions[regionId];
    const options = Object.entries(CONDITIONS).filter(([id]) => !s.world.conditions.some(c => c.id === id && c.region === regionId));
    const picked = weighted(s, options, ([, c]) => c.weight({ ...region, ...state }));
    if (!picked) continue;
    const [id, condition] = picked;
    s.world.conditions.push({ id, region: regionId, since: s.age, until: s.age + between(s, ...condition.years) - 1 });
    shiftRegion(s, condition.shift, regionId);
    const local = regionId === here;
    if (local || chance(s, 0.45)) records.push(news(regionId, `${local ? '' : '다른 지방 · '}${region.name}지방 소식 · ${conditionName(id, regionId)}`, condition.start({ ...region, ...state }), local));
  }
  return records;
}

// Towns ranked by how attractive their region currently looks (used for relocation offers).
export function attractiveTowns(s, excludeTown) {
  const score = t => { const r = s.world.regions[t.map]; return r.economy + r.safety * 0.6 + r.ecology * 0.4 + (hashSeed(`${s.seed}-${t.id}-${s.age}`) % 20); };
  return TOWNS.filter(t => t.id !== excludeTown).sort((a, b) => score(b) - score(a));
}
