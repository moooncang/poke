// Representative moves per type, by the user's level. Battles stay automatic: the move is narration that makes the
// type matchup visible ("화염방사 · 효과가 굉장했다"), not a separate moveset system.
export const MOVES = {
  '노말': ['몸통박치기', '돌진', '기가임팩트'], '불꽃': ['불꽃세례', '화염방사', '오버히트'], '물': ['물대포', '물의파동', '하이드로펌프'],
  '풀': ['덩굴채찍', '잎날가르기', '솔라빔'], '전기': ['전기쇼크', '10만볼트', '번개'], '얼음': ['얼음뭉치', '냉동빔', '눈보라'],
  '격투': ['로킥', '깨트리기', '인파이트'], '독': ['독침', '오물폭탄', '더스트슈트'], '땅': ['진흙뿌리기', '땅고르기', '지진'],
  '비행': ['날개치기', '공중날기', '브레이브버드'], '에스퍼': ['염동력', '사이코키네시스', '미래예지'], '벌레': ['벌레먹기', '시저크로스', '메가혼'],
  '바위': ['돌떨구기', '스톤샤워', '스톤에지'], '고스트': ['핥기', '섀도볼', '섀도클로'], '드래곤': ['용의숨결', '드래곤클로', '역린'],
  '악': ['물기', '깨물어부수기', '악의파동'], '강철': ['메탈클로', '아이언헤드', '러스터캐논'], '페어리': ['요정의바람', '매지컬샤인', '문포스'],
};
/** The move a Pokémon of this level uses for a type: basic under Lv.25, standard under Lv.55, then the strongest. */
export const moveFor = (type, level) => (MOVES[type] || MOVES['노말'])[level < 25 ? 0 : level < 55 ? 1 : 2];
/** How a matchup reads: ×2 or more "굉장", ×1 "보통", under ×1 "별로", 0 "효과 없음". */
export const effectiveness = m => m === 0 ? '효과가 없었다' : m >= 2 ? '효과가 굉장했다' : m > 1 ? '효과가 꽤 있었다' : m === 1 ? '효과는 보통이었다' : '효과가 별로였다';
