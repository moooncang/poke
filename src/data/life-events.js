import {TOWNS} from './world.js';
import {regionOf} from './regions.js';
import {gameAction,battleAction,canTransform,MECHANICS} from '../game.js';
export const BACKGROUNDS=[
 {id:'farm',family:'부모와 조부모가 함께 사는 나무열매 농가',wealth:'검소한 살림',home:'농장 옆 단독주택',money:900,wisdom:4,bond:6},
 {id:'center',family:'한부모와 함께 사는 포켓몬센터 직원 가족',wealth:'안정적인 살림',home:'센터 직원 사택',money:1600,wisdom:6,bond:4},
 {id:'merchant',family:'형제 둘과 함께 사는 상점 운영 가족',wealth:'넉넉한 살림',home:'상점 위층 주택',money:2800,wisdom:5,bond:2},
 {id:'research',family:'연구원 부모와 외동으로 사는 가족',wealth:'안정적인 살림',home:'연구소 근처 임대주택',money:1900,wisdom:10,bond:0},
 {id:'fishing',family:'보호자와 사촌들이 함께 사는 어업 가족',wealth:'수입이 불규칙한 살림',home:'항구 공동주택',money:650,wisdom:2,bond:8},
 {id:'ranger',family:'레인저 부모와 동생이 있는 가족',wealth:'검소한 살림',home:'보호구역 관리동',money:1100,wisdom:5,bond:5},
 {id:'breeder',family:'조부모와 함께 사는 포켓몬 사육사 가족',wealth:'안정적인 살림',home:'사육장 옆 주택',money:1700,wisdom:3,bond:9},
 {id:'travel',family:'지방을 순회하는 공연단 가족',wealth:'수입이 불규칙한 살림',home:'이동식 숙소',money:750,wisdom:4,bond:7},
];
export const ENVIRONMENTS=['포켓몬이 자주 찾아오는 주택가','트레이너 왕래가 많은 역 주변','숲과 연결된 조용한 외곽','학교와 시장이 가까운 중심가','야생 포켓몬 보호구역 인근','여러 지방 출신이 모인 공동체'];
const rows=[
 ['나무열매를 훔친 포켓몬','가게의 나무열매가 밤마다 사라진다. 발자국은 작은 포켓몬의 것이다.','야간 잠복으로 확인','먹이 부족부터 조사','상인과 울타리 수리'],
 ['초보 트레이너의 교환','다른 트레이너가 파트너의 타입을 보고 교환을 제안했다.','현재 파트너와 훈련','교환 대신 도감 정보 공유','함께 포켓몬센터 방문'],
 ['체육관의 공개 수업','관장이 상성만으로는 이길 수 없는 상황을 제시했다.','공격 순서를 설계','교체 타이밍을 분석','파트너 신호를 연습'],
 ['알에서 들리는 소리','부화 관리실의 알 하나가 예정일보다 먼저 움직인다.','온도 변화를 기록','관리사에게 즉시 알림','교대로 곁을 지키기'],
 ['먹지 않는 파트너','평소 좋아하던 먹이를 파트너가 거부한다.','센터에서 검진','먹이 성분 비교','스트레스 원인 조사'],
 ['안개 속의 길잡이','안개 때문에 도로 표지판을 읽을 수 없다.','포켓몬의 감각 활용','현재 위치에서 구조 요청','지형도를 대조'],
 ['기술머신 체험회','연구소에서 새 기술의 실습 참가자를 찾는다.','상성 보완 기술 연습','주력 타입 기술 연습','안전성 관찰 담당'],
 ['포켓몬의 영역 다툼','물가의 두 무리가 서로 접근하지 못하게 막는다.','영역 사이 완충지대 조성','먹이 자원 조사','레인저 중재 요청'],
 ['수상한 진화의 돌','노점상이 출처 불명의 진화의 돌을 판다.','연구소 감정 의뢰','거래 경로 추적','구매를 거절하고 신고'],
 ['라이벌의 새로운 전술','라이벌이 이전과 다른 타입의 포켓몬을 데려왔다.','정면 대련으로 확인','지난 배틀 영상 분석','복식 연습을 제안'],
 ['대회 참가비 지원','동네 조합이 대회 참가비를 지원하려 한다.','대표 선수로 지원','전략 분석가로 지원','회복 지원팀 참가'],
 ['이상한 야생 행동','서식지의 포켓몬들이 동시에 한 방향을 바라본다.','현장 관측','기상 기록 대조','주민 안전 먼저 확보'],
 ['폭우로 끊긴 길','도로가 잠기면서 물자가 도착하지 못한다.','물타입과 운반 지원','우회로 표시','임시 대피소 운영'],
 ['야간 포켓몬 관찰','야행성 포켓몬이 낮에 나타났다는 제보가 왔다.','밤까지 관측','서식지 빛공해 조사','도감 기록 대조'],
 ['파트너의 기술 실패','익숙한 기술이 실전에서 제대로 발동하지 않았다.','동작을 나누어 재훈련','휴식 후 컨디션 확인','상대의 특성을 분석'],
 ['부상당한 배달 포켓몬','배달 포켓몬이 짐을 내려놓고 날지 못한다.','센터로 옮기기','대신 물품 전달','배달 경로의 위험 조사'],
 ['잃어버린 몬스터볼','이름표가 없는 몬스터볼이 기차역에 남겨졌다.','역무원에게 접수','센터 등록 정보 확인','발견 장소에서 기다리기'],
 ['지역 콘테스트','기술 조합과 파트너의 컨디션을 평가하는 행사가 열린다.','새 기술 조합에 도전','안정적인 연기를 선택','다른 참가자를 지원'],
 ['바위틈의 화석','공사 도중 화석 같은 물체가 나왔다.','주변 지층 기록','발굴 전문가 호출','공사 우회 협의'],
 ['산란기의 보호구역','탐방객이 늘면서 포켓몬의 둥지가 노출됐다.','출입 안내 설치','관측 장소 이동','주민 순찰대 구성'],
 ['연구 발표의 오류','공개된 연구 자료의 타입 표기에서 모순을 찾았다.','직접 검증 실험','연구자에게 문의','기존 도감과 대조'],
 ['자전거 대회의 사고','선두 참가자가 넘어지며 길을 막았다.','경기를 멈추고 구조','안전 요원 호출','뒤따르는 참가자 안내'],
 ['새 가족의 첫 포켓몬','이웃이 처음으로 포켓몬을 돌보게 됐다.','돌봄 일정 작성','서식 환경 점검','함께 기초 훈련'],
 ['도시의 정전','전기 포켓몬의 이동 경로와 정전 지점이 겹친다.','발전 설비 점검 지원','야생 개체 이동 유도','센터 비상 전력 지원'],
 ['숨겨진 샛길','파트너가 지도에 없는 샛길 앞에서 멈췄다.','짧게 정찰','좌표만 기록','지역 주민에게 확인'],
 ['배틀 영상 공개','훈련 영상에 예상치 못한 관심이 쏠렸다.','전술 설명을 덧붙인다','파트너의 상태를 먼저 점검','초보자 질문에 답변'],
 ['나무열매 작황 부진','같은 품종인데 올해 열매가 작고 적다.','토양과 날씨 조사','수분을 돕는 포켓몬 관찰','다른 농가와 자원 공유'],
 ['보호소의 입양 심사','보호소가 입양 신청자의 돌봄 능력을 확인해 달라고 한다.','실제 생활 환경 방문','돌봄 지식 면담','임시 돌봄부터 권유'],
 ['체육관 관장의 부재','관장이 자리를 비운 동안 도전자들이 몰려왔다.','연습 배틀 진행','대기자에게 전술 수업','센터와 휴식 공간 마련'],
 ['지방 간 연구 교류','다른 지방의 연구소가 데이터를 교환하자고 제안했다.','서식지 기록 제출','배틀 기록 제출','돌봄 사례 제출'],
 ['파트너의 독립 행동','파트너가 지시 전에 먼저 움직여 위기를 피했다.','판단을 존중하고 연습','신호 체계를 다시 정한다','상황을 재현해 분석'],
 ['이주해 온 포켓몬 무리','이 지방에서 드문 포켓몬들이 마을 외곽에 정착했다.','도감에 분포 기록','기존 무리와 충돌 관찰','주민에게 대응법 안내'],
];
export const EXTRA_EVENT_COUNT=rows.length;
const rand=s=>{s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;};
export function seasonalEvent(s){
 const t=TOWNS.find(t=>t.id===s.town),year=s.age,season=s.season;
 if(year>=10&&season===2&&year%3===1){
  const destinations=TOWNS.filter(x=>x.map!==t.map);const offset=Math.floor(rand(s)*destinations.length);const targets=[destinations[offset],destinations[(offset+7)%destinations.length]];
  return {kind:'choice',title:'다른 지방에서 온 초대',body:`${t.name}에 도착한 편지에는 체류 지원 제안이 담겨 있다. 이동하면 만나는 포켓몬과 지방 사건이 달라진다.`,choices:[...targets.map(d=>({label:`${d.region} · ${d.name}으로 이동`,description:'체류 지원 · 이동비 없음',destination:d.id,effects:{courage:4},outcome:`${d.name}으로 이주했다. 새 지방의 생활과 조사가 시작된다.`})),{label:'현재 마을에 머문다',description:'유대 +5',effects:{bond:5},outcome:'현재 마을에서 활동을 계속한다.'}]};
 }
 if(year>=6&&season===1&&year%2===0)return wildEncounter(s);
 if(year>=18&&t.map==='galar'&&season===3&&year%6===0)return {kind:'choice',title:'포켓몬굴의 붉은 빛',body:'거다이맥스 개체가 있는 굴에서 지원 요청이 도착했다.',choices:[{label:'레이드에 참가',description:'자동 배틀 · 승리 시 거다이맥스 인자',simulation:'raid',effects:{courage:5},outcome:'구조팀과 레이드를 시작했다.'},{label:'회복 지원 담당',description:'유대 +6',effects:{bond:6},outcome:'레이드팀의 회복을 지원했다.'}]};
 if(year>=12&&season===3&&year%3===0)return {kind:'choice',title:'체육관 도전 기회',body:`${t.region}지방의 체육관이 도전자를 모집한다. 승부는 파트너의 성장과 전술에 따라 자동으로 진행된다.`,choices:[{label:'배지에 도전한다',description:'자동 배틀 · 승리 시 배지와 상금',simulation:'gym',effects:{courage:4},outcome:'체육관에 도전했다.'},{label:'파트너와 먼저 훈련한다',description:'파티 경험치 +60',training:60,effects:{bond:3},outcome:'모든 파티원의 기초 훈련을 마쳤다.'},{label:'다른 도전자의 경기를 분석한다',description:'지혜 +8',effects:{wisdom:8},outcome:'경기에서 새로운 전술을 배웠다.'}]};
 if(year>=14&&season===1){const mechanic=Object.entries(MECHANICS).find(([id,m])=>id!=='gmax'&&m.region.includes(t.map)&&!s.game.gear.includes(id));if(mechanic){const [id,m]=mechanic;return {kind:'choice',title:`${m.name} 연구 참가`,body:`${t.region}지방 연구소가 장비를 지원하는 훈련 과정을 연다. 조건을 충족한 포켓몬은 이후 배틀에서 자동으로 시스템을 활용한다.`,choices:[{label:'연구 훈련에 참가',description:`${m.name} 장비 해금`,equipment:id,effects:{wisdom:4},outcome:`${m.name} 장비를 지급받았다.`},{label:'기초 육성을 우선한다',description:'파티 경험치 +80',training:80,effects:{bond:5},outcome:'기초 육성 과정을 마쳤다.'}]};}}
 const available=rows.map((r,i)=>({r,i})).filter(({i})=>!s.used.includes(`season-${i}`));const {r,i}=available.length?available[Math.floor(rand(s)*available.length)]:{r:rows[Math.floor(rand(s)*rows.length)],i:-1};if(i>=0)s.used.push(`season-${i}`);
 const choices=r.slice(2).map((label,n)=>({label,description:["용기 +4 · 파티 경험치 +25","지혜 +5 · 조사비 80P","유대 +5 · 건강 +3"][n],effects:[{courage:4},{wisdom:5,money:80},{bond:5,vitality:3}][n],training:n===0?25:0,...(n<2?{challenge:{stat:n===0?'courage':'wisdom',difficulty:10,failure:{effects:n===0?{courage:1}:{wisdom:1},outcome:'활동 목표를 달성하지 못했다. 부족한 부분을 확인하고 다음 기회를 준비한다.'}}}:{}),outcome:`${label} 활동을 완료했다. ${['현장 경험을 파트너와 함께 쌓았다.','확인한 자료를 지역 연구소에 전달했다.','지역 주민과 포켓몬의 안전을 확보했다.'][n]}`}));
 if(year<6)return {kind:'choice',title:['가족의 첫 외출','포켓몬 돌봄 수업','마을에서 보내는 하루'][season%3],body:`${s.family}. ${s.background?.environment||t.environment}에서 자라며 주변 환경을 배운다.`,choices:[{label:'가족과 포켓몬센터 방문',description:'유대 +4',effects:{bond:4},outcome:'센터에서 포켓몬을 돌보는 모습을 관찰했다.'},{label:'집에서 그림 도감 읽기',description:'지혜 +4',effects:{wisdom:4},outcome:'그림 도감으로 여러 포켓몬을 배웠다.'},{label:'이웃 아이들과 야외 활동',description:'건강 +3 · 용기 +3',effects:{vitality:3,courage:3},outcome:'보호자와 함께 안전한 산책로를 탐방했다.'}]};
 return {kind:'choice',title:r[0],body:`${t.name}: ${r[1]}`,choices};
}
export function resolveSimulation(s,choice){
 if(!s.party.length)return '아직 파트너가 없어 현장 관찰로 전환했다.';
 s.party.forEach(p=>p.hp=35+(Math.min(100,5+Math.floor(p.xp/25)))*3);
 let state=gameAction(s,choice.simulation==='gym'?'gym':choice.simulation==='raid'?'raid':'wild');
 if(!state.game.battle)return '이번 배틀은 이미 완료한 리그 대신 훈련으로 전환했다.';
 if(choice.target){state.game.battle.id=choice.target;if(!state.seen.includes(choice.target))state.seen.push(choice.target);}
 const transformation=choice.simulation==='capture'?null:['gmax','mega','tera','z','dynamax'].find(key=>canTransform(state,key));
 if(transformation)state=battleAction(state,'transform',transformation);
 for(let n=0;n<45&&!state.game.battle.result;n++)state=battleAction(state,choice.simulation==='capture'&&(state.game.battle.hp/state.game.battle.maxHp<.8||n>0)&&state.game.balls>0?'catch':'move',0);
 if(!state.game.battle.result)state=battleAction(state,'run');
 const result=state.game.battle.result;state=gameAction(state,'closeBattle');Object.assign(s,state);
 return (transformation?`${MECHANICS[transformation].name}를 사용했다. `:'')+{win:'배틀에서 승리했다. 경험치와 보상을 받았다.',lose:'배틀에서 패배했다. 파트너는 센터에서 회복했다.',caught:'포획에 성공했다. 파티가 가득 차면 새 포켓몬은 보관함으로 전송된다.',escape:'상대와의 접촉을 마치고 안전하게 복귀했다.'}[result];
}

export function wildEncounter(s){
 const t=TOWNS.find(t=>t.id===s.town),owned=[...s.party,...(s.box||[])].map(p=>p.id);
 const pool=t.pool.filter(id=>!owned.includes(id));const options=pool.length?pool:t.pool;const id=options[Math.floor(rand(s)*options.length)];
 return {kind:'choice',title:'야생 포켓몬과의 조우',body:`${t.name}의 서식지에서 포켓몬을 만났다. 파티가 6마리면 포획한 포켓몬은 보관함으로 전송된다.`,choices:[
 {label:'파트너와 배틀하며 포획',description:'몬스터볼 사용 · 상대 HP와 배틀 상황에 따라 판정',simulation:'capture',target:id,effects:{courage:1},outcome:'야생 포켓몬의 움직임에 맞춰 포획을 시도했다.'},
 {label:'먹이로 경계심을 낮춰 데려오기',description:'먹이 60P · 유대에 따른 성공률',cost:60,captureJoin:id,effects:{bond:2},outcome:'경계심을 푼 포켓몬이 동행에 응했다.',challenge:{stat:'bond',difficulty:-10,failure:{effects:{bond:1},outcome:'먹이는 받아먹었지만 동행하지 않고 서식지로 돌아갔다.'}}},
 {label:'서식 습성을 분석해 포획',description:'준비비 60P · 지혜에 따른 성공률',cost:60,captureJoin:id,effects:{wisdom:2},outcome:'이동 경로를 파악해 포획에 성공했다.',challenge:{stat:'wisdom',difficulty:-5,failure:{effects:{wisdom:1},outcome:'예상 경로가 빗나가 포획하지 못했다.'}}},
 {label:'관찰만 하고 보내준다',description:'도감 등록 · 지혜 +1',observe:id,effects:{wisdom:1},outcome:'서식 행동을 기록하고 포켓몬을 보내줬다.'}]};
}
