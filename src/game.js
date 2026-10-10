import { TOWNS } from './data/world.js';
import { regionOf } from './data/regions.js';
import { TYPES, TYPE_CHART } from './data/battle-data.js';
export const MEGA = {"3": 10033, "6": 10034, "9": 10036, "65": 10037, "94": 10038, "115": 10039, "127": 10040, "130": 10041, "142": 10042, "150": 10043, "181": 10045, "212": 10046, "214": 10047, "229": 10048, "248": 10049, "257": 10050, "282": 10051, "303": 10052, "306": 10053, "308": 10054, "310": 10055, "354": 10056, "359": 10057, "445": 10058, "448": 10059, "460": 10060, "380": 10062, "381": 10063, "260": 10064, "254": 10065, "302": 10066, "334": 10067, "475": 10068, "531": 10069, "319": 10070, "80": 10071, "208": 10072, "18": 10073, "362": 10074, "719": 10075, "376": 10076, "384": 10079, "323": 10087, "428": 10088, "373": 10089, "15": 10090};
export const GMAX_FORMS = {"3": 10195, "6": 10196, "9": 10197, "12": 10198, "25": 10199, "52": 10200, "68": 10201, "94": 10202, "99": 10203, "131": 10204, "133": 10205, "143": 10206, "569": 10207, "809": 10208, "812": 10209, "815": 10210, "818": 10211, "823": 10212, "826": 10213, "834": 10214, "839": 10215, "841": 10216, "842": 10217, "844": 10218, "849": 10219, "851": 10220, "858": 10221, "861": 10222, "869": 10223, "879": 10224, "884": 10225, "892": 10226};
export const GMAX = Object.keys(GMAX_FORMS).map(Number);
export const MECHANICS = {mega:{name:'메가진화',region:['kalos','hoenn'],require:'칼로스·호연 연구소 / 배지 1개 / 500P',detail:'키스톤 + 해당 메가스톤. 대응 종만 사용. 배틀 종료까지 위력 증가.'},z:{name:'Z기술',region:['alola'],require:'알로라 연구소 / 배지 1개 / 500P',detail:'Z링 + 같은 타입의 Z크리스탈. 한 배틀에 한 번, 다음 공격 강화.'},dynamax:{name:'다이맥스',region:['galar'],require:'가라르 연구소 / 배지 1개 / 500P',detail:'다이맥스밴드. 가라르 체육관·레이드에서 3턴 동안 HP·공격 강화.'},gmax:{name:'거다이맥스',region:['galar'],require:'다이맥스 해금 + 가라르 레이드 승리',detail:'거다이맥스 인자를 가진 대응 종만 사용. 3턴 동안 전용 강화 공격.'},tera:{name:'테라스탈',region:['paldea'],require:'팔데아 연구소 / 배지 1개 / 500P',detail:'테라스탈오브. 방어 타입 변경, 테라타입 기술 강화. 센터에서 재충전.'}};
export const MOVE_TYPES = {'노말':'몸통박치기','불꽃':'화염방사','물':'물의파동','풀':'잎날가르기','전기':'전기쇼크','얼음':'얼음뭉치','격투':'로킥','독':'독침','땅':'땅고르기','비행':'날개치기','에스퍼':'염동력','벌레':'벌레먹기','바위':'돌떨구기','고스트':'섀도볼','드래곤':'용의숨결','악':'물기','강철':'메탈크로우','페어리':'차밍보이스'};
export const xpLevel = p => Math.min(100,5+Math.floor((p.xp||0)/25));
export const maxHP = p => 35+xpLevel(p)*3;
export const typeMultiplier = (type,defenders)=>defenders.reduce((n,t)=>n*(TYPE_CHART[`${type}>${t}`]??1),1);
export function freshGame(){return {ap:6,position:{x:8,y:7},badges:{},gear:[],megaStones:[],crystals:[],gmax:[],teraType:'노말',teraCharge:true,balls:8,battle:null,feed:[],steps:0,focus:'balanced',wins:0,catches:0,claimed:[]};}
export function ensureGame(s){s.game ||= freshGame();for(const p of s.party){p.xp??=Math.max(0,(s.age-p.joined)*5);p.hp??=maxHP(p);}return s;}
function rng(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function sample(s,a){return a[Math.floor(rng(s)*a.length)];}
function report(s,text){s.game.feed.unshift({text,age:s.age,id:`${s.age}-${s.game.steps++}`});s.game.feed=s.game.feed.slice(0,30);return s;}
function town(s){return TOWNS.find(t=>t.id===s.town);}
export function blocked(s){return s.ended||!!s.pending||!!s.encounter;}
export function badgeCount(s){return Object.values(s.game?.badges||{}).reduce((a,b)=>a+b,0);}
export function movesOf(p){return [...new Set([...(TYPES[p.id]||['노말']),'노말'])].map(type=>({type,name:MOVE_TYPES[type],power:type==='노말'?30:42}));}
export function canTransform(s,key){
 const g=s.game,b=g?.battle,p=s.party[0];
 if(!b||!p||b.result||b.transformed||!g.gear.includes(key==='gmax'?'dynamax':key))return false;
 if(key==='mega')return !!MEGA[p.id]&&g.megaStones.includes(p.id);
 if(key==='z')return movesOf(p).some(m=>g.crystals.includes(m.type));
 if(key==='dynamax'||key==='gmax')return town(s).map==='galar'&&['gym','raid'].includes(b.kind)&&(key!=='gmax'||GMAX.includes(p.id)&&g.gmax.includes(p.id));
 return key==='tera'&&g.teraCharge;
}
export function fieldMove(input,dx,dy){
 if(blocked(input)||input.game?.battle||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return input;
 const s=ensureGame(structuredClone(input)),p=s.game.position,x=p.x+dx,y=p.y+dy;
 if(x<1||x>14||y<4||y>9)return input;
 s.game.position={x,y};return s;
}
export function gameAction(input,action,value){
 if(blocked(input))return input;
 const s=ensureGame(structuredClone(input)),g=s.game,p=s.party[0],t=town(s);
 if(g.battle&&action!=='closeBattle')return input;
 if(action==='closeBattle'){if(!g.battle?.result)return input;g.battle=null;return s;}
 if(action==='focus'){if(!['balanced','battle','research','care'].includes(value))return input;g.focus=value;return s;}
 if(action==='leader'){if(!Number.isInteger(value)||value<0||value>=s.party.length)return input;[s.party[0],s.party[value]]=[s.party[value],s.party[0]];return s;}
 if(action==='teraType'){if(!(value in MOVE_TYPES))return input;g.teraType=value;return s;}
 if(action==='travel'){
  const dest=TOWNS.find(x=>x.id===value);if(!dest||dest.id===s.town||s.age<10||s.money<300||g.ap<1)return input;
  s.money-=300;g.ap--;s.town=dest.id;if(!s.visited.includes(dest.id))s.visited.push(dest.id);g.position={x:8,y:7};return report(s,`${dest.region} · ${dest.name} 도착. 이동비 300P.`);
 }
 if(action==='heal'){if(s.money<100||!p)return input;s.money-=100;s.party.forEach(x=>x.hp=maxHP(x));g.teraCharge=true;return report(s,'포켓몬센터: 전원 HP 회복 / 테라스탈오브 충전. −100P.');}
 if(action==='balls'){if(s.money<200)return input;s.money-=200;g.balls+=5;return report(s,'몬스터볼 5개 구입. −200P.');}
 if(action==='unlock'){
  const m=MECHANICS[value];if(!m||value==='gmax'||!m.region.includes(t.map)||badgeCount(s)<1||s.money<500||g.gear.includes(value))return input;
  s.money-=500;g.gear.push(value);
  if(value==='mega')g.megaStones=Object.keys(MEGA).map(Number);
  if(value==='z')g.crystals=Object.keys(MOVE_TYPES);
  return report(s,`${m.name} 장비 세트 획득. −500P. ${m.detail}`);
 }
 if(g.ap<1||s.age<6)return input;
 if(action==='starter'){
  if(g.claimed.includes(t.map)||s.party.length>=6||s.money<300)return input;
  const id=Number(value);if(!regionOf(t).starters.includes(id))return input;
  g.ap--;s.money-=300;g.claimed.push(t.map);const member={id,joined:s.age,shiny:false,xp:0};member.hp=maxHP(member);s.party.push(member);if(!s.seen.includes(id))s.seen.push(id);return report(s,'연구소에서 스타팅 포켓몬을 분양받았다. −300P.');
 }
 if(action==='rest'){g.ap--;s.party.forEach(x=>x.hp=maxHP(x));s.stats.vitality=Math.min(100,s.stats.vitality+5);return report(s,'캠프 휴식: 파티 HP 회복 / 건강 +5.');}
 if(action==='train'){if(!p||p.hp<=0)return input;g.ap--;p.xp+=35;p.hp=Math.max(1,p.hp-8);evolve(s,p);return report(s,`훈련 완료. 경험치 +35 / 레벨 ${xpLevel(p)}.`);}
 if(action==='research'){g.ap--;s.stats.wisdom=Math.min(100,s.stats.wisdom+4);s.money+=80;const id=sample(s,t.pool);if(!s.seen.includes(id))s.seen.push(id);return report(s,`생태 조사 완료. 도감 #${id} 등록 / 연구비 +80P.`);}
 if(['wild','gym','raid'].includes(action)){
  if(!p||p.hp<=0)return input;if(action==='raid'&&t.map!=='galar')return input;
  if(action==='gym'&&(g.badges[t.map]||0)>=8)return input;
  g.ap--;const level=action==='gym'?6+(g.badges[t.map]||0)*5:action==='raid'?25:Math.max(3,xpLevel(p)-2+Math.floor(rng(s)*5));
  const id=action==='raid'?sample(s,GMAX):sample(s,t.pool);const hp=35+level*3;
  if(!s.seen.includes(id))s.seen.push(id);
  g.battle={kind:action,id,level,hp,maxHp:hp,turn:0,transformed:null,form:null,turnsLeft:0,shield:false,result:null,messages:[action==='gym'?`${t.region} 배지 ${(g.badges[t.map]||0)+1} 도전!`:action==='raid'?'거다이맥스 레이드 시작!':'야생 포켓몬 출현!']};return s;
 }
 return input;
}
const EVOLVE={1:[16,2],2:[32,3],4:[16,5],5:[36,6],7:[16,8],8:[36,9],152:[16,153],153:[32,154],155:[14,156],156:[36,157],158:[18,159],159:[30,160],252:[16,253],253:[36,254],255:[16,256],256:[36,257],258:[16,259],259:[36,260],387:[18,388],388:[32,389],390:[14,391],391:[36,392],393:[16,394],394:[36,395],495:[17,496],496:[36,497],498:[17,499],499:[36,500],501:[17,502],502:[36,503],650:[16,651],651:[36,652],653:[16,654],654:[36,655],656:[16,657],657:[36,658],722:[17,723],723:[34,724],725:[17,726],726:[34,727],728:[17,729],729:[34,730],810:[16,811],811:[35,812],813:[16,814],814:[35,815],816:[16,817],817:[35,818],906:[16,907],907:[36,908],909:[16,910],910:[36,911],912:[16,913],913:[36,914],280:[20,281],281:[30,282],16:[18,17],17:[36,18],10:[7,11],11:[10,12],13:[7,14],14:[10,15],92:[25,93],129:[20,130],447:[20,448]};
function evolve(s,p){const rule=EVOLVE[p.id];if(rule&&xpLevel(p)>=rule[0]){p.id=rule[1];p.hp=maxHP(p);if(!s.seen.includes(p.id))s.seen.push(p.id);report(s,`진화 완료! 도감 #${p.id} / Lv.${xpLevel(p)}`);}}
function finish(s,result){const g=s.game,b=g.battle,p=s.party[0];b.result=result;
 // Undo temporary HP scaling on all exits, including running and capturing.
 if(['dynamax','gmax'].includes(b.form))p.hp=Math.ceil(p.hp/2);
 b.form=null;b.turnsLeft=0;
 if(result==='win'){
  g.wins++;p.xp+=b.kind==='wild'?35:70;s.money+=b.kind==='gym'?500:150;evolve(s,p);
  if(b.kind==='gym')g.badges[town(s).map]=Math.min(8,(g.badges[town(s).map]||0)+1);
  if(b.kind==='raid'){if(!g.gmax.includes(b.id))g.gmax.push(b.id);if(s.party.length<6){const member={id:b.id,joined:s.age,shiny:false,xp:500};member.hp=maxHP(member);s.party.push(member);}}
  report(s,b.kind==='gym'?'체육관 승리! 배지 +1 / 500P / 경험치 +70.':b.kind==='raid'?'레이드 승리! 거다이맥스 인자 등록. 파티에 자리가 있으면 합류.':'야생 배틀 승리! 150P / 경험치 +35.');
 }
 if(result==='lose')report(s,'배틀 패배. 포켓몬센터 또는 캠프에서 회복하세요.');
 return s;
}
export function battleAction(input,action,value){
 if(blocked(input)||!input.game?.battle||input.game.battle.result)return input;
 const s=ensureGame(structuredClone(input)),g=s.game,b=g.battle,p=s.party[0];
 if(action==='transform'){
  if(!canTransform(s,value))return input;b.transformed=value;b.form=value;b.turnsLeft=['dynamax','gmax'].includes(value)?3:0;
  if(b.turnsLeft)p.hp*=2;if(value==='tera')g.teraCharge=false;
  b.messages.unshift(`${MECHANICS[value].name} 발동!`);return s;
 }
 if(action==='run'){return finish(s,'escape');}
 if(action==='catch'){
  if(b.kind!=='wild'||g.balls<=0||s.party.length>=6)return input;g.balls--;
  if(rng(s)<0.15+0.7*(1-b.hp/b.maxHp)){
   const member={id:b.id,joined:s.age,shiny:false,xp:Math.max(0,(b.level-5)*25)};member.hp=maxHP(member);s.party.push(member);g.catches++;report(s,`포획 성공! 도감 #${b.id}.`);return finish(s,'caught');
  }b.messages.unshift('볼에서 빠져나왔다!');
 }else if(action==='guard'){b.shield=true;b.messages.unshift('방어 태세! 받는 피해가 감소한다.');}
 else if(action==='move'){
  const move=movesOf(p)[value];if(!move)return input;
  if(b.form==='z'&&!g.crystals.includes(move.type))return input;
  const atkType=move.type;const mult=typeMultiplier(atkType,TYPES[b.id]);
  const nativeStab=(TYPES[p.id]||[]).includes(atkType);
  const stab=b.form==='tera'&&g.teraType===atkType?(nativeStab?2:1.5):nativeStab?1.5:1;
  const boost=b.form==='mega'?1.6:b.form==='z'?2.5:b.form==='gmax'?1.9:b.form==='dynamax'?1.5:1;
  const damage=mult===0?0:Math.max(1,Math.round((7+xpLevel(p)*.7)*(move.power/35)*stab*boost*mult*(.85+rng(s)*.15)));
  b.hp=Math.max(0,b.hp-damage);b.messages.unshift(`${b.form==='z'?'Z기술 · ':b.form==='gmax'?'거다이 기술 · ':''}${move.name}: ${damage} 피해${mult===0?' · 효과 없음':mult>1?' · 효과가 굉장했다!':mult<1?' · 효과가 별로다':''}`);
  if(b.form==='z')b.form=null;
  if(b.hp===0)return finish(s,'win');
 }else return input;
 const enemyType=TYPES[b.id]?.[0]||'노말',def=b.form==='tera'?[g.teraType]:TYPES[p.id];
 const mult=typeMultiplier(enemyType,def);const damage=mult===0?0:Math.max(1,Math.round((6+b.level*.75)*mult*(b.shield?.4:1)));
 p.hp=Math.max(0,p.hp-damage);b.shield=false;b.turn++;b.messages.unshift(`상대의 ${MOVE_TYPES[enemyType]}: ${damage} 피해.`);
 if(b.turnsLeft>0&&--b.turnsLeft===0){p.hp=Math.ceil(p.hp/2);b.form=null;b.messages.unshift('다이맥스가 종료되었다.');}
 b.messages=b.messages.slice(0,8);if(p.hp===0)return finish(s,'lose');return s;
}
