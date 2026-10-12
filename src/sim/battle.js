// Simplified automatic battles. Type matchups use the official chart; damage numbers and gear rules are this game's own.
import { TYPES, TYPE_CHART } from '../data/battle-data.js';
import { random, between, clamp } from './random.js';
import { hasRule, RULE_TRAINER_POWER } from './perks.js';
import { diff } from './difficulty.js';

export const MEGA = {"3": 10033, "6": 10034, "9": 10036, "65": 10037, "94": 10038, "115": 10039, "127": 10040, "130": 10041, "142": 10042, "150": 10043, "181": 10045, "212": 10046, "214": 10047, "229": 10048, "248": 10049, "257": 10050, "282": 10051, "303": 10052, "306": 10053, "308": 10054, "310": 10055, "354": 10056, "359": 10057, "445": 10058, "448": 10059, "460": 10060, "380": 10062, "381": 10063, "260": 10064, "254": 10065, "302": 10066, "334": 10067, "475": 10068, "531": 10069, "319": 10070, "80": 10071, "208": 10072, "18": 10073, "362": 10074, "719": 10075, "376": 10076, "384": 10079, "323": 10087, "428": 10088, "373": 10089, "15": 10090};
export const GMAX_FORMS = {"3": 10195, "6": 10196, "9": 10197, "12": 10198, "25": 10199, "52": 10200, "68": 10201, "94": 10202, "99": 10203, "131": 10204, "133": 10205, "143": 10206, "569": 10207, "809": 10208, "812": 10209, "815": 10210, "818": 10211, "823": 10212, "826": 10213, "834": 10214, "839": 10215, "841": 10216, "842": 10217, "844": 10218, "849": 10219, "851": 10220, "858": 10221, "861": 10222, "869": 10223, "879": 10224, "884": 10225, "892": 10226};
export const GMAX = Object.keys(GMAX_FORMS).map(Number);
export const MECHANICS = {
  mega: { name: '메가진화', region: ['kalos', 'hoenn'], detail: '키스톤과 대응 메가스톤. 대응 종이 선두일 때 배틀 내내 위력이 오른다.' },
  z: { name: 'Z기술', region: ['alola'], detail: 'Z링과 같은 타입의 Z크리스탈. 첫 공격을 크게 강화한다.' },
  dynamax: { name: '다이맥스', region: ['galar'], detail: '다이맥스밴드. 가라르의 체육관·레이드·리그에서 3턴 동안 체력과 공격이 오른다.' },
  gmax: { name: '거다이맥스', region: ['galar'], detail: '레이드에서 얻은 거다이맥스 인자를 가진 대응 종만 사용한다.' },
  tera: { name: '테라스탈', region: ['paldea'], detail: '테라스탈오브. 선두 포켓몬의 주 타입을 강화한다.' },
};
const MOVE_TYPES = { '노말': '몸통박치기', '불꽃': '화염방사', '물': '물의파동', '풀': '잎날가르기', '전기': '전기쇼크', '얼음': '얼음뭉치', '격투': '로킥', '독': '독침', '땅': '땅고르기', '비행': '날개치기', '에스퍼': '염동력', '벌레': '벌레먹기', '바위': '돌떨구기', '고스트': '섀도볼', '드래곤': '용의숨결', '악': '물기', '강철': '메탈크로우', '페어리': '차밍보이스' };
export const ALL_TYPES = Object.keys(MOVE_TYPES);
export const BATTLE_KINDS = ['wild', 'gym', 'raid', 'rival', 'villain', 'league', 'facility'];

export const xpLevel = member => Math.min(100, 5 + Math.floor((member.xp || 0) / 25));
export const typesOf = id => TYPES[id] || ['노말'];
export const typeMultiplier = (attack, defenders) => defenders.reduce((n, t) => n * (TYPE_CHART[`${attack}>${t}`] ?? 1), 1);

export function freshGear() {
  return { badges: {}, gear: [], megaStones: [], crystals: [], gmax: [], teraType: '노말', balls: 8, wins: 0, catches: 0 };
}
export const badgeCount = s => Object.values(s.game?.badges || {}).reduce((a, b) => a + b, 0);
/** Regional league titles won so far. Each title makes the next region's gyms and league stronger. */
export const championships = s => Object.keys(s.flags || {}).filter(k => /^league-[a-z]+-champion$/.test(k)).length;

// The strongest move type a species can use against a defender, including STAB.
function bestAttack(attackerId, defenderTypes) {
  const own = typesOf(attackerId);
  return [...new Set([...own, '노말'])]
    .map(type => ({ type, power: (type === '노말' ? 30 : 42) / 35 * (own.includes(type) ? 1.5 : 1) * typeMultiplier(type, defenderTypes) }))
    .sort((a, b) => b.power - a.power)[0];
}

// Trained opponents (gym, league, rival, villain, raid) use their best type and a practised moveset.
export const TRAINER_POWER = 1.35;
const incomingMultiplier = (kind, foeTypes, defend, s = null) => kind === 'wild' ? typeMultiplier(foeTypes[0], defend)
  : Math.max(...foeTypes.map(t => typeMultiplier(t, defend))) * TRAINER_POWER * (s && hasRule(s, 'hard') ? RULE_TRAINER_POWER : 1) * (s ? diff(s, 'power') : 1);

// The trainer picks the lead whose level and matchup look best against this opponent.
// The member in the first slot (the player's chosen lead) goes first unless another matchup is clearly better.
export const LEAD_PREFERENCE = 25;
function chooseLead(party, opponentId, kind = 'wild') {
  const foe = typesOf(opponentId);
  const score = member => xpLevel(member) * 2 + bestAttack(member.id, foe).power * 20 - incomingMultiplier(kind, foe, typesOf(member.id)) * 12
    + (member === party[0] ? LEAD_PREFERENCE : 0);
  return [...party].sort((a, b) => score(b) - score(a))[0];
}

function transformationFor(s, lead, kind, regionId) {
  const g = s.game, attack = bestAttack(lead.id, ['노말']);
  if (g.gear.includes('dynamax') && regionId === 'galar' && ['gym', 'raid', 'league'].includes(kind))
    return GMAX_FORMS[lead.id] && g.gmax.includes(lead.id) ? 'gmax' : 'dynamax';
  if (g.gear.includes('mega') && MEGA[lead.id] && g.megaStones.includes(lead.id)) return 'mega';
  if (g.gear.includes('z') && g.crystals.includes(attack.type)) return 'z';
  if (g.gear.includes('tera')) return 'tera';
  return null;
}

function opponentLevel(s, kind, lead, regionId) {
  const own = xpLevel(lead);
  if (kind === 'gym') return 8 + (s.game.badges[regionId] || 0) * 5 + championships(s) * 4;
  if (kind === 'raid') return 28;
  if (kind === 'rival') return clamp(Math.round(5 + (s.cast?.rival?.power || 20) * 0.5), 5, 70);
  if (kind === 'villain') return clamp(Math.round(12 + s.age * 0.4), 12, 60);
  if (kind === 'league') return clamp(Math.round(30 + (s.reputation || 0) * 0.2), 30, 60);
  if (kind === 'facility') return 50;
  return Math.max(3, own - 2 + between(s, 0, 4));
}

/**
 * Runs a whole battle at once and applies its rewards to `s` (mutated).
 * Returns { result: 'win'|'lose'|'caught'|'escape', lead, transformation, captured? }.
 * A captured species is returned rather than added so the caller can run party reorganisation.
 */
export function autoBattle(s, { kind, opponentId, regionId, allowCapture = false, level: specifiedLevel, reward = true }) {
  const g = s.game, lead = chooseLead(s.party, opponentId, kind);
  // Trained opponents scale with the life's difficulty; wild Pokémon stay as they are.
  const level = Math.min(100, Math.round((specifiedLevel ?? opponentLevel(s, kind, lead, regionId)) * (kind === 'wild' ? 1 : diff(s, 'level'))));
  const foeTypes = typesOf(opponentId), attack = bestAttack(lead.id, foeTypes);
  const transformation = transformationFor(s, lead, kind, regionId);
  if (transformation === 'tera') g.teraType = attack.type;
  const ownLevel = xpLevel(lead), giant = ['dynamax', 'gmax'].includes(transformation);
  const maxHp = 35 + level * 3;
  let foeHp = maxHp, hp = (35 + ownLevel * 3) * (giant ? 2 : 1), result = 'escape', captured = null;

  for (let turn = 0; turn < 30; turn++) {
    const boost = transformation === 'mega' ? 1.6 : transformation === 'z' && turn === 0 ? 2.5
      : transformation === 'gmax' && turn < 3 ? 1.9 : transformation === 'dynamax' && turn < 3 ? 1.5 : transformation === 'tera' ? 1.2 : 1;
    if (attack.power > 0) foeHp -= Math.max(1, Math.round((7 + ownLevel * 0.7) * attack.power * boost * (0.85 + random(s) * 0.15)));
    // When trying to catch, the trainer holds back instead of knocking the target out.
    if (allowCapture && g.balls > 0 && foeHp <= 0) foeHp = 1;
    if (foeHp <= 0) { result = 'win'; break; }
    if (allowCapture && g.balls > 0 && foeHp / maxHp < 0.5) {
      g.balls -= 1;
      if (random(s) < 0.15 + 0.7 * (1 - foeHp / maxHp) + diff(s, 'capture')) { result = 'caught'; captured = opponentId; break; }
    }
    const defend = transformation === 'tera' ? [g.teraType] : typesOf(lead.id);
    // Wild Pokémon attack with their main type. Trainers' Pokémon pick their best type against the lead and hit harder.
    const incoming = incomingMultiplier(kind, foeTypes, defend, s);
    if (incoming > 0) hp -= Math.max(1, Math.round((6 + level * 0.75) * incoming));
    if (giant && turn === 2) hp = Math.ceil(hp / 2);
    if (hp <= 0) { result = 'lose'; break; }
  }

  lead.battles = (lead.battles || 0) + 1;
  if (result === 'win') {
    g.wins += 1;
    lead.wins = (lead.wins || 0) + 1;
    lead.xp = (lead.xp || 0) + (kind === 'wild' ? 35 : 70);
    s.money += reward ? ({ gym: 500, league: 1200, villain: 300, rival: 200, raid: 300, facility: 250 }[kind] ?? 150) : 0;
    s.reputation = clamp((s.reputation || 0) + (reward ? ({ gym: 4, league: 12, villain: 5, rival: 3, raid: 3, facility: 1 }[kind] ?? 1) : 0), 0, 100);
    if (kind === 'gym') g.badges[regionId] = Math.min(8, (g.badges[regionId] || 0) + 1);
    if (kind === 'raid' && GMAX_FORMS[opponentId] && !g.gmax.includes(opponentId)) g.gmax.push(opponentId);
  } else lead.xp = (lead.xp || 0) + 15;
  if (result === 'caught') g.catches += 1;
  return { result, lead, transformation, captured, level, reward };
}

export function battleSummary({ result, lead, transformation, level, reward }, name = id => `#${id}`) {
  const opening = `${name(lead.id)} 선두로 내보냈다(상대 Lv.${level}). ${transformation ? `${MECHANICS[transformation].name}를 사용했다. ` : ''}`;
  return opening + {
    win: reward === false ? '이번 대전에서 승리해 경험치를 얻었다. 상금은 연전 전체를 통과해야 지급된다.' : '배틀에서 승리했다. 경험치와 보상을 받았다.',
    lose: '배틀에서 패배했다. 파트너는 센터에서 회복했다.',
    caught: '포획에 성공했다.',
    escape: '승부가 나지 않아 안전하게 물러났다.',
  }[result];
}
