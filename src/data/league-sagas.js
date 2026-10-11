import { currentRegion } from '../sim/world.js';
import { xpLevel, championships } from '../sim/battle.js';
import { goalOf } from '../sim/goals.js';
import { LEGENDARY } from './species-rules.js';
import { TOWNS } from './world.js';
import { pick } from '../sim/random.js';
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

// ── Difficulty ──
// The first league a trainer enters is a regional-level challenge; every title won raises the next region's bar,
// so a lifetime of titles is a climb instead of nine copies of the same Lv.75 wall.
export const LEAGUE_STEP = 6;
// A strong enough party is noticed by the league even without a trainer career or local badges.
export const INVITE_LEVEL = 30;
export const leagueTier = s => Math.min(8, championships(s));
const cap = n => Math.min(95, n);
export const leagueLevels = s => {
 const t = leagueTier(s) * LEAGUE_STEP;
 return { qualifier: cap(34 + t), elites: [38, 42, 46, 50].map(n => cap(n + t)), final: cap(54 + t), defence: cap(52 + t) };
};

const option=(label,description,outcome,extra={})=>({label,description,outcome,effects:{},...extra});
const training=()=>option('이번에는 준비 훈련을 한다','파티 경험치 +30 · 현재 단계 유지','파트너들의 역할과 교체 전술을 점검했다. 다음 기회에 다시 도전한다.',{training:30});
const stageNames=r=>r.id==='galar'?['파이널 토너먼트 1회전','파이널 토너먼트 8강','파이널 토너먼트 준결승','파이널 토너먼트 결승']:['사천왕 첫 번째 관문','사천왕 두 번째 관문','사천왕 세 번째 관문','사천왕 마지막 관문'];
export const championFlag=r=>`league-${r.id}-champion`;
const champion=r=>({flag:championFlag(r),effects:{reputation:12,bond:5},follow:[{id:'hall-of-fame',delay:[1,1],data:{region:r.id,name:r.name,champion:r.champion}}],
 outcome:`${r.champion}의 마지막 포켓몬이 쓰러졌다. ${r.id==='paldea'?'챔피언 랭크에 올랐다.':'리그 정상에 올랐다.'} 파트너들과 명예의 전당에 이름을 남겼다.`});
const regionTowns=id=>TOWNS.filter(t=>t.map===id);
const gymPool=id=>[...new Set(regionTowns(id).flatMap(t=>t.pool))].filter(x=>!LEGENDARY.has(x));
const lastLeagueAge=(s,prefix)=>Math.max(0,...Object.entries(s.cooldowns).filter(([id])=>id.startsWith(prefix)).map(([,age])=>age));

/**
 * The remaining main-stage schedule for one region, from the trainer's current progress.
 * Each beaten opponent records its stage flag immediately, so a loss midway keeps the stages already cleared.
 */
export function remainingSchedule(s, r) {
 const root=`league-${r.id}`, levels=leagueLevels(s), rows=[];
 if(!s.flags[`${root}-qualified`]) rows.push([r.elites[0],levels.qualifier,null],[r.elites[1],levels.qualifier,`${root}-qualified`]);
 r.elites.forEach((id,i)=>{ if(!s.flags[`${root}-elite-${i}`]) rows.push([id,levels.elites[i],`${root}-elite-${i}`]); });
 // The champion title itself is only granted by `after.win`, which needs every battle in the series won.
 r.team.forEach(id=>rows.push([id,levels.final,null]));
 return rows;
}
const seasonRun=(s,r)=>{
 const rows=remainingSchedule(s,r);
 return option('남은 본선 일정을 한 시즌에 몰아서 치른다',`${rows.length}연전 · 상대 Lv.${rows[0][1]}→${rows.at(-1)[1]} · 통과한 관문은 패배해도 유지 · 모두 이기면 챔피언`,
  '시즌 내내 경기장에서 지내며 남은 일정을 이어서 치렀다.',
  {tone:'bold',battle:{kind:'league',opponents:rows.map(x=>x[0]),levels:rows.map(x=>x[1]),flags:rows.map(x=>x[2])},after:{win:champion(r),lose:{effects:{courage:2},outcome:'시즌 도중에 패배했다. 그때까지 통과한 관문은 기록에 남았다.'}}});
};

export const LEAGUE_SAGAS=LEAGUE_REGIONS.flatMap(r=>{
 const root=`league-${r.id}`,here=s=>currentRegion(s)===r.id&&s.party.length>=1;
 const eligible=s=>here(s)&&!s.flags[`${root}-withdrawn`]&&(s.age>=16||goalOf(s)==='champion');
 const match=(suffix,title,opponents,stage,previous,winFlag,body)=>({
  id:`${root}-${suffix}`,category:'league',min:12,max:95,once:false,cooldown:1,weight:()=>8,
  when:s=>eligible(s)&&Boolean(s.flags[previous])&&!s.flags[winFlag],
  build:s=>{const level=leagueLevels(s).elites[stage];return {kind:'choice',title:`${r.name} · ${title}`,body,choices:[
   option('파트너들과 정식 대전에 출전',`상대 Lv.${level} · ${opponents.length}연전 · 모두 이겨야 다음 단계 진출`,'리그 무대에 파트너들과 함께 들어섰다.',{battle:{kind:'league',opponents,level},after:{win:{flag:winFlag,effects:{reputation:4},outcome:`${title} 통과. 다음 상대에게 도전할 자격을 얻었다.`},lose:{effects:{joy:-2},outcome:'이번 도전은 여기서 끝났다. 통과한 단계는 유지되며 같은 관문에 다시 도전할 수 있다.'}}}),
   seasonRun(s,r),training(),option('현재 지방 도전을 마친다','진출 기록 보존 · 이 지방의 정규 도전 중단','더 오르기보다 지금까지의 여정을 정리했다.',{flag:`${root}-withdrawn`,effects:{bond:2}}),
  ]};},
 });
 const stages=[
  {id:`${root}-invitation`,category:'league',min:12,max:90,once:false,cooldown:s=>goalOf(s)==='champion'?1:2,weight:()=>5,
   when:s=>here(s)&&(s.age>=16||goalOf(s)==='champion')&&!s.flags[`${root}-licensed`]&&!s.flags[`${root}-withdrawn`]&&(goalOf(s)==='champion'||(s.career==='traveler'&&s.reputation>=15)||(s.game.badges[r.id]||0)>=2||Math.max(0,...s.party.map(xpLevel))>=INVITE_LEVEL),
   urgent:s=>goalOf(s)==='champion',
   build:()=>({kind:'choice',title:`${r.name} 리그에서 온 초대장`,body:`최근의 배틀과 활동 기록이 ${r.name} 리그의 눈에 들어왔다. 지역 인증 8개를 모으면 본선에 도전할 수 있다.`,choices:[
    option('리그 도전자 등록','지역 인증 순회와 본선 경로 개방','도전자 명단에 이름과 파트너를 등록했다.',{flag:`${root}-licensed`}),
    option('초대장을 보관하고 다음에 결정','진학·직업 유지 · 나중에 다시 초대','지금은 자신의 생활에 집중하고 초대장을 보관했다.',{effects:{joy:1}}),
   ]})},
  {id:`${root}-circuit`,category:'league',min:12,max:95,once:false,cooldown:1,weight:()=>8,
   when:s=>eligible(s)&&s.flags[`${root}-licensed`]&&(s.game.badges[r.id]||0)<8,
   build:s=>{const badges=s.game.badges[r.id]||0,pool=gymPool(r.id),trip=Math.min(4,8-badges);
    const opponents=Array.from({length:trip},()=>pick(s,pool));
    return {kind:'choice',title:`${r.name} 리그 인증 순회 · ${badges+1}/8`,body:'파트너를 바꾸거나 더 강한 기술을 찾는 것만이 답은 아니다. 상대의 타입과 팀의 역할을 확인하고 다음 인증에 도전한다.',choices:[
    option('지역 인증 배틀에 도전','자동 배틀 · 승리 시 이 지방 배지 +1','인증 담당 트레이너와 맞붙었다.',{battle:{kind:'gym'},after:{win:{outcome:'리그 도전자 카드에 새 인증이 새겨졌다.'},lose:{outcome:'이번에는 인증을 얻지 못했다. 다음 기회에 다시 도전한다.'}}}),
    ...(trip>1?[option(`체육관 ${trip}곳을 잇는 원정을 떠난다`,`최대 ${trip}연전 · 이길 때마다 배지 +1 · 지면 그 자리에서 귀환 · 여비 150P`,'한 계절 동안 지방의 체육관을 차례로 돌았다.',
     {tone:'bold',cost:150,effects:{money:-150},battle:{kind:'gym',opponents},after:{win:{effects:{reputation:2},outcome:'원정에서 모든 인증을 따냈다.'},lose:{outcome:'원정 도중 패배해 귀환했다. 그때까지 얻은 배지는 그대로다.'}}})]:[]),
    training(),
   ]};}},
  {id:`${root}-qualifier`,category:'league',min:12,max:95,once:false,cooldown:1,weight:()=>9,
   when:s=>eligible(s)&&s.flags[`${root}-licensed`]&&(s.game.badges[r.id]||0)>=8&&!s.flags[`${root}-qualified`],
   build:s=>{const level=leagueLevels(s).qualifier;return {kind:'choice',title:`${r.name} 리그 본선 예선`,body:'여덟 개의 인증을 확인한 심판이 경기장 문을 열었다. 가족과 오랜 라이벌이 중계 화면 너머로 지켜본다.',choices:[
    option('본선 진출에 도전',`Lv.${level} 상대 2연전 · 모두 승리해야 본선 진출`,'예선 경기장에 첫 파트너와 들어섰다.',{battle:{kind:'league',opponents:[r.elites[0],r.elites[1]],level},after:{win:{flag:`${root}-qualified`,outcome:'본선 진출이 확정됐다. 이제 상위 트레이너들과의 관문이 기다린다.'},lose:{effects:{wisdom:2},outcome:'예선에서 탈락했다. 배지는 유지되며 다시 예선에 참가할 수 있다.'}}}),
    seasonRun(s,r),training(),
   ]};}},
  ...r.elites.map((id,i)=>match(`elite-${i}`,stageNames(r)[i],[id],i,i?`${root}-elite-${i-1}`:`${root}-qualified`,`${root}-elite-${i}`,`${stageNames(r)[i]} 앞에 섰다. 상대의 대표 포켓몬과 파티의 상성을 검토한다. 이기면 다음 관문이 열린다.`)),
  {id:`${root}-final`,category:'league',min:12,max:95,once:false,cooldown:1,weight:()=>12,
   when:s=>eligible(s)&&s.flags[`${root}-elite-3`]&&!s.flags[championFlag(r)],
   build:s=>{const level=leagueLevels(s).final;return {kind:'choice',memory:true,title:r.id==='paldea'?'테사의 챔피언 랭크 최종 평가':`${r.champion} 최종 도전`,body:`${r.champion} 앞에서 마지막 몬스터볼을 쥐었다. 첫 파트너는 Lv.${xpLevel(s.party.find(p=>p.origin==='partner')||s.party[0])}까지 자랐다. ${r.id==='paldea'?'이 평가를 통과하면 챔피언 랭크가 된다.':'이 경기에서 이기면 이 지방 리그의 정상에 이름을 남긴다.'}`,choices:[
    option('마지막까지 파트너들과 싸운다',`Lv.${level} 대표 팀 3연전 · 모두 승리 시 명예의 전당`,'가족과 라이벌의 응원을 뒤로하고 마지막 경기를 시작했다.',{battle:{kind:'league',opponents:r.team,level},after:{win:champion(r),lose:{effects:{courage:2},outcome:'정상에는 아직 닿지 못했다. 상대는 다시 오라며 손을 내밀었다. 통과한 관문은 유지된다.'}}}),
    training(),option('이번 도전을 마무리한다','도전 기록 보존 · 정상 도전 중단','가장 가까이 다가간 순간을 기억하며 다른 길을 선택했다.',{flag:`${root}-withdrawn`,effects:{joy:2}}),
   ]};}},
  {id:`${root}-defence`,category:'league',min:18,max:99,once:false,cooldown:5,weight:()=>3,
   when:s=>here(s)&&s.flags[championFlag(r)],
   build:s=>{const level=leagueLevels(s).defence;return {kind:'choice',title:`${r.name} 정상에 오른 뒤의 초청전`,body:'이번에는 어린 도전자가 자신을 넘어설 목표로 당신을 지목했다. 타이틀보다 어떤 경기를 보여 줄지 결정해야 한다.',choices:[
    option('전력을 다해 도전자를 맞이',`Lv.${level} 상대 · 패배해도 명예의 전당 기록 유지`,'도전자에게 가장 진지한 승부로 답했다.',{battle:{kind:'league',opponents:[r.elites[2],r.team[2]],level},after:{win:{effects:{reputation:4},outcome:'승부가 끝난 뒤 도전자와 함께 전술을 돌아봤다.'},lose:{effects:{bond:3},outcome:'새로운 강자의 탄생에 박수를 보냈다. 과거의 우승과 파트너들의 기록은 사라지지 않는다.'}}}),
    option('공개 훈련으로 경험을 나눈다','명성 +1 · 파티 경험치 +20','대회에서 배운 실패와 준비 과정을 후배들에게 공개했다.',{effects:{reputation:1},training:20}),
   ]};}},
  {id:`${root}-homecoming`,category:'league',min:18,max:99,
   when:s=>s.flags[championFlag(r)],
   build:()=>({kind:'choice',title:`${r.name} 리그 우승자의 귀향`,body:'고향에서 첫 파트너를 만났던 장소에 기념 사진을 걸고 싶다는 연락이 왔다. 그때의 작은 몬스터볼을 아직 기억하는 사람들이 기다린다.',choices:[
    option('파트너들과 고향을 찾는다','출생지로 이동 · 유대 +4','처음 걸었던 길을 파트너들과 다시 걸었다. 마을 아이들에게 몬스터볼을 보여 주었다.',{home:true,effects:{bond:4}}),
    option('어린 트레이너의 출발을 후원','300P · 몇 년 뒤 후배의 소식','자신의 이름 대신 첫 파트너의 이름으로 훈련 물품을 보냈다.',{cost:300,effects:{money:-300},follow:[{id:'champion-student',delay:[3,6]}]}),
   ]})},
 ];
 // An accepted campaign gets a chance to continue every few years instead of disappearing among hundreds of
 // unrelated one-off events. A trainer whose life goal is the league keeps going every year. Normal spacing still applies.
 for(const st of stages)if(!st.id.endsWith('-invitation')&&!st.id.endsWith('-defence')&&!st.id.endsWith('-homecoming')){
   st.urgent=s=>s.age-lastLeagueAge(s,root+'-')>=(goalOf(s)==='champion'?1:2);
 }
 return stages;
});

// ── Moving on: a champion (or a trainer who closed this region's challenge) can register in another region's league. ──
const openRegions=s=>LEAGUE_REGIONS.filter(r=>r.id!==currentRegion(s)&&!s.flags[championFlag(r)]&&!s.flags[`league-${r.id}-withdrawn`]);
const doneHere=s=>{const r=LEAGUE_REGIONS.find(x=>x.id===currentRegion(s));return Boolean(r&&(s.flags[championFlag(r)]||s.flags[`league-${r.id}-withdrawn`]));};
export const LEAGUE_TRAVEL=[{
 id:'league-expedition',category:'league',min:16,max:85,once:false,cooldown:s=>goalOf(s)==='champion'?1:4,weight:()=>10,
 when:s=>s.party.length>0&&doneHere(s)&&openRegions(s).length>0&&(goalOf(s)==='champion'||s.career==='traveler'),
 urgent:s=>goalOf(s)==='champion'&&s.age-lastLeagueAge(s,'league-')>=1,
 build:s=>{
  const regions=openRegions(s).sort((a,b)=>(s.game.badges[b.id]||0)-(s.game.badges[a.id]||0)||LEAGUE_REGIONS.indexOf(a)-LEAGUE_REGIONS.indexOf(b)).slice(0,3);
  const levels=leagueLevels(s);
  return {kind:'choice',title:'다음 지방 리그로 원정',
   body:`이 지방에서의 도전은 끝났다. 다른 지방 리그는 지금까지 따낸 타이틀 ${championships(s)}개를 보고 더 강한 상대를 준비해 둔다. 다음 원정에서 최종 상대는 Lv.${levels.final}이다.`,
   choices:[
    ...regions.map(r=>option(`${r.name}지방으로 건너가 도전자 등록`,`${r.name}지방으로 이주 · 리그 도전자 등록 · 배지 ${s.game.badges[r.id]||0}/8`,
     `짐을 꾸려 ${r.name}지방으로 건너가 리그 도전자 명단에 이름을 올렸다.`,{tone:'bold',destination:regionTowns(r.id)[0].id,flag:`league-${r.id}-licensed`})),
    option('지금 사는 곳에 머문다','이주 없음 · 유대 +2','당분간은 지금 사는 곳의 사람들과 지내기로 했다.',{effects:{bond:2}}),
   ]};
 },
}];
