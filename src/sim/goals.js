// A life goal the player can set (and change) at any time. It does not unlock anything by itself;
// it tilts which kinds of events come up, how the character decides on auto, and (for the league) how fast it moves.

export const GOALS = {
  free: { name: '흘러가는 대로', detail: '특정 목표 없이 세계와 사람들 사이에서 산다.', weights: {} },
  champion: { name: '리그 제패', detail: '체육관 원정과 리그 본선이 자주 열리고 매년 이어진다. 파티 육성 +25%. 다른 지방 리그로 원정을 떠날 수 있다.',
    weights: { league: 4, field: 1.3 }, training: 1.25 },
  collector: { name: '도감 완성', detail: '야생 조우·포켓몬 사건·전설 조사가 더 자주 열린다.', weights: { field: 2, pokemon: 1.6, legend: 1.6, special: 1.6 } },
  family: { name: '가족과 인연', detail: '연애·가족·주변 사람의 사건이 더 자주 열린다.', weights: { romance: 1.8, family: 1.8, cast: 1.6 } },
  career: { name: '일의 정점', detail: '직업·경력·사업 기회 사건이 더 자주 열린다.', weights: { career: 1.5, work: 1.8, opportunity: 1.5 } },
  coordinator: { name: '콘테스트 스타', detail: '콘테스트·쇼케이스가 자주 열리고 캐릭터가 무대를 고른다. 호연·신오·칼로스에 콘테스트 회장이 있다.', weights: { contest: 4, pokemon: 1.3 } },
  frontier: { name: '배틀 시설 정복', detail: '배틀프런티어와 지방 배틀 시설 도전이 자주 열린다. 파티 육성 +15%.', weights: { frontier: 4, league: 1.5 }, training: 1.15 },
};

export const goalOf = s => Object.hasOwn(GOALS, s.goal) ? s.goal : 'free';
export const goalWeight = (s, category) => GOALS[goalOf(s)].weights[category] ?? 1;
export const goalTraining = s => GOALS[goalOf(s)].training ?? 1;

/** How well a choice fits the goal, used when the character decides on their own. */
export function goalFit(s, choice) {
  const goal = goalOf(s), battle = choice.battle?.kind;
  if (goal === 'champion') {
    if (/^league-[a-z]+-withdrawn$/.test(choice.flag || '')) return 0.15;
    if (/^league-[a-z]+-licensed$/.test(choice.flag || '')) return 4;
    return ['league', 'gym'].includes(battle) ? 3 : 1;
  }
  if (goal === 'coordinator') return choice.contest ? 3 : choice.affection ? 1.4 : 1;
  if (goal === 'frontier') return choice.battle?.kind === 'facility' ? 3 : choice.battle ? 1.5 : 1;
  if (goal === 'collector') return choice.captureJoin || choice.join || choice.observe || choice.battle?.capture ? 2.2 : 1;
  if (goal === 'family') return choice.relationship || (choice.effects?.bond || 0) > 0 || choice.cast ? 1.6 : 1;
  if (goal === 'career') return choice.promotion || choice.career || (choice.effects?.money || 0) > 0 ? 1.8 : 1;
  return 1;
}

/** Returns a new state with the goal changed (the input itself when nothing changes). */
export function setGoal(input, goal) {
  if (!Object.hasOwn(GOALS, goal) || goalOf(input) === goal) return input;
  return { ...structuredClone(input), goal };
}
