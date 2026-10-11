import { breedingPairs } from '../sim/breeding.js';
import { poke } from '../sim/text.js';

const opt = (label, outcome, extra = {}) => ({label, description:'유대 +2', outcome, effects:{bond:2}, ...extra});
const follow = (id, data, delay = [1,2]) => [{id, delay, data}];
const parents = d => `${poke(d.a)} · ${poke(d.b)}`;
const event = (title, body, choices) => ({kind:'choice',title,body,choices});
export const BREEDING_EVENTS = [{id:'nursery-breeding',category:'pokemon',min:16,once:false,cooldown:6,
  when:s=>!s.seeds.some(seed=>seed.id.startsWith('nursery-')) && breedingPairs(s).length>0,
  weight:s=>s.career==='keeper'?5:2,
  build:s=>event('두 동료가 맡긴 알의 가능성','키우미집에서 함께 지내기 좋은 두 동료를 찾았다. 실제 알그룹과 개체 성별을 확인한 조합이다. 알을 돌보기로 하면 부모의 이름이 부화 기록에 남는다.',[
    ...breedingPairs(s).slice(0,2).map(({a,b,child})=>opt(`${poke(a.id)} · ${poke(b.id)}에게 함께 쉴 공간을 마련한다`,'부모 포켓몬들이 안정된 공간에서 함께 지내기 시작했다.',{
      description:'유대·부모 친밀도 반영 · 준비비 100P · 성공하면 알 돌봄으로 연결',cost:100,
      challenge:{stat:'bond',difficulty:(s.career==='keeper'?-10:5)-Math.floor((a.affection+b.affection)/40),failure:{outcome:'둘은 아직 함께 지내기를 원하지 않았다. 무리하지 않고 원래 생활로 돌아갔다.',effects:{wisdom:2}}},
      follow:follow('nursery-egg',{a:a.id,b:b.id,child,aUid:a.uid,bUid:b.uid})})),
    opt('이번에는 부모 포켓몬들의 휴식만 돕는다','서두르지 않고 두 동료가 편하게 쉬도록 돌봤다.',{affection:3}),
  ])}];
// A Ditto introduction makes breeding accessible even when a diverse team has no compatible pair.
BREEDING_EVENTS.push({id:'nursery-ditto-introduction',category:'pokemon',min:16,once:false,cooldown:5,
 when:s=>s.party.length>0&&![...s.party,...s.box].some(p=>p.id===132)&&breedingPairs(s).length===0,
 build:s=>event('키우미집의 변신 연습생','키우미집의 메타몽이 당신의 파트너를 따라 한다. 돌보미가 충분히 신뢰를 쌓으면 동료로 맞아도 좋다고 한다. 메타몽도 전설이나 미발견 알그룹과는 교배할 수 없다.',[
  opt('천천히 친해지고 동료로 맞는다','메타몽이 변신을 풀고 당신 곁에 앉았다. 새로운 동료가 되었다.',{description:'유대 판정 · 성공 시 메타몽 합류',join:132,joinOrigin:'adopted',challenge:{stat:'bond',difficulty:5,failure:{outcome:'아직 키우미집을 떠나고 싶지 않은 듯하다. 다음 방문을 기약했다.',effects:{bond:2}}}}),
  opt('변신 연습만 도와준다','파트너와 메타몽이 서로의 동작을 따라 하며 즐겁게 놀았다.',{affection:3}),
 ])});
export const BREEDING_CONSEQUENCES = {
 'nursery-egg':{type:'choice',build:(s,{data:d})=>event('키우미집에서 도착한 알',`${parents(d)} 곁에서 알이 발견됐다. 부모를 떠올리게 하는 움직임이 느껴진다. 다음 돌봄 기간에 부화를 기다릴 수 있다.`,[
   opt('직접 알을 품고 함께 여행한다','부모의 이름을 돌봄 일지 첫 장에 적고 알을 맡았다.',{follow:follow('nursery-hatch',d,[1,1])}),
   opt('키우미집 전문가와 교대로 돌본다','전문가가 일지를 함께 쓰며 부화를 준비한다.',{effects:{money:-80,wisdom:3},cost:80,follow:follow('nursery-hatch',d,[1,1])}),
   opt('새 출발을 준비하는 트레이너에게 맡긴다','알과 부모의 돌봄 일지를 새 가족에게 전달했다.',{effects:{reputation:2,bond:3},follow:follow('nursery-letter',d,[3,5])}),
 ])},
 'nursery-hatch':{type:'choice',build:(s,{data:d})=>event('알껍질 너머 첫 울음',`${parents(d)}의 알에서 ${poke(d.child,'이','가')} 태어났다. 부모와 같은 계열이어도 새로운 개체다. 함께 지낼지, 새 가족을 만날지 정한다.`,[
   opt('우리 가족으로 맞이한다',`${poke(d.child,'을','를')} 동료로 맞았다. 부모 ${parents(d)}와 처음 마주한 날을 일지에 남겼다.`,{description:'알에서 태어난 새 개체 합류 · 유대 +2',join:d.child,joinOrigin:'egg',follow:follow('nursery-first-steps',d,[2,3])}),
   opt('초보 트레이너의 첫 파트너로 보낸다','부모가 지켜보는 가운데 새 트레이너와 인사를 나눴다.',{effects:{joy:4,reputation:3},follow:follow('nursery-letter',d,[3,5])}),
 ])},
 'nursery-first-steps':{type:'choice',build:(s,{data:d})=>event('부모를 따라 하는 작은 발걸음',`${parents(d)}의 알에서 태어났던 동료가 훈련장에 나섰다. 부모의 동작을 흉내 내다가 자기만의 움직임을 찾는다.`,[
   opt('부모와 함께 기초 연습','부모와 어린 동료가 서로 기다려 주며 연습했다.',{training:35,affection:4,description:'파티 경험치 +35 · 친밀도 +4',follow:follow('nursery-generation',d,[4,7])}),
   opt('다른 재능을 찾아 준다','배틀 대신 길 찾기와 돌봄에서 자신감을 얻었다.',{effects:{wisdom:4,bond:4},follow:follow('nursery-generation',d,[4,7])}),
 ])},
 'nursery-generation':{type:'echo',build:(s,{data:d})=>({title:'두 세대가 나란히 선 사진',body:`${parents(d)}의 알을 맡았던 날부터 첫 훈련까지, 일지의 사진을 순서대로 정리했다. ${poke(d.child)}로 태어난 동료가 부모와 다른 자기 삶을 살아가는 기록이다.`,effects:{joy:4,bond:3}})},
 'nursery-letter':{type:'echo',build:(s,{data:d})=>({title:'알을 맡아 간 트레이너의 편지',body:`${parents(d)}의 알에서 태어난 ${poke(d.child,'과','와')} 첫 여행을 마쳤다는 편지가 왔다. 동봉된 사진 뒤에 처음 돌봐 준 사람의 이름이 적혀 있다.`,effects:{joy:4,reputation:2}})},
};
