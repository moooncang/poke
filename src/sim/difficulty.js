// Difficulty: one setting per life, chosen at birth, never changed. Each level is a bundle of multipliers the
// simulation reads through `diff(s, key)`; nothing else knows the level names. Legend is meant to be brutal.
export const DIFFICULTIES = {
  easy: { name: '쉬움', detail: '넉넉한 출발과 수입, 너그러운 판정과 상대. 불운은 드물고 빚은 가볍다. 느긋하게 이야기를 보고 싶을 때.',
    money: 2, income: 1.3, expense: 0.8, check: 10, level: 0.85, power: 0.9, misfortune: 0.5, dark: 0.8, interest: 0.05, bankruptcy: 12000,
    drift: 0.8, training: 1.2, lifespan: 4, balls: 4, capture: 0.1, arrest: 0.6, death: 0.7 },
  normal: { name: '보통', detail: '기준 규칙. 삶은 순탄하지도 가혹하지도 않다.',
    money: 1, income: 1, expense: 1, check: 0, level: 1, power: 1, misfortune: 1, dark: 1, interest: 0.08, bankruptcy: 8000,
    drift: 1, training: 1, lifespan: 0, balls: 3, capture: 0, arrest: 1, death: 1 },
  hard: { name: '어려움', detail: '절반의 출발금, 적은 수입과 비싼 생활비. 판정 −8%p, 상대 레벨 +15%, 불운 1.6배, 빚 이자 12%. 체포도 빠르다.',
    money: 0.5, income: 0.8, expense: 1.2, check: -8, level: 1.15, power: 1.15, misfortune: 1.6, dark: 1.3, interest: 0.12, bankruptcy: 6000,
    drift: 1.2, training: 0.9, lifespan: -3, balls: 2, capture: -0.1, arrest: 1.3, death: 1.3 },
  legend: { name: '레전드', detail: '출발금 4분의 1, 수입 60%, 생활비 1.5배, 판정 −15%p, 상대 레벨 +30%와 공격 1.35배, 불운 2.2배, 이자 16%, 4,000P에서 파산, 몬스터볼 연 1개, 수명 −6년. 살아남는 것 자체가 기록이다.',
    money: 0.25, income: 0.6, expense: 1.5, check: -15, level: 1.3, power: 1.35, misfortune: 2.2, dark: 1.6, interest: 0.16, bankruptcy: 4000,
    drift: 1.4, training: 0.75, lifespan: -6, balls: 1, capture: -0.2, arrest: 1.6, death: 1.8 },
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'legend'];

export const difficultyOf = s => Object.hasOwn(DIFFICULTIES, s?.difficulty) ? s.difficulty : 'normal';
/** One multiplier or offset of the life's difficulty (see DIFFICULTIES for the keys). */
export const diff = (s, key) => DIFFICULTIES[difficultyOf(s)][key];
export const difficultyName = s => DIFFICULTIES[difficultyOf(s)].name;
export const difficultyRank = s => DIFFICULTY_ORDER.indexOf(difficultyOf(s));
