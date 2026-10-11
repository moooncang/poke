import { talentGrowth } from '../sim/talent.js';
import { goalTraining } from '../sim/goals.js';
import { hasPerk } from '../sim/perks.js';
import { talentPathChoice } from './talent-events.js';
// Career progression and yearly party training (ported from the career-balance update).
// The 16-year-old choice is a fixed milestone; later reviews open within an age window instead of on an exact birthday.
import { CAREERS } from './world.js';
import { josa } from '../sim/text.js';

export function annualTraining(s) {
  const base = { traveler: 48, researcher: 28, keeper: 36, merchant: 18 }[s.career] ?? 20;
  const study = ['school', 'academy', 'study'].includes(s.education) ? 8 : s.education === 'apprentice' ? 12 : s.education === 'travel' ? 10 : 0;
  const focus = s.activity?.mode === 'courage' ? 10 : s.activity?.mode === 'bond' ? 5 : 0;
  return Math.round((base + study + focus) * talentGrowth(s) * goalTraining(s) * (hasPerk(s, 'exp-share') ? 1.1 : 1) * (s.stats.vitality < 35 ? 0.6 : 1) * (s.age >= 65 ? 0.7 : 1));
}

export const CAREER_REVIEWS = { 16: '진로 선택', 26: '첫 경력 평가', 35: '전문 분야 선택', 40: '직업 재설계', 50: '경력 전환과 후배 육성', 60: '은퇴 준비' };
const STAT_FOR = { traveler: 'courage', researcher: 'wisdom', keeper: 'bond', merchant: 'wisdom' };

/** Career checkpoint for a review phase (16, 26, 35, 40, 50, 60). */
export function careerReview(s, phase) {
  const first = phase === 16;
  const choices = Object.entries(CAREERS).filter(([id]) => id !== s.career).map(([career, c]) => ({
    label: first ? c.short : `${c.short} ${s.career ? '전직 평가' : '채용 평가'}`, career,
    description: first ? `기초 활동부터 시작 · 기본 연 수입 ${c.income}P` : '합격 시 직업 변경 · 실패 시 현재 생활 유지',
    effects: { [STAT_FOR[career]]: 3 }, outcome: `${c.name} 활동을 시작했다.`,
    ...(first ? {} : { challenge: { stat: STAT_FOR[career], difficulty: career === 'researcher' && s.education !== 'academy' ? 15 : 5,
      failure: { effects: { [STAT_FOR[career]]: 1 }, outcome: '이번 평가에서는 선발되지 못했다. 현재 생활을 유지하며 부족한 경험을 보완한다.' } } }),
  }));
  if (s.career) {
    const stat = STAT_FOR[s.career];
    choices.unshift({ label: `${CAREERS[s.career].short} 전문 자격에 도전`, description: '성공 시 경력 등급 +1 · 연 수입 15% 증가', effects: { [stat]: 3, money: 250 }, promotion: true,
      outcome: '전문 평가에 합격해 경력 등급이 올랐다.',
      challenge: { stat, difficulty: 10 + (s.careerRank || 0) * 8, failure: { effects: { [stat]: 1 }, outcome: '전문 평가에 불합격했다. 현재 직업과 경력 등급은 유지한다.' } } });
  }
  if (phase >= 50 && s.career) choices.push({ label: '후배 트레이너 육성 과정 운영', description: '지혜 판정 · 성공 시 파티 경험치 +45', training: 45, effects: { bond: 3 }, follow: [{ id: 'student-success', delay: [3, 6], p: 0.5 }],
    outcome: '후배 교육 과정을 마치고 파트너들과 지도 훈련을 함께했다.', challenge: { stat: 'wisdom', difficulty: 5, failure: { effects: { wisdom: 1 }, outcome: '교육 계획이 승인되지 않아 수업 자료를 보완한다.' } } });
  if (s.stats.vitality < 40) choices.push({ label: '건강 회복을 위해 일을 쉰다', description: '고정 수입 중단 · 건강 +10', leaveCareer: true, effects: { vitality: 10 }, outcome: '일을 쉬고 회복에 집중한다.' });
  if (s.relationship?.status === 'married' && s.career !== 'keeper') choices.push({ label: '가족과 가까운 지역 돌봄 일에 지원', career: 'keeper', description: '유대 판정 · 합격 시 지역 돌보미로 전직', effects: { bond: 2 },
    outcome: '거주지 근처 돌봄 업무를 맡아 가족과 일정을 맞췄다.', challenge: { stat: 'bond', difficulty: 0, failure: { effects: { bond: 1 }, outcome: '이번 지역 채용에 합격하지 못했다. 현재 활동을 유지한다.' } } });
  choices.push({ label: s.career ? '현재 직업을 유지하며 여유 확보' : '아직 진로를 정하지 않는다', description: '직업 유지 · 건강 +3', effects: { vitality: 3 }, work: { satisfaction: 5 }, outcome: '현재 생활을 유지하고 휴식 시간을 확보했다.' });
  choices.push({ label: s.career ? '직업을 내려놓고 가족·자율 활동' : '가족과 지역 활동에 집중', description: '고정 수입 없음 · 유대 +3', leaveCareer: true, effects: { bond: 3 }, outcome: '고정 직업 없이 가족과 자율 활동에 집중한다.' });
  for (const choice of choices) if (choice.challenge) {
    const field = {traveler:'battle',researcher:'research',keeper:'care',merchant:'craft'}[choice.career || s.career];
    if (field) choice.challenge.talent = field;
  }
  if (choices.length < 8) choices.push(talentPathChoice(s, true));
  const background = s.career ? `${josa(CAREERS[s.career].name, '으로', '로')} 쌓은 경험` : '지금까지의 학습과 생활 경험';
  return { kind: 'choice', title: CAREER_REVIEWS[phase], choices,
    body: `${background}을 바탕으로 다음 단계를 결정한다.${s.education === 'academy' ? ' 아카데미 이력은 연구직 평가에 반영된다.' : ''} 연 수입은 지방 경기와 명성, 경력 등급에 따라 해마다 달라진다.` };
}
