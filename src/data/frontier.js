// Battle facilities. Hoenn's Battle Frontier has seven facilities with silver and gold symbols; other regions have
// one long-running facility with three streak tiers. Every challenge is a series of automatic battles; facilities
// with their own rule add a stat check first (the series only starts if the check succeeds).
import { currentRegion } from '../sim/world.js';
import { badgeCount } from '../sim/battle.js';
import { goalOf } from '../sim/goals.js';
import { LEGENDARY } from './species-rules.js';
import { pick } from '../sim/random.js';

const STRONG = [3, 6, 9, 65, 68, 94, 112, 130, 131, 134, 135, 136, 143, 149, 181, 186, 196, 197, 208, 212, 214, 229, 230, 232, 242, 248,
  254, 257, 260, 282, 289, 306, 310, 330, 334, 350, 365, 373, 376, 389, 392, 395, 405, 407, 409, 411, 445, 448, 460, 461, 462, 464, 466,
  467, 468, 471, 472, 473, 474, 475, 477, 530, 534, 553, 563, 567, 576, 579, 589, 598, 601, 604, 609, 612, 614, 621, 623, 625, 635, 637,
  652, 655, 658, 663, 673, 681, 683, 695, 697, 699, 700, 706, 715, 724, 727, 730, 733, 738, 745, 748, 758, 763, 768, 773, 784, 812, 815,
  818, 823, 849, 861, 862, 866, 869, 879, 884, 887, 900, 903, 908, 911, 914, 923, 925, 937, 938, 959, 963, 968, 970, 976, 979, 983, 998]
  .filter(id => !LEGENDARY.has(id));
export const FRONTIER_POOL = STRONG;

const opt = (label, description, outcome, extra = {}) => ({ label, description, outcome, effects: {}, ...extra });
const lineup = (s, count) => Array.from({ length: count }, () => pick(s, FRONTIER_POOL));
const ramp = (from, to, count) => Array.from({ length: count }, (_, i) => Math.round(from + (to - from) * (count === 1 ? 1 : i / (count - 1))));
const training = () => opt('기록을 분석하며 훈련만 한다', '파티 경험치 +25', '지난 도전의 기록을 돌려 보며 약점을 보완했다.', { tone: 'curious', training: 25 });
const pass = () => opt('오늘은 구경만 한다', '행복 +1', '전광판의 연승 기록을 올려다보며 다음을 기약했다.', { tone: 'easygoing', effects: { joy: 1 } });

// ── Hoenn Battle Frontier: seven facilities, silver then gold symbol ──
export const FACILITIES = [
  { id: 'tower', name: '배틀타워', rule: '쉬지 않고 이어지는 연전', rounds: [5, 7] },
  { id: 'dome', name: '배틀돔', rule: '토너먼트. 대진표의 상대를 차례로 꺾는다', rounds: [4, 4] },
  { id: 'palace', name: '배틀팰리스', rule: '포켓몬이 스스로 판단해 싸운다. 트레이너와의 유대가 먼저 시험받는다', rounds: [4, 6], check: ['bond', 10, 25] },
  { id: 'arena', name: '배틀아레나', rule: '세 턴 안에 기세로 판정한다. 트레이너의 배짱이 먼저 시험받는다', rounds: [4, 6], check: ['courage', 10, 25] },
  { id: 'factory', name: '배틀팩토리', rule: '빌린 포켓몬으로 싸운다. 대여 목록을 읽는 안목이 먼저 시험받는다', rounds: [4, 6], check: ['wisdom', 10, 25] },
  { id: 'pike', name: '배틀파이크', rule: '갈림길의 방마다 함정과 배틀이 기다린다. 체력이 먼저 시험받는다', rounds: [3, 5], check: ['vitality', 5, 20] },
  { id: 'pyramid', name: '배틀피라미드', rule: '빛이 없는 층을 탐색하며 올라간다. 지식이 먼저 시험받는다', rounds: [3, 5], check: ['wisdom', 15, 30] },
];
export const symbolFlag = (facility, tier) => `frontier-${facility}-${tier ? 'gold' : 'silver'}`;
export const frontierSymbols = s => FACILITIES.reduce((n, f) => n + (s.flags[symbolFlag(f.id, 0)] ? 1 : 0) + (s.flags[symbolFlag(f.id, 1)] ? 1 : 0), 0);
export const frontierGold = s => FACILITIES.filter(f => s.flags[symbolFlag(f.id, 1)]).length;
const inHoenn = s => currentRegion(s) === 'hoenn';

const facilityEvent = f => ({
  id: `frontier-${f.id}`, category: 'frontier', min: 14, max: 85, once: false, cooldown: 2, weight: () => 4,
  when: s => inHoenn(s) && s.party.length > 0 && s.flags['frontier-pass'] && !s.flags[symbolFlag(f.id, 1)],
  build: s => {
    const tier = s.flags[symbolFlag(f.id, 0)] ? 1 : 0, rounds = f.rounds[tier];
    const levels = tier ? ramp(58, 72, rounds) : ramp(42, 54, rounds);
    const symbol = tier ? '골드 심볼' : '실버 심볼';
    const challenge = opt(`${f.name}에 도전한다`, `${rounds}연전 · 상대 Lv.${levels[0]}→${levels.at(-1)} · 모두 이기면 ${symbol}${f.check ? ' · 시설 규칙 판정 후 시작' : ''}`,
      `${f.name}의 문이 열렸다.`, {
        tone: 'bold', battle: { kind: 'facility', opponents: lineup(s, rounds), levels },
        after: { win: { flag: symbolFlag(f.id, tier), effects: { reputation: tier ? 4 : 2, joy: 3 }, outcome: `프런티어 브레인을 꺾고 ${f.name}의 ${symbol}을 손에 넣었다.` },
          lose: { effects: { wisdom: 2 }, outcome: '연승이 끊겼다. 기록판에 이름 대신 다음 도전 예약이 남았다.' } },
        ...(f.check ? { challenge: { stat: f.check[0], difficulty: f.check[1 + tier], failure: { effects: { wisdom: 1 }, outcome: '시설 규칙의 첫 관문에서 막혔다. 배틀까지 가지 못했다.' } } } : {}),
      });
    return { kind: 'choice', title: `배틀프런티어 · ${f.name}`, body: `${f.name}: ${f.rule}. ${tier ? '실버 심볼을 가진 도전자에게 프런티어 브레인이 전력으로 나선다.' : '연승을 이어 가면 프런티어 브레인이 모습을 드러낸다.'}`,
      choices: [challenge, training(), pass()] };
  },
});

const frontierCore = [
  { id: 'frontier-pass', category: 'frontier', min: 14, max: 80, weight: () => 5,
    urgent: s => goalOf(s) === 'frontier',
    when: s => inHoenn(s) && s.party.length > 0 && (badgeCount(s) >= 8 || s.reputation >= 30 || goalOf(s) === 'frontier'),
    build: () => ({ kind: 'choice', title: '배틀프런티어 초대장', body: '호연 남쪽 바다 위의 섬에 일곱 개의 배틀 시설이 모인 배틀프런티어가 있다. 각 시설의 프런티어 브레인을 꺾으면 심볼을 받는다.',
      choices: [
        opt('프런티어 패스를 발급받는다', '배틀프런티어 7개 시설 개방', '사진이 박힌 프런티어 패스를 받았다.', { tone: 'bold', flag: 'frontier-pass', effects: { courage: 2 } }),
        opt('지금은 다른 일이 먼저다', '행복 +1', '초대장을 서랍에 넣어 두었다.', { effects: { joy: 1 } }),
      ] }) },
  { id: 'frontier-master', category: 'frontier', min: 14, max: 99, weight: () => 8, urgent: true,
    when: s => frontierGold(s) >= FACILITIES.length,
    build: () => ({ kind: 'choice', memory: true, title: '배틀프런티어 정복', body: '일곱 시설의 골드 심볼이 모두 패스에 박혔다. 섬의 전광판에 당신과 파트너들의 이름이 오래 남게 되었다.',
      choices: [
        opt('프런티어 브레인들과 기념 사진을 찍는다', '명성 +4 · 행복 +4', '일곱 브레인이 한자리에 모인 사진이 시설 입구에 걸렸다.', { flag: 'frontier-master', effects: { reputation: 4, joy: 4 } }),
        opt('조용히 섬을 떠난다', '유대 +4', '파트너들과 배를 타고 돌아오며 지난 승부들을 하나씩 떠올렸다.', { flag: 'frontier-master', effects: { bond: 4 } }),
      ] }) },
];

// ── One facility per region, three streak tiers ──
export const REGION_FACILITIES = [
  { id: 'trainer-tower', region: 'kanto', name: '트레이너 타워', place: '나나섬 끝자락의 탑', streaks: [10, 30, 50] },
  { id: 'battle-tower-johto', region: 'johto', name: '배틀타워', place: '금빛시티 서쪽의 배틀타워', streaks: [7, 21, 49] },
  { id: 'battle-tower-sinnoh', region: 'sinnoh', name: '배틀타워', place: '바닷가 배틀 구역의 높은 탑', streaks: [7, 21, 49] },
  { id: 'battle-subway', region: 'unova', name: '배틀서브웨이', place: '노선마다 다른 열차가 달리는 지하 시설', streaks: [7, 21, 49] },
  { id: 'battle-maison', region: 'kalos', name: '배틀메종', place: '바다가 보이는 저택의 연회장', streaks: [10, 30, 50] },
  { id: 'battle-tree', region: 'alola', name: '배틀트리', place: '거대한 나무 위의 배틀 시설', streaks: [10, 30, 50] },
  { id: 'battle-tower-galar', region: 'galar', name: '배틀타워', place: '로즈타워를 고친 배틀타워', streaks: [10, 30, 50] },
  { id: 'academy-ace', region: 'paldea', name: '아카데미 에이스 토너먼트', place: '테이블시티 아카데미 경기장', streaks: [4, 12, 24] },
];
export const streakFlag = (facility, tier) => `facility-${facility}-${tier + 1}`;
export const facilityTier = (s, facility) => [0, 1, 2].filter(t => s.flags[streakFlag(facility, t)]).length;

const regionFacility = f => ({
  id: `facility-${f.id}`, category: 'frontier', min: 14, max: 85, once: false, cooldown: 2, weight: () => 3,
  when: s => currentRegion(s) === f.region && s.party.length > 0 && facilityTier(s, f.id) < 3 && (badgeCount(s) >= 4 || s.reputation >= 20 || goalOf(s) === 'frontier'),
  build: s => {
    const tier = facilityTier(s, f.id), rounds = 4 + tier, base = [44, 58, 72][tier];
    const levels = ramp(base, base + 10, rounds);
    return { kind: 'choice', title: `${f.name} · ${f.streaks[tier]}연승 도전`, body: `${f.place}. 연승 기록이 ${f.streaks[tier]}에 닿으면 시설의 정점에 선 트레이너가 직접 나선다. 지금 기록 단계 ${tier}/3.`,
      choices: [
        opt(`${f.streaks[tier]}연승에 도전한다`, `${rounds}연전으로 압축한 결정전 · 상대 Lv.${levels[0]}→${levels.at(-1)} · 모두 이기면 기록 단계 ${tier + 1}`, `${f.name}에서 연승 도전을 시작했다.`, {
          tone: 'bold', battle: { kind: 'facility', opponents: lineup(s, rounds), levels },
          after: { win: { flag: streakFlag(f.id, tier), effects: { reputation: 2 + tier, joy: 2 }, outcome: `${f.streaks[tier]}연승을 달성했다. 시설 전광판에 이름이 올랐다.` },
            lose: { effects: { courage: 1 }, outcome: '연승이 끊겼다. 다음에는 처음부터 다시 쌓는다.' } } }),
        training(), pass(),
      ] };
  },
});

export const FRONTIER_EVENTS = [...frontierCore, ...FACILITIES.map(facilityEvent), ...REGION_FACILITIES.map(regionFacility)];
export const facilityStreaks = s => REGION_FACILITIES.reduce((n, f) => n + facilityTier(s, f.id), 0);
