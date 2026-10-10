import { TOWNS, CAREERS, NPCS, EVENTS, WORK_EVENTS, FAMILY, TRAITS } from './data/world.js';

export const SAVE_KEY = 'pokelife.story.v1';
export const VERSION = 1;
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
export function stageOf(age) { return age < 6 ? '작은 시작' : age < 16 ? '자라나는 계절' : age < 30 ? '세상을 향해서' : age < 55 ? '나의 자리를 찾아' : age < 70 ? '깊어지는 시간' : '오래 빛나는 기억'; }
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
  const entry = { age: state.age, season: state.age % 4,
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
  if (data.join) state.party.push({ id: data.pokemonId, joined: state.age, shiny: data.type === 'shiny' });
  return log(state, { title: data.title, body: data.body, kind: 'encounter', effects: data.effects || { joy: 8 }, encounter: data });
}

export function createLife({ name = '하루', seed = String(Date.now()), town = 'random' } = {}) {
  const state = { version: VERSION, name: name.trim().slice(0, 12) || '하루', seed: String(seed).slice(0, 40), rng: hashSeed(seed), age: 0,
    town: '', hometown: '', family: '', trait: '', career: null, money: 1800,
    stats: { joy: 72, vitality: 85, courage: 32, wisdom: 18, bond: 0 }, party: [], people: [], seen: [],
    log: [], memories: [], used: [], flags: {}, pending: null, encounter: null, ended: false, visited: [] };
  state.town = TOWNS.some(t => t.id === town) ? town : pick(state, TOWNS).id;
  state.hometown = state.town;
  state.visited.push(state.town);
  state.family = pick(state, FAMILY);
  state.trait = pick(state, TRAITS);
  log(state, { title: '세상에 하나뿐인 이야기가 시작됩니다', body: `${townOf(state).region}지방 ${townOf(state).name}. ${state.family}의 품에서 태어났습니다. 아직은 작은 손에, 어떤 내일이 찾아올까요?`, kind: 'milestone', memory: true });
  return state;
}

export function advance(input) {
  if (input.ended || input.pending || input.encounter) return input;
  const s = structuredClone(input);
  s.age += 1;
  if (s.career && s.age < 65) s.money += CAREERS[s.career].income;
  if (s.age >= 65) s.money += 100;
  if (s.party.length) apply(s, { bond: 1 });
  if (s.age > 60) apply(s, { vitality: -1 });

  if (s.age === 6) {
    return encounter(s, { type: 'partner', pokemonId: pick(s, townOf(s).pool), join: true,
      title: '처음으로, 서로의 이름을 부른 날', subtitle: 'OUR FIRST CHAPTER',
      body: '매일 집 앞을 서성이던 작은 포켓몬. 오늘은 당신이 내민 손에 조심스레 다가왔습니다. 이 만남이 얼마나 긴 이야기가 될지, 아직은 아무도 모릅니다.', effects: { bond: 20, joy: 10 } });
  }
  if (s.age === 10) {
    const npc = townOf(s).region === '관동' ? 'oak' : 'steven';
    return encounter(s, { type: 'npc', npc, title: '이야기로만 듣던 사람', subtitle: 'A FATEFUL MEETING',
      body: `${NPCS[npc].name}의 눈길이 당신과 파트너에게 머뭅니다. 짧은 대화였지만, 그날의 말은 오래 마음에 남을 것 같습니다.`, effects: { wisdom: 10, courage: 6 } });
  }
  if (s.age === 16) return log(s, { kind: 'choice', title: '당신은 어떤 어른이 되고 싶나요?', body: '꿈에 정답은 없습니다. 곁에 있는 포켓몬과 함께 살아갈 모습을 천천히 그려봅니다.', choices: Object.entries(CAREERS).map(([career, data]) => ({ label: data.short, description: data.description, career, effects: { courage: 5, wisdom: 3 }, outcome: `${data.name}의 길을 걷기로 했습니다. 이제 평범한 하루에도 새로운 목표가 생깁니다.` })) });
  if (s.age === 20) return log(s, { kind: 'choice', title: '익숙한 풍경의 바깥으로', body: '다른 마을에서 지낼 기회가 찾아왔습니다. 고향에 뿌리를 내리는 것도, 새로운 곳에 심는 것도 당신의 선택입니다.', choices: [
    { label: '새로운 마을로 떠난다', description: '이사 비용 600P · 새로운 만남', cost: 600, move: true, effects: { courage: 8, money: -600 }, outcome: '가장 소중한 것만 가방에 담았습니다. 이제 낯선 길이 조금씩 일상이 됩니다.' },
    { label: '이곳에 나의 자리를 만든다', description: '행복 +7 · 고향에서의 삶', effects: { joy: 7, bond: 3 }, flag: 'rooted', outcome: '늘 보던 풍경을 새롭게 바라봅니다. 멀리 떠나지 않아도 깊어질 수 있는 삶이 있습니다.' },
  ] });
  if (s.age === 24) return log(s, { kind: 'choice', title: '오래된 목격담 한 장', body: townOf(s).region === '관동' ? '헌책 사이에서 아주 희귀한 포켓몬을 봤다는 메모가 나왔습니다. 마지막 줄에는 “숲이 조용해지는 순간을 기다릴 것”이라고 적혀 있습니다.' : '여행자가 하늘을 가르는 초록빛에 관해 이야기합니다. 구름 위에도 우리가 모르는 길이 있는 걸까요?', choices: [
    { label: '이야기의 흔적을 따라간다', description: '용기 +5 · 새로운 사건의 시작', flag: 'legend-quest', effects: { courage: 5 }, outcome: '목격담을 수첩에 옮겼습니다. 몇 년이 걸리더라도, 언젠가는 직접 보고 싶습니다.' },
    { label: '소중한 이야기로 간직한다', description: '지혜 +5 · 지금의 일상에 머물기', effects: { wisdom: 5 }, outcome: '책갈피를 끼워두었습니다. 모든 이야기를 직접 확인해야만 소중해지는 것은 아닙니다.' },
  ] });
  if (s.age === 28 && s.flags['legend-quest']) return log(s, { kind: 'milestone', title: '몇 년 전의 메모가 가리키는 곳', body: '오래된 목격담과 비슷한 이야기를 또 들었습니다. 날짜도 장소도 달랐지만, 그때의 고요함에 관한 말은 같았습니다. 우연이 아닐지도 모릅니다.', effects: { courage: 5, wisdom: 5 }, memory: true });
  if (s.age === 30) return log(s, { kind: 'choice', title: '함께할 자리를 하나 더', body: '돌봄 센터에서 가족을 기다리는 포켓몬을 만났습니다. 지금의 파트너도 조용히 곁으로 다가갑니다.', choices: [
    { label: '새로운 가족을 맞이한다', description: '동행 포켓몬 +1 · 준비 비용 400P', cost: 400, join: pick(s, townOf(s).pool), effects: { money: -400, joy: 7 }, outcome: '집 안에 발소리가 하나 더 늘었습니다. 이제 서로의 습관을 배워갈 시간입니다.' },
    { label: '좋은 가족을 찾도록 돕는다', description: '행복 +5 · 돌봄을 위한 기부 100P', cost: 100, effects: { money: -100, joy: 5 }, outcome: '마을 게시판에 소식을 붙였습니다. 며칠 뒤, 새 가족을 만났다는 연락이 왔습니다.' },
  ] });
  if (s.age === 40) return log(s, { kind: 'choice', title: '인생의 중간에서 다시 묻습니다', body: '익숙해진 일을 계속할 수도, 오래 마음에 품었던 일을 시작할 수도 있습니다. 아직 당신의 이야기는 한참 남았습니다.', choices: [
    { label: '지금의 길을 더 깊이 걷는다', description: '지혜 +8 · 지금의 직업 유지', effects: { wisdom: 8, joy: 4 }, outcome: '처음의 마음을 떠올렸습니다. 더 멀리보다, 더 깊이 가보기로 합니다.' },
    ...Object.entries(CAREERS).filter(([id]) => id !== s.career).slice(0, 2).map(([id, c]) => ({ label: `${c.short}의 삶을 시작한다`, description: c.description, career: id, effects: { courage: 8 }, outcome: `${c.name}의 삶을 새로 시작했습니다. 서툴다는 것이, 어쩐지 반갑습니다.` })),
  ] });
  if (s.age === 55 && s.town !== s.hometown) return log(s, { kind: 'choice', title: '고향에서 온 초대', body: '오랜 이웃이 편지를 보냈습니다. “빈집 하나가 생겼어. 네가 좋아하던 언덕도 그대로야.”', choices: [
    { label: '고향으로 돌아간다', description: '익숙한 풍경과의 재회', home: true, effects: { joy: 8 }, outcome: '낡은 표지판을 지나며 인사했습니다. 오래 걸렸지만, 다녀왔습니다.' },
    { label: '여기서 조금 더 살아간다', description: '지금의 마을도 나의 고향', effects: { joy: 5, wisdom: 4 }, outcome: '돌아갈 곳이 있다는 것만으로 마음이 따뜻해졌습니다. 고맙다는 답장을 보냈습니다.' },
  ] });
  if (s.age === 65) return log(s, { kind: 'milestone', title: '이제, 조금 느리게 살아도 괜찮아', body: '일의 속도를 줄이고 아침 산책을 늘렸습니다. 잘 살아왔는지는 모르겠지만, 함께 걸을 친구들이 곁에 있습니다.', effects: { joy: 8, vitality: 5 } });
  if (s.age >= 80) {
    s.ended = true;
    return log(s, { kind: 'ending', title: '평범해서, 다시 없을 나의 삶', body: `${s.name}의 이야기는 ${townOf(s).name}의 조용한 햇살 속에서 마지막 장에 닿았습니다. ${s.party.length}마리의 동행, ${s.visited.length}개의 마을, 수많은 작은 순간들. 당신이 머문 세계는 조금 더 다정해졌습니다.`, memory: true });
  }

  if (s.age >= 18 && !s.flags.evolved && partnerOf(s) && EVOLUTIONS[partnerOf(s).id] && s.stats.bond >= 42) {
    s.flags.evolved = true;
    const oldId = s.party[0].id;
    s.party[0].id = EVOLUTIONS[oldId];
    return encounter(s, { type: 'evolution', pokemonId: s.party[0].id, oldId, title: '모습이 달라져도, 우리는', subtitle: 'GROWING TOGETHER',
      body: '함께 보낸 시간 속에서 파트너가 새로운 모습으로 자랐습니다. 당신을 바라보는 눈빛만은 처음 만난 그날과 같습니다.', effects: { bond: 8, joy: 8 } });
  }
  const roll = random(s);
  const legendChance = s.flags['legend-quest'] && s.age >= 29 ? 0.15 : 0.022;
  if (s.age >= 22 && !s.flags.legendary && roll < legendChance) {
    s.flags.legendary = true;
    const pokemonId = townOf(s).region === '관동' ? pick(s, [144, 145, 146, 150, 151]) : pick(s, [380, 381, 384, 385]);
    return encounter(s, { type: 'legendary', pokemonId, title: '세상이 숨을 멈춘 순간', subtitle: 'ONCE IN A LIFETIME',
      body: '바람이 잦아들고, 주변의 소리가 멀어집니다. 전설처럼 전해지던 존재가 바로 눈앞에 있습니다. 붙잡으려 하지 않고, 이 순간을 오래 기억하기로 했습니다.', effects: { joy: 15, courage: 10, wisdom: 8 } });
  }
  if (s.age >= 12 && roll > 0.92 && !s.flags.shiny) {
    s.flags.shiny = true;
    return encounter(s, { type: 'shiny', pokemonId: pick(s, townOf(s).pool), join: s.party.length < 4, title: '조금 다른 빛을 가진 친구', subtitle: 'A LITTLE DIFFERENT, A LITTLE MAGIC',
      body: '풀숲 사이로 낯익고도 낯선 색이 반짝입니다. 특별한 색의 포켓몬이 고개를 갸웃하더니 당신의 발걸음을 따라오기 시작합니다.', effects: { joy: 10, bond: 4 } });
  }
  if (s.age >= 15 && roll > 0.78 && roll <= 0.92) {
    const npcPool = (townOf(s).region === '관동' ? ['misty', 'brock', 'erika', 'red'] : ['steven', 'brock', 'red']).filter(id => !s.people.some(p => p.id === id));
    if (npcPool.length) {
      const npc = pick(s, npcPool);
      return encounter(s, { type: 'npc', npc, title: '스쳐 지나가지 않은 인연', subtitle: 'PATHS THAT CROSS', body: `잠시 쉬어 가던 길에서 ${NPCS[npc].name}와 마주쳤습니다. 포켓몬 이야기를 나누다 보니 해가 기울어 있었습니다.`, effects: { wisdom: 7, courage: 5 } });
    }
  }
  if (s.age > 32 && !s.flags['npc-return'] && s.people.length && roll > 0.6 && roll < 0.72) {
    s.flags['npc-return'] = true;
    const person = s.people[0];
    return log(s, { kind: 'milestone', title: '그날의 인연이 다시 찾아왔습니다', body: `${s.age - person.age}년 전 만났던 ${NPCS[person.id].name}에게 소식이 왔습니다. 당신이 어떤 삶을 살고 있는지 궁금하다는 짧은 안부. 누군가의 기억 속에도 당신의 자리가 있었습니다.`, effects: { joy: 7, wisdom: 4 } });
  }
  if (s.career && s.age < 65 && roll > 0.38 && roll < 0.67) {
    const work = WORK_EVENTS[s.career].map(([title, body, effects], i) => ({ id: `work-${s.career}-${i}`, title, body, effects, kind: 'work' })).filter(e => !s.used.includes(e.id));
    if (work.length) { const event = pick(s, work); s.used.push(event.id); return log(s, event); }
  }
  const candidates = EVENTS.filter(e => s.age >= e.min && s.age <= e.max && !s.used.includes(e.id));
  if (candidates.length) { const event = pick(s, candidates); s.used.push(event.id); return log(s, event); }
  const visitor = pick(s, townOf(s).pool);
  seen(s, visitor);
  const seasonal = [
    ['새잎 아래에서', '길가의 나무에 새잎이 돋았습니다. 익숙한 길에서도 계절은 매번 다른 색으로 인사를 건넵니다.'],
    ['그늘을 나누는 오후', '작은 물그릇을 문 앞에 내놓았습니다. 더위를 피해 찾아온 포켓몬과 잠깐 그늘을 나눴습니다.'],
    ['주머니 속의 가을', '산책길에서 예쁜 나뭇잎을 주웠습니다. 수첩 사이에 끼워두면 이 계절을 조금 더 오래 간직할 수 있을까요?'],
    ['함께 맞는 겨울', '따뜻한 담요를 하나 더 꺼냈습니다. 바깥은 추워도 함께 있는 방 안은 포근합니다.'],
  ][s.age % 4];
  return log(s, { title: seasonal[0], body: seasonal[1], effects: { joy: 2, bond: s.party.length ? 2 : 0 }, visitor });
}

export function choose(input, index) {
  if (!input.pending || input.encounter) return input;
  const s = structuredClone(input);
  const entry = s.log.find(e => e.id === s.pending);
  const choice = entry?.choices?.[index];
  if (!choice || (choice.cost || 0) > s.money) return input;
  apply(s, choice.effects);
  if (choice.career) s.career = choice.career;
  if (choice.flag) s.flags[choice.flag] = true;
  if (choice.move) s.town = pick(s, TOWNS.filter(t => t.id !== s.town)).id;
  if (choice.home) s.town = s.hometown;
  if (!s.visited.includes(s.town)) s.visited.push(s.town);
  if (choice.join && s.party.length < 4) { s.party.push({ id: choice.join, joined: s.age, shiny: false }); seen(s, choice.join); }
  entry.resolution = { index, label: choice.label, text: choice.outcome, effects: choice.effects };
  entry.newTown = s.town;
  s.pending = null;
  return s;
}

export function acknowledge(input) { return { ...input, encounter: null }; }
export function toggleMemory(input, id) { return { ...input, memories: input.memories.includes(id) ? input.memories.filter(x => x !== id) : [...input.memories, id] }; }
export function autoChoice(input) {
  if (!input.pending) return input;
  const s = structuredClone(input);
  const entry = s.log.find(e => e.id === s.pending);
  const available = entry.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.cost || c.cost <= s.money);
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
      && (!c.career || Boolean(CAREERS[c.career])) && (!c.join || validId(c.join))
      && (c.cost === undefined || Number.isFinite(c.cost) && c.cost >= 0);
    if (!s || s.version !== VERSION || typeof s.name !== 'string' || typeof s.seed !== 'string'
      || s.name.length > 12 || s.seed.length > 40 || typeof s.family !== 'string' || typeof s.trait !== 'string'
      || !Number.isInteger(s.age) || s.age < 0 || s.age > 80 || !Number.isInteger(s.rng)
      || typeof s.ended !== 'boolean' || s.ended !== (s.age === 80)
      || !TOWNS.some(t => t.id === s.town) || !TOWNS.some(t => t.id === s.hometown)
      || !s.stats || !Object.keys(STAT_LABELS).every(k => Number.isFinite(s.stats[k]) && s.stats[k] >= 0 && s.stats[k] <= 100)
      || !Number.isFinite(s.money) || s.money < 0 || !['log', 'party', 'people', 'memories', 'seen', 'used', 'visited'].every(k => Array.isArray(s[k]))
      || !s.flags || typeof s.flags !== 'object' || Array.isArray(s.flags) || (s.career && !CAREERS[s.career])
      || !s.log.length || s.log.length > 81 || !s.log.every(e => typeof e.id === 'string' && typeof e.title === 'string' && typeof e.body === 'string'
        && Number.isInteger(e.age) && e.age >= 0 && e.age <= s.age && Number.isInteger(e.season) && e.season >= 0 && e.season <= 3
        && TOWNS.some(t => t.id === e.town) && validEffects(e.effects)
        && (!e.partnerId || validId(e.partnerId)) && (!e.encounter || validEncounter(e.encounter))
        && (!e.choices || Array.isArray(e.choices) && e.choices.length > 0 && e.choices.every(validChoice))
        && (!e.resolution || typeof e.resolution.label === 'string' && typeof e.resolution.text === 'string' && validEffects(e.resolution.effects)))
      || new Set(s.log.map(e => e.id)).size !== s.log.length
      || !s.memories.every(id => s.log.some(e => e.id === id)) || !s.seen.every(validId)
      || !s.visited.every(id => TOWNS.some(t => t.id === id))
      || s.party.length > 4 || !s.party.every(p => validId(p.id) && Number.isInteger(p.joined) && p.joined >= 0 && p.joined <= s.age && typeof p.shiny === 'boolean')
      || !s.people.every(p => NPCS[p.id] && Number.isInteger(p.age) && p.age <= s.age)
      || (s.pending && !s.log.some(e => e.id === s.pending && Array.isArray(e.choices)))
      || (s.encounter && (!s.log.some(e => e.id === s.encounter.logId) || !validEncounter(s.encounter)))) return null;
    return s;
  } catch { return null; }
}
