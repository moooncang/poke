// People around the player live their own lives. Their situation changes every year with the world,
// and those changes open (or close) events for the player.
import { TOWNS } from '../data/world.js';
import { pick, between, chance, clamp } from './random.js';
import { hasCondition, regionState } from './world.js';
import { josa } from './text.js';

const NAMES = {
  friend: ['지우', '하린', '도현', '서아', '민준', '유나', '태오', '소율', '건우', '예린'],
  rival: ['카이', '레온', '세린', '진', '루나', '한결', '다온', '이안'],
  sibling: ['은호', '나래', '시온', '보라', '우진', '해솔'],
};
const SIBLINGS = { merchant: '형제', ranger: '동생', fishing: '사촌', farm: '사촌', breeder: '동생' };

export const PATHS = {
  child: '어린이', student: '학생', worker: '직장인', shopkeeper: '가게 운영', traveler: '여행 트레이너', unemployed: '구직 중',
  researcher: '연구원', unknown: '아직 만나지 않음', trainer: '트레이너', drifting: '방황 중', villain: '조직원',
  reformed: '재기 중', gymleader: '체육관 관장', elite: '리그 상위권', retired: '은퇴', home: '고향에서 생활', gone: '세상을 떠남',
};

export function createCast(s, choose = values => pick(s, values)) {
  const cast = {
    friend: { name: choose(NAMES.friend), role: '소꿉친구', affinity: 55, path: 'child', town: s.town, married: false },
    rival: { name: choose(NAMES.rival), role: '라이벌', affinity: 40, path: 'unknown', met: false, power: 15 },
    family: { name: '고향의 가족', role: '가족', health: 75 + Math.floor(choose([0, 5, 10, 15, 20])), path: 'home' },
  };
  const sibling = SIBLINGS[s.background?.id];
  if (sibling) cast.sibling = { name: choose(NAMES.sibling), role: sibling, affinity: 60, path: 'child', town: s.town };
  return cast;
}


export function changeCast(s, changes = {}) {
  for (const [id, change] of Object.entries(changes)) {
    const person = s.cast[id];
    if (!person) continue;
    for (const [key, value] of Object.entries(change)) {
      if (key === 'affinity' || key === 'power') person[key] = clamp(Math.round((person[key] || 0) + value), 0, 100);
      else person[key] = value;
    }
  }
}

const update = (title, body) => ({ kind: 'people', automatic: true, title, body, effects: {} });

function careerFor(s, person) {
  const economy = regionState(s, TOWNS.find(t => t.id === person.town)?.map).economy;
  return chance(s, economy / 160) ? pick(s, ['worker', 'shopkeeper']) : pick(s, ['traveler', 'researcher', 'worker', 'unemployed']);
}

function tickPeer(s, id, years) {
  const person = s.cast[id], records = [];
  if (!person || person.path === 'gone') return records;
  const regionId = TOWNS.find(t => t.id === person.town)?.map;
  if (years === 12 && person.path === 'child') person.path = 'student';
  else if (years >= 19 && person.path === 'student' && chance(s, 0.5)) {
    person.path = careerFor(s, person);
    if (chance(s, 0.35)) person.town = pick(s, TOWNS).id;
    const town = TOWNS.find(t => t.id === person.town);
    records.push(update(`${person.name}의 소식`, `${person.role} ${josa(person.name, '이', '가')} ${town.region}지방 ${town.name}에서 ${PATHS[person.path]}의 길을 걷기 시작했다.`));
  } else if (['worker', 'shopkeeper'].includes(person.path) && hasCondition(s, 'recession', regionId) && chance(s, 0.3)) {
    person.path = 'unemployed';
    person.needsHelp = true;
    records.push(update(`${person.name}의 소식`, `경기 침체로 ${person.role} ${josa(person.name, '이', '가')} 일자리를 잃었다는 이야기를 들었다.`));
  } else if (person.path === 'unemployed' && chance(s, 0.25 + regionState(s, regionId).economy / 300)) {
    person.path = pick(s, ['worker', 'shopkeeper']);
    person.needsHelp = false;
    records.push(update(`${person.name}의 소식`, `${josa(person.name, '이', '가')} 새 일을 구했다며 연락해 왔다.`));
  }
  if (years >= 24 && years <= 45 && !person.married && chance(s, 0.07)) { person.married = true; person.wedding = true; }
  // Living far apart slowly loosens ties.
  if (person.town && TOWNS.find(t => t.id === person.town)?.map !== TOWNS.find(t => t.id === s.town).map) person.affinity = clamp(person.affinity - 1, 0, 100);
  return records;
}

function tickRival(s) {
  const rival = s.cast.rival, records = [];
  if (!rival.met || ['gone', 'retired'].includes(rival.path)) return records;
  rival.power = clamp(rival.power + between(s, 1, 4) + (rival.path === 'trainer' ? 1 : 0), 0, 100);
  if (rival.path === 'trainer' && rival.affinity < 25 && regionState(s).safety < 45 && chance(s, 0.35)) {
    rival.path = 'drifting';
    records.push(update(`${rival.name}의 소식`, `연락이 끊겼던 ${josa(rival.name, '이', '가')} 수상한 사람들과 어울린다는 소문이 돌았다.`));
  } else if (rival.path === 'trainer' && rival.power >= 85 && s.age >= 30 && chance(s, 0.2)) {
    rival.path = 'elite';
    records.push(update(`${rival.name}의 소식`, `라이벌 ${josa(rival.name, '이', '가')} 리그 상위권에 올랐다는 소식이 신문에 실렸다.`));
  } else if (rival.path === 'reformed' && chance(s, 0.3)) {
    rival.path = 'trainer';
    records.push(update(`${rival.name}의 소식`, `${josa(rival.name, '이', '가')} 다시 체육관 도전을 시작했다고 알려 왔다.`));
  }
  if (s.age >= 66 && chance(s, 0.15)) rival.path = 'retired';
  return records;
}

function tickFamily(s) {
  const family = s.cast.family, records = [];
  if (family.path === 'gone' || s.age < 22) return records;
  const decline = between(s, 0, 3) + (hasCondition(s, 'outbreak', TOWNS.find(t => t.id === s.hometown).map) ? 3 : 0) + (s.age > 45 ? 2 : 0);
  family.health = clamp(family.health - decline, 0, 100);
  if (family.health < 30 && !family.sick) {
    family.sick = true;
    records.push(update('고향에서 온 연락', '고향의 가족이 자주 아프다는 연락을 받았다. 예전 같지 않은 목소리였다.'));
  }
  return records;
}

/** One year of everyone else's lives. Returns journal records for notable changes. */
export function tickPeople(s) {
  return [...tickPeer(s, 'friend', s.age), ...tickPeer(s, 'sibling', s.age + 3), ...tickRival(s), ...tickFamily(s)];
}
