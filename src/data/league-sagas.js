import { currentRegion } from '../sim/world.js';
import { xpLevel } from '../sim/battle.js';
// Canon trainers/species inspire these fan-game brackets; Galar uses a tournament,
// Alola an inaugural league, and Paldea awards a champion rank rather than replacing Geeta.
export const LEAGUE_REGIONS = [
 ['kanto','관동','그린',[131,68,94,149],[65,130,6]],
 ['johto','성도','목호',[178,169,68,197],[130,142,149]],
 ['hoenn','호연','성호',[359,354,365,373],[227,306,376]],
 ['sinnoh','신오','난천',[416,450,467,437],[442,448,445]],
 ['unova','하나','아이리스',[609,625,579,534],[635,567,612]],
 ['kalos','칼로스','카르네',[668,130,681,715],[701,699,282]],
 ['alola','알로라','쿠쿠이박사',[297,476,770,733],[745,462,727]],
 ['galar','가라르','단델',[861,858,534,884],[681,887,6]],
 ['paldea','팔데아','테사',[980,879,823,998],[976,983,970]],
].map(([id,name,champion,elites,team])=>({id,name,champion,elites,team}));
const option=(label,description,outcome,extra={})=>({label,description,outcome,effects:{},...extra});
const training=()=>option('이번에는 준비 훈련을 한다','파티 경험치 +30 · 현재 단계 유지','파트너들의 역할과 교체 전술을 점검했다. 다음 기회에 다시 도전한다.',{training:30});
const stageNames=r=>r.id==='galar'?['파이널 토너먼트 1회전','파이널 토너먼트 8강','파이널 토너먼트 준결승','파이널 토너먼트 결승']:['사천왕 첫 번째 관문','사천왕 두 번째 관문','사천왕 세 번째 관문','사천왕 마지막 관문'];
export const championFlag=r=>`league-${r.id}-champion`;
export const LEAGUE_SAGAS=LEAGUE_REGIONS.flatMap(r=>{
 const root=`league-${r.id}`,here=s=>currentRegion(s)===r.id&&s.party.length>=1;
 const eligible=s=>here(s)&&!s.flags[`${root}-withdrawn`];
 const match=(suffix,title,opponents,level,previous,winFlag,body)=>({
  id:`${root}-${suffix}`,category:'league',min:16,max:95,once:false,cooldown:1,weight:()=>8,
  when:s=>eligible(s)&&Boolean(s.flags[previous])&&!s.flags[winFlag],
  build:()=>({kind:'choice',title:`${r.name} · ${title}`,body,choices:[
   option('파트너들과 정식 대전에 출전',`상대 Lv.${level} · ${opponents.length}연전 · 모두 이겨야 다음 단계 진출`,'리그 무대에 파트너들과 함께 들어섰다.',{battle:{kind:'league',opponents,level},after:{win:{flag:winFlag,effects:{reputation:4},outcome:`${title} 통과. 다음 상대에게 도전할 자격을 얻었다.`},lose:{effects:{joy:-2},outcome:'이번 도전은 여기서 끝났다. 통과한 단계는 유지되며 같은 관문에 다시 도전할 수 있다.'}}}),
   training(),option('현재 지방 도전을 마친다','진출 기록 보존 · 이 지방의 정규 도전 중단','더 오르기보다 지금까지의 여정을 정리했다.',{flag:`${root}-withdrawn`,effects:{bond:2}}),
  ]}),
 });
 const stages=[
  {id:`${root}-invitation`,category:'league',min:16,max:90,once:false,cooldown:2,weight:()=>5,
   when:s=>here(s)&&!s.flags[`${root}-licensed`]&&!s.flags[`${root}-withdrawn`]&&((s.career==='traveler'&&s.reputation>=15)||(s.game.badges[r.id]||0)>=2),
   build:()=>({kind:'choice',title:`${r.name} 리그에서 온 초대장`,body:`최근의 배틀과 활동 기록이 ${r.name} 리그의 눈에 들어왔다. 지역 인증 8개를 모으면 본선에 도전할 수 있다.`,choices:[
    option('리그 도전자 등록','지역 인증 순회와 본선 경로 개방','도전자 명단에 이름과 파트너를 등록했다.',{flag:`${root}-licensed`}),
    option('초대장을 보관하고 다음에 결정','진학·직업 유지 · 나중에 다시 초대','지금은 자신의 생활에 집중하고 초대장을 보관했다.',{effects:{joy:1}}),
   ]})},
  {id:`${root}-circuit`,category:'league',min:16,max:95,once:false,cooldown:1,weight:()=>8,
   when:s=>eligible(s)&&s.flags[`${root}-licensed`]&&(s.game.badges[r.id]||0)<8,
   build:s=>({kind:'choice',title:`${r.name} 리그 인증 순회 · ${(s.game.badges[r.id]||0)+1}/8`,body:'파트너를 바꾸거나 더 강한 기술을 찾는 것만이 답은 아니다. 상대의 타입과 팀의 역할을 확인하고 다음 인증에 도전한다.',choices:[
    option('지역 인증 배틀에 도전','자동 배틀 · 승리 시 이 지방 배지 +1','인증 담당 트레이너와 맞붙었다.',{battle:{kind:'gym'},after:{win:{outcome:'리그 도전자 카드에 새 인증이 새겨졌다.'},lose:{outcome:'이번에는 인증을 얻지 못했다. 다음 기회에 다시 도전한다.'}}}),training(),
   ]})},
  {id:`${root}-qualifier`,category:'league',min:16,max:95,once:false,cooldown:1,weight:()=>9,
   when:s=>eligible(s)&&s.flags[`${root}-licensed`]&&(s.game.badges[r.id]||0)>=8&&!s.flags[`${root}-qualified`],
   build:()=>({kind:'choice',title:`${r.name} 리그 본선 예선`,body:'여덟 개의 인증을 확인한 심판이 경기장 문을 열었다. 가족과 오랜 라이벌이 중계 화면 너머로 지켜본다.',choices:[
    option('본선 진출에 도전','Lv.48 상대 2연전 · 모두 승리해야 본선 진출','예선 경기장에 첫 파트너와 들어섰다.',{battle:{kind:'league',opponents:[r.elites[0],r.elites[1]],level:48},after:{win:{flag:`${root}-qualified`,outcome:'본선 진출이 확정됐다. 이제 상위 트레이너들과의 관문이 기다린다.'},lose:{effects:{wisdom:2},outcome:'예선에서 탈락했다. 배지는 유지되며 다시 예선에 참가할 수 있다.'}}}),training(),
   ]})},
  ...r.elites.map((id,i)=>match(`elite-${i}`,stageNames(r)[i],[id],54+i*5,i?`${root}-elite-${i-1}`:`${root}-qualified`,`${root}-elite-${i}`,`${stageNames(r)[i]} 앞에 섰다. 상대의 대표 포켓몬과 파티의 상성을 검토한다. 이기면 다음 관문이 열린다.`)),
  {id:`${root}-final`,category:'league',min:16,max:95,once:false,cooldown:1,weight:()=>12,
   when:s=>eligible(s)&&s.flags[`${root}-elite-3`]&&!s.flags[championFlag(r)],
   build:s=>({kind:'choice',memory:true,title:r.id==='paldea'?'테사의 챔피언 랭크 최종 평가':`${r.champion} 최종 도전`,body:`${r.champion} 앞에서 마지막 몬스터볼을 쥐었다. 첫 파트너는 Lv.${xpLevel(s.party.find(p=>p.origin==='partner')||s.party[0])}까지 자랐다. ${r.id==='paldea'?'이 평가를 통과하면 챔피언 랭크가 된다.':'이 경기에서 이기면 이 지방 리그의 정상에 이름을 남긴다.'}`,choices:[
    option('마지막까지 파트너들과 싸운다','Lv.75 대표 팀 3연전 · 모두 승리 시 명예의 전당','가족과 라이벌의 응원을 뒤로하고 마지막 경기를 시작했다.',{battle:{kind:'league',opponents:r.team,level:75},after:{win:{flag:championFlag(r),effects:{reputation:12,bond:5},follow:[{id:'hall-of-fame',delay:[1,1],data:{region:r.id,name:r.name,champion:r.champion}}],outcome:`${r.champion}의 마지막 포켓몬이 쓰러졌다. ${r.id==='paldea'?'챔피언 랭크에 올랐다.':'리그 정상에 올랐다.'} 파트너들과 명예의 전당에 이름을 남겼다.`},lose:{effects:{courage:2},outcome:'정상에는 아직 닿지 못했다. 상대는 다시 오라며 손을 내밀었다. 통과한 관문은 유지된다.'}}}),
    training(),option('이번 도전을 마무리한다','도전 기록 보존 · 정상 도전 중단','가장 가까이 다가간 순간을 기억하며 다른 길을 선택했다.',{flag:`${root}-withdrawn`,effects:{joy:2}}),
   ]})},
  {id:`${root}-defence`,category:'league',min:18,max:99,once:false,cooldown:5,weight:()=>3,
   when:s=>here(s)&&s.flags[championFlag(r)],
   build:()=>({kind:'choice',title:`${r.name} 정상에 오른 뒤의 초청전`,body:'이번에는 어린 도전자가 자신을 넘어설 목표로 당신을 지목했다. 타이틀보다 어떤 경기를 보여 줄지 결정해야 한다.',choices:[
    option('전력을 다해 도전자를 맞이','Lv.72 상대 · 패배해도 명예의 전당 기록 유지','도전자에게 가장 진지한 승부로 답했다.',{battle:{kind:'league',opponents:[r.elites[2],r.team[2]],level:72},after:{win:{effects:{reputation:4},outcome:'승부가 끝난 뒤 도전자와 함께 전술을 돌아봤다.'},lose:{effects:{bond:3},outcome:'새로운 강자의 탄생에 박수를 보냈다. 과거의 우승과 파트너들의 기록은 사라지지 않는다.'}}}),
    option('공개 훈련으로 경험을 나눈다','명성 +1 · 파티 경험치 +20','대회에서 배운 실패와 준비 과정을 후배들에게 공개했다.',{effects:{reputation:1},training:20}),
   ]})},
  {id:`${root}-homecoming`,category:'league',min:18,max:99,
   when:s=>s.flags[championFlag(r)],
   build:()=>({kind:'choice',title:`${r.name} 리그 우승자의 귀향`,body:'고향에서 첫 파트너를 만났던 장소에 기념 사진을 걸고 싶다는 연락이 왔다. 그때의 작은 몬스터볼을 아직 기억하는 사람들이 기다린다.',choices:[
    option('파트너들과 고향을 찾는다','출생지로 이동 · 유대 +4','처음 걸었던 길을 파트너들과 다시 걸었다. 마을 아이들에게 몬스터볼을 보여 주었다.',{home:true,effects:{bond:4}}),
    option('어린 트레이너의 출발을 후원','300P · 몇 년 뒤 후배의 소식','자신의 이름 대신 첫 파트너의 이름으로 훈련 물품을 보냈다.',{cost:300,effects:{money:-300},follow:[{id:'champion-student',delay:[3,6]}]}),
   ]})},
 ];
 // An accepted campaign gets a chance to continue every few years instead of
 // disappearing among hundreds of unrelated one-off events. Normal spacing still applies.
 for(const st of stages)if(!st.id.endsWith('-invitation')&&!st.id.endsWith('-defence')&&!st.id.endsWith('-homecoming')){
   st.urgent=s=>s.age-Math.max(0,...Object.entries(s.cooldowns).filter(([id])=>id.startsWith(root+'-')).map(([,age])=>age))>=2;
 }
 return stages;
});
