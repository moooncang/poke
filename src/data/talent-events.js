import { TALENT_FIELDS, TALENT_TIERS } from '../sim/talent.js';
import { josa } from '../sim/text.js';
import { CAREERS } from './world.js';

// What each talent path actually means for school and work, so the choice is not a mystery.
const PATH_EDUCATION = { research: ['study', '독학·연구 학습'], care: ['community', '지역 활동 학습'], battle: ['apprentice', '견습'], craft: ['apprentice', '견습'] };
export const talentCareer = field => CAREERS[TALENT_FIELDS[field].career];

const SCENES = {
 battle:[['늦게 읽힌 교체 신호','파트너의 신호를 늦게 읽어 연습전에서 졌다. 관장이 동작을 나누어 배우는 훈련을 제안한다.'],['꾸준한 연습 상대','동네 트레이너들이 함께 복기할 팀원을 찾는다. 한 번의 번뜩임보다 꾸준한 출석을 중요하게 본다.'],['예선에서 눈에 띈 전술','상대의 교체를 읽은 한 수가 코치의 눈에 들어왔다. 유망주 합동 캠프 초청장이 왔다.'],['체육관의 특별 스파링','관장이 정식 선수들의 전술 분석을 맡기려 한다. 읽을 수 있는 것과 직접 이기는 것은 다르다.'],['챔피언 코치의 제안','낯선 전술을 한 번 보고 재현한 장면이 퍼졌다. 챔피언 육성팀이 공개 검증전을 제안한다.']],
 research:[['틀린 관찰 노트의 가치','관찰 기록에 오류가 많았다. 연구원이 한 가지 현상부터 반복 관찰해 보자고 한다.'],['작은 도감 보완 작업','지역 도감의 서식지 설명이 오래됐다. 꾸준히 현장을 찾아갈 조사원이 필요하다.'],['연구소의 청소년 발표회','관찰 기록에서 남들이 놓친 반복 패턴을 찾았다. 연구소가 발표 자리를 마련했다.'],['교수의 미해결 과제','교수가 정답 없는 진화 연구 자료를 건넸다. 빠른 이해보다 가설을 검증할 방법이 중요하다.'],['학회를 뒤흔든 가설','당신의 짧은 메모가 기존 분류의 모순을 짚었다. 학회는 재능을 칭찬하면서도 재현 자료를 요구한다.']],
 care:[['마음을 읽기 어려운 동료','포켓몬의 작은 불편을 놓쳤다. 센터에서 식사와 휴식 신호를 하나씩 배우기로 한다.'],['돌봄 교대표의 빈자리','키우미집에서 정해진 시간에 찾아와 줄 도우미를 찾는다. 신뢰는 반복되는 만남에서 시작된다.'],['야생 포켓몬이 먼저 다가온 날','주변 포켓몬들이 당신의 목소리에 경계를 풀었다. 레인저가 구조 현장 동행을 제안한다.'],['센터의 까다로운 환자','여러 돌보미에게 마음을 닫은 환자가 당신의 작은 손짓에는 반응했다. 담당 팀이 도움을 요청한다.'],['말없이 전해진 구조 요청','소리도 움직임도 거의 없는 포켓몬의 불안을 알아챘다. 전문 센터가 교감 능력을 검증할 공동 활동을 제안한다.']],
 craft:[['처음 만든 용품의 균열','직접 만든 도구가 시험 중 부서졌다. 장인이 손에 맞는 기초 도구부터 고르자고 한다.'],['상점의 꾸준한 단골','손님들이 물건보다 정확한 재고 안내를 믿고 찾아온다. 작은 운영 업무를 맡아 볼 기회다.'],['규토리볼 설계 공모전','평범한 재료로 편리한 손잡이를 만들었다. 장인 조합이 신인 공모전에 추천했다.'],['공방의 특별 주문','까다로운 체육관 장비 주문이 들어왔다. 손재주만큼 납기와 안전 기준을 맞추는 능력이 필요하다.'],['리그 장비 개발 초청','당신의 시제품이 기존 장비의 문제를 해결했다. 리그 연구팀이 공동 개발을 제안하지만 책임도 크다.']],
};
const opt=(label,outcome,more={})=>({label,description:'유대 +2',outcome,effects:{bond:2},...more});
const seed=(s)=>({field:s.talent.field,level:s.talent.level});
const lessons=s=>s.flags[`talent-${s.talent.field}-trained`]||s.seeds.some(x=>x.id==='talent-lesson'&&x.data?.field===s.talent.field)?{}:{follow:[{id:'talent-lesson',delay:[1,3],data:seed(s)}]};
export function talentPathChoice(s, career=false) {
 const {field,level}=s.talent,f=TALENT_FIELDS[field];
 const advanced=level>=4, promising=level===3;
 const [education, educationLabel]=PATH_EDUCATION[field], job=talentCareer(field);
 // At the age-16 career review (`career`), the talent route is a real career choice: the related job opens at once,
 // with the matching way of learning. Later (18·22) it is a learning path only, and the job stays as it is.
 const jobId=TALENT_FIELDS[field].career;
 return opt(`${f.name} · ${advanced?'특별 추천 과정':promising?'유망주 실습':'맞춤 기초 멘토링'}${career?` · ${job.short} 진로`:''}`,
  career?`${f.name}에 맞춘 ${advanced?'추천 평가':promising?'현장 실습':'기초 과정'}를 시작하며 ${job.name} 활동에 들어갔다. 타고난 분야와 다른 진로도 뒤에 다시 고를 수 있다.`
   :`${f.name}에 맞춘 ${advanced?'추천 평가':promising?'현장 실습':'기초 과정'}를 시작했다. 타고난 분야와 다른 진로도 계속 선택할 수 있다.`,{
  description:career?`${level}/5 ${TALENT_TIERS[level]} 전용 · 직업 ${josa(job.name,'으로','로')} 시작 · 학습 방식 ${educationLabel} · ${advanced?'능력 검증 판정':'기초 경험 쌓기'} · 후속 지도`
   :`${level}/5 ${TALENT_TIERS[level]} 전용 · 학습 방식 ${educationLabel} · ${job.short} 계열 준비 · 직업은 바뀌지 않음 · ${advanced?'능력 검증 판정':'기초 경험 쌓기'} · 후속 지도`,
  effects:{[f.stat]:advanced?5:3},education,...(career&&jobId!==s.career?{career:jobId}:{}),...lessons(s),
  ...(advanced?{challenge:{stat:f.stat,talent:field,difficulty:12,failure:{outcome:'추천만으로 평가를 통과하지는 못했다. 현재 학습과 진로는 유지하고 기초 경험을 보완한다.',effects:{[f.stat]:1}}}}:{}),
 });
}
export const TALENT_EVENTS=Object.entries(SCENES).flatMap(([field,rows])=>rows.map(([title,body],i)=>{
 const level=i+1,f=TALENT_FIELDS[field];
 return {id:`talent-${field}-tier-${level}`,category:field==='care'?'pokemon':'opportunity',min:12,max:90,weight:()=>3,
  when:s=>s.talent.field===field&&s.talent.level===level,
  build:s=>({kind:'choice',title,body:`${body} 타고난 분야: ${f.name} · ${level}/5 ${TALENT_TIERS[level]} · 관련 직업: ${talentCareer(field).name}.`,choices:[
   opt(level>=4?'재능을 공개 검증하는 무대에 선다':level===3?'추천받은 실습에 도전한다':'차근차근 기초 과정을 밟는다',
    '과제를 마치고 다음 지도를 약속받았다.',{description:`${f.name} 판정 · ${talentCareer(field).short} 계열 경험 · 후속 지도 개방 · 직업은 바뀌지 않음`,effects:{[f.stat]:4,reputation:level>=4?3:1},...lessons(s),challenge:{stat:f.stat,talent:field,difficulty:level>=4?18:level===3?8:-10,failure:{outcome:'첫 시도는 뜻대로 되지 않았다. 지도자가 기초 과정을 통해 다시 배우자고 제안했다.',effects:{[f.stat]:1},...lessons(s)}}}),
   opt('경쟁 대신 다른 사람을 돕는 데 쓴다','자신의 속도로 지역 활동에 참여했다. 실력보다 도움받은 이들의 반응을 기록했다.',{description:'지역 활동 분기 · 유대 +3 · 후속 소식',effects:{bond:3},follow:[{id:'talent-community',delay:[2,4],data:seed(s)}]}),
   opt('다른 분야를 탐색한다','타고난 분야가 평생의 직업을 정하지는 않는다고 생각했다. 지금의 생활을 유지하며 다른 관심사를 살펴본다.',{description:'재능과 다른 방향 탐색 · 행복 +3',effects:{joy:3}}),
  ]})};
}));
export const TALENT_CONSEQUENCES={
 'talent-lesson':{type:'choice',build:(s,{data:d})=>{
  const f=TALENT_FIELDS[d.field],trained=`talent-${d.field}-trained`;
  return {kind:'choice',title:`${f.name} · 재능 다음의 연습`,body:`처음 지도를 받은 뒤 연습 기록이 쌓였다. ${d.level<=2?'빠르지는 않았지만 반복한 만큼 익숙해졌다.':d.level>=4?'쉽게 풀리던 과제 다음에는 익숙하지 않은 실패가 기다렸다.':'추천받았던 순간보다 그 뒤의 반복이 더 중요했다.'} 어떤 방식으로 경험을 완성할지 정한다.`,choices:[
   opt('스스로 완성한 결과물을 평가받는다','평가를 통과해 자기만의 훈련 방법을 정리했다.',{description:'전문 스탯 판정 · 성공 시 해당 분야 숙련 +3%p',effects:{[f.stat]:4},flag:trained,challenge:{stat:f.stat,talent:d.field,difficulty:10,failure:{outcome:'평가를 통과하지 못했지만 복습 과제와 재평가 기회를 받았다.',effects:{[f.stat]:2},follow:[{id:'talent-lesson',delay:[3,5],data:d}]}}}),
   opt('동료와 기초부터 검증하며 마친다','동료와 서로 부족한 부분을 확인하며 충분한 연습 과정을 마쳤다.',{description:'경쟁 없이 기초 숙련 · 해당 분야 숙련 +3%p',effects:{bond:2},flag:trained}),
   opt('여기서 멈추고 다른 생활에 집중한다','연습 기록을 보관하고 지금 더 중요한 일에 시간을 쓰기로 했다.',{description:'후속 지도 종료 · 행복 +2',effects:{joy:2}}),
  ]};}},
 'talent-community':{type:'echo',build:(s,{data:d})=>({title:`${TALENT_FIELDS[d.field].name}이 남긴 작은 변화`,body:`재능을 경쟁 대신 지역 활동에 썼던 경험이 다른 이들의 출발점이 됐다. ${d.level<=2?'천천히 배운 과정을 적은 설명서가 초보자들에게 특히 도움이 됐다.':'복잡한 일을 쉽게 풀어 설명한 기록을 새 참가자들이 함께 읽고 있다.'}`,effects:{joy:3,reputation:2}})},
};
