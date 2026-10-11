// New-game options carried by the state: family perks (unlocked through the legacy, see sim/legacy.js perkUnlocks)
// and challenge rules the player can opt into. The simulation only reads `s.perks` and `s.rules`; whether a perk was
// really unlocked is the UI's business (a save edited by hand only cheats its own life).

export const PERK_SLOTS = 3;
export const PERKS = {
  'shiny-charm': { name: '빛나는 부적', detail: '색이 다른 포켓몬과의 만남이 세 배 잦아진다.' },
  'exp-share': { name: '학습장치', detail: '파티의 연간 경험치 +10%.' },
  'amulet-coin': { name: '부적금화', detail: '직업 수입 +10%.' },
  'oval-charm': { name: '둥근부적', detail: '키우미집(교배) 사건이 두 배 자주 열린다.' },
  'ball-case': { name: '몬스터볼 케이스', detail: '몬스터볼 12개를 더 가지고 시작한다.' },
  'long-line': { name: '장수 가문', detail: '수명 한계 +4년.' },
  'renowned': { name: '명문가', detail: '명성 +10으로 시작한다.' },
  'town-pass': { name: '출생지 선택권', detail: '태어날 마을을 직접 고른다.' },
  'starter-pick': { name: '파트너 선택권', detail: '가문이 함께했던 포켓몬 계열 중에서 첫 파트너를 고른다.' },
};

export const RULES = {
  solo: { name: '단짝 여행', detail: '파티에는 첫 파트너와 전설의 포켓몬만 둔다. 다른 포켓몬은 모두 PC 박스로 간다.' },
  poor: { name: '무일푼 출발', detail: '소지금 0P로 시작하고 유산을 받지 않는다.' },
  frail: { name: '짧은 생', detail: '수명 한계가 70세를 넘지 않는다.' },
  hard: { name: '강적의 시대', detail: '트레이너 상대의 공격이 25% 더 강하다.' },
  wanderer: { name: '떠돌이 운명', detail: '16세부터 5년마다 다른 지방으로 떠난다.' },
};

export const hasPerk = (s, id) => Boolean(s.perks?.includes(id));
export const hasRule = (s, id) => Boolean(s.rules?.includes(id));
export const RULE_TRAINER_POWER = 1.25;
export const RULE_FRAIL_LIFESPAN = 70;
export const WANDER_EVERY = 5;

/** Keeps only known, distinct ids (perks also limited to PERK_SLOTS). */
export const cleanPerks = list => [...new Set(Array.isArray(list) ? list : [])].filter(id => Object.hasOwn(PERKS, id)).slice(0, PERK_SLOTS);
export const cleanRules = list => [...new Set(Array.isArray(list) ? list : [])].filter(id => Object.hasOwn(RULES, id));
