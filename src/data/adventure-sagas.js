import { ADVENTURE_PROJECTS } from './adventure-projects.js';
import { currentRegion } from '../sim/world.js';
import { fill } from './event-kit.js';

const DUELS = {red:[25,6,9],silver:[160,169],cynthia:[442,445],subway:[601,609],leon:[887,6],'mega-relay':[448],'rival-retire':[149],'champion-charity':[376,448],'home-league':[25],'battle-radio':null};
const GEAR = {'mega-relay':'mega','wishing-star':'dynamax'};
const activeProjects = s => ADVENTURE_PROJECTS.filter(([key]) => s.flags[`adventure-${key}-0`] && !s.flags[`adventure-${key}-2`] && !s.flags[`adventure-${key}-closed`]).length;
const entryAllowed = (s,key) => (key !== 'champion-charity' || Object.keys(s.flags).some(k=>k.startsWith('league-')&&k.endsWith('-champion')))
  && (key !== 'child-route' || s.relationship.children > 0)
  && (key !== 'old-partner' || s.age >= 50)
  && (key !== 'rival-retire' || s.age >= 45)
  && (!['red','cynthia','leon'].includes(key) || s.reputation >= 20);
const reward = key => GEAR[key] ? {equipment:GEAR[key]} : key==='bells' ? {observe:245} : key==='meteor' ? {observe:384} : {};
export const ADVENTURE_SAGAS = ADVENTURE_PROJECTS.flatMap(([key,region,career,stat,...chapters])=>chapters.map(([title,body,action],stage)=>{
 const root=`adventure-${key}`,id=`${root}-${stage}`,previous=`${root}-${stage-1}`;
 const complete = {...(stage===2?reward(key):{}),flag:id,effects:{[stat]:3,reputation:stage===2?4:1},
   ...(stage===2?{follow:[{id:'adventure-reunion',delay:[3,6],data:{title,action}}]}:{})};
 return {id,category:career?'career':'opportunity',min:18,max:95,once:false,cooldown:3,
  weight:()=>stage?6:1,
  when:s=>s.party.length>0&&!s.flags[id]&&!s.flags[`${root}-closed`]
    &&(stage ? s.flags[previous]&&s.age>=(s.cooldowns[previous]??0)+2 : (!region||currentRegion(s)===region)&&(!career||s.career===career)&&entryAllowed(s,key)&&activeProjects(s)<3),
  build:s=>{
   const finalDuel=stage===2&&DUELS[key];
   const outcome=`「${action}」 계획을 마쳤다. ${stage===2?'함께한 사람들과 포켓몬의 이름을 활동 기록에 남겼다.':'이번 경험을 바탕으로 다음 활동을 준비한다.'}`;
   const failure={outcome:'계획대로 풀리지 않아 이번 시도를 중단했다. 준비를 보완하면 몇 년 뒤 같은 단계에 다시 도전할 수 있다.',effects:{[stat]:1,joy:-1}};
   return {kind:'choice',title,body:fill(s,body)+(stage?' 앞선 활동에서 이어진 후속 사건이다.':''),choices:[
    finalDuel ? {label:action,description:`대표 팀 ${finalDuel.length}연전 · 승리 시 이야기 완수`,tone:'bold',outcome:'약속했던 배틀을 시작했다.',effects:{courage:1},battle:{kind:'league',opponents:finalDuel,level:key==='red'?75:key==='home-league'?35:65},after:{win:{...complete,outcome:'마지막 라운드까지 승리했다. 상대가 당신과 파트너들의 이름을 기억하겠다고 말했다.'},lose:failure}}
     : {label:action,description:`${stat==='bond'?'유대':stat==='wisdom'?'지혜':'용기'} 판정 · 성공 시 ${stage===2?'이야기 완수':'후속 사건 개방'}`,tone:stat==='bond'?'caring':stat==='wisdom'?'curious':'bold',outcome,...complete,
       challenge:{stat,difficulty:stage*5+5,failure}},
    {label:stage===2?'동료들과 경험을 나누며 마무리한다':'전문가와 공동 계획을 세운다',description:'지혜 판정 · 협력으로 같은 단계 진행',tone:'curious',outcome:'현지 동료들과 경험을 나누고 공동 활동을 마쳤다. '+(stage===2?'승부 성적 대신 협력의 기록을 남겼다.':'후속 활동을 준비한다.'),...complete,
      challenge:{stat:'wisdom',difficulty:stage*3,failure:{...failure,outcome:'동료들의 일정이 맞지 않았다. 계획을 보관하고 다음 기회를 기다린다.'}}},
    {label:stage?'여기까지의 경험으로 남긴다':'이번 제안은 정중히 사양한다',description:'이 이야기 종료 · 행복 +2',tone:'easygoing',flag:`${root}-closed`,effects:{joy:2},outcome:'무리해서 계속하지 않기로 했다. 함께한 이들에게 결정을 알렸다.'},
   ]};
  }};
}));
