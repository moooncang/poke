import { talentPathChoice } from './talent-events.js';
// Age-anchored turning points (learning style and first career). Everything else in a life is condition-driven.
import { careerReview } from './progression.js';
import { academyExam } from './challenges.js';
import { STAT_LABELS } from '../sim/labels.js';
import { josa } from '../sim/text.js';

// The way a person is currently learning keeps nudging one stat every year until it changes.
export const EDUCATION_GROWTH = { school: 'wisdom', academy: 'wisdom', study: 'wisdom', home: 'bond', community: 'bond', field: 'courage', apprentice: 'courage', travel: 'courage', pause: 'vitality' };

const SCHOOL = {
  7: { title: '어린 시절의 학습 방식', body: () => '가족과 앞으로 배울 방식을 정한다. 학교에 다니지 않는 길도 선택할 수 있다.', options: () => [
    ['트레이너 스쿨 입학', 'school-enrolled', { wisdom: 6 }, 'school', { cast: { friend: { affinity: 10 } } }],
    ['가족과 가정학습', 'home-learning', { bond: 6 }, 'home', { cast: { family: { health: 5 } } }],
    ['보호자와 현장 체험', 'guided-learning', { courage: 5, vitality: 2 }, 'field'],
  ] },
  12: { title: '성장기 활동 방향', body: () => '지금까지의 생활을 돌아보고 다음 활동을 정한다. 학교로 진학하거나 다른 방식으로 배울 수 있다.', options: () => [
    ['중등 학교에 진학', 'secondary-school', { wisdom: 8 }, 'school'],
    ['가정학습과 자율 연구', 'independent-study', { wisdom: 5, bond: 3 }, 'home'],
    ['돌봄 센터에서 체험 학습', 'care-experience', { bond: 8 }, 'field'],
    ['지역 탐방과 체력 회복', 'youth-break', { vitality: 8, joy: 4 }, 'pause'],
  ] },
  18: { title: s => s.education === 'school' ? '학교 졸업 후의 선택' : '성인기의 새로운 방향',
    body: s => s.education === 'school' ? '학교 과정을 마쳤다. 진학은 여러 선택 중 하나다.' : '학교 밖에서 쌓은 경험을 바탕으로 앞으로의 생활을 결정한다.', options: () => [
      ['전문 아카데미에 진학', 'higher-education', { wisdom: 8 }, 'academy'],
      ['현장 견습 시작', 'field-training', { courage: 6, money: 300 }, 'apprentice'],
      ['돌봄 센터에 바로 취업', 'direct-work', { money: 500, courage: 4 }, 'work'],
      ['지방을 여행하며 탐색', 'gap-travel', { courage: 8, joy: 4 }, 'travel'],
      ['휴식하며 다음 계획 준비', 'adult-break', { vitality: 10, joy: 5 }, 'pause'],
    ] },
  22: { title: s => s.education === 'academy' ? '전문 과정 졸업' : s.education === 'apprentice' ? '견습 과정 수료' : '앞으로의 활동 계획',
    body: () => '현재까지의 경험을 바탕으로 활동 방향을 다시 선택한다. 진학이나 취업을 미뤄도 된다.', options: s => [
      ['전문 교육으로 역량 보완', 'continued-study', { wisdom: 7 }, 'study'],
      [s.career ? '현재 진로에서 경력 확장' : '포켓몬 돌봄 업무 시작', 'experienced', { courage: 5, money: 400 }, 'work'],
      ['지역 공동체에서 활동', 'community-worker', { bond: 7 }, 'community', { world: { safety: 2 } }],
      ['여행과 자율 연구를 계속', 'independent-life', { courage: 4, wisdom: 4 }, 'travel'],
      ['가족과 지내며 재충전', 'family-break', { bond: 5, vitality: 7 }, 'pause', { cast: { family: { health: 5 } } }],
    ] },
};

function schoolEvent(s, plan) {
  const title = typeof plan.title === 'function' ? plan.title(s) : plan.title;
  const choices = plan.options(s).map(([label, flag, effects, education, extra = {}]) => ({
    label, flag, effects, education, ...extra,
    ...(education === 'work' ? { career: s.career || 'keeper' } : {}),
    description: EDUCATION_GROWTH[education] ? `이 방식을 이어가는 동안 매년 ${STAT_LABELS[EDUCATION_GROWTH[education]]} +1` : '직업 수입으로 생활 시작',
    outcome: `${josa(label, '을', '를')} 선택했다. 이후 생활 계획에 반영한다.`,
  }));
  return { kind: 'choice', title, body: plan.body(s), choices: [...choices, ...([18,22].includes(s.age)?[academyExam]:[]), talentPathChoice(s)] };
}

/** The fixed event for this age, if any. */
export function milestoneEvent(s) {
  if (SCHOOL[s.age]) return schoolEvent(s, SCHOOL[s.age]);
  if (s.age === 16) return careerReview(s, 16);
  return null;
}
