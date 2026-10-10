import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advance,acknowledge,choose,autoChoice,parseSave} from '../src/engine.js';
import {gameAction,battleAction,fieldMove,maxHP,xpLevel,canTransform,typeMultiplier,MEGA,GMAX_FORMS} from '../src/game.js';
import {TOWNS} from '../src/data/world.js';
import {REGIONS} from '../src/data/regions.js';
import {REGIONAL_EVENTS} from '../src/data/regional-stories.js';
import {existsSync} from 'node:fs';
function ready(town='pallet',id=6){let s=createLife({seed:'game-test',town});s.age=18;s.money=5000;s.party=[{id,joined:6,shiny:false,xp:500,hp:95}];s.seen=[id];return s;}
function battle(town,id=6,kind='wild'){return gameAction(ready(town,id),kind);}

test('nine regions have valid starter species, forty towns and local story chains',()=>{
 assert.equal(REGIONS.length,9);assert.equal(TOWNS.length,40);
 for(const r of REGIONS){assert.ok(TOWNS.some(t=>t.map===r.id));assert.equal(REGIONAL_EVENTS.filter(e=>e.region===r.id).length,3);}
 for(const id of [...Object.values(MEGA),...Object.values(GMAX_FORMS)])assert.ok(existsSync(`public/assets/pokemon/forms/${id}.png`));
});
test('field movement respects map bounds and event/battle locks without mutating input',()=>{
 const s=ready();assert.equal(s.game.position.x,8);assert.equal(fieldMove(s,1,0).game.position.x,9);assert.equal(s.game.position.x,8);
 s.game.position={x:1,y:4};assert.equal(fieldMove(s,-1,0),s);assert.equal(fieldMove(s,0,-1),s);
 const locked={...s,pending:'decision'};assert.equal(fieldMove(locked,1,0),locked);
 const b=gameAction(s,'wild');assert.equal(fieldMove(b,1,0),b);assert.equal(advance(b),b);
});
test('travel spends money/AP and updates visits; insufficient funds cannot move',()=>{
 const s=ready();const n=gameAction(s,'travel','mesagoza');assert.equal(n.town,'mesagoza');assert.equal(n.money,4700);assert.equal(n.game.ap,undefined);assert.ok(n.visited.includes('mesagoza'));
 const poor={...s,money:299};assert.equal(gameAction(poor,'travel','mesagoza'),poor);
 const child={...s,age:9};assert.equal(gameAction(child,'travel','mesagoza'),child);
});
test('field actions consume training evolves starters without an action-point system',()=>{
 let s=ready('pallet',4);s.party[0].xp=250;for(let i=0;i<6;i++)s=gameAction(s,'train');
 assert.equal(s.game.ap,undefined);assert.equal(s.party[0].id,5);assert.ok(gameAction(s,'train'));
 const next=advance(s);assert.equal(next.game.ap,undefined);assert.equal(next.age,19);
});
test('research lab gives a regional starter once and respects party capacity',()=>{
 const s=ready('mesagoza');const n=gameAction(s,'starter',906);assert.equal(n.party.at(-1).id,906);assert.equal(n.money,4700);assert.equal(gameAction(n,'starter',909),n);assert.equal(gameAction(s,'starter',1),s);
 const full={...s,party:Array(6).fill(s.party[0])};assert.equal(gameAction(full,'starter',906),full);
});
test('type chart includes immunities, resistances and dual type multiplication',()=>{
 assert.equal(typeMultiplier('전기',['땅']),0);assert.equal(typeMultiplier('불꽃',['풀','강철']),4);assert.equal(typeMultiplier('물',['물']),.5);assert.equal(typeMultiplier('격투',['고스트']),0);
});
test('mega requires equipment, matching stone and species; permanent species never changes',()=>{
 let s=ready('lumiose',6);assert.equal(gameAction(s,'unlock','mega'),s);s.game.badges.kalos=1;s=gameAction(s,'unlock','mega');assert.ok(s.game.gear.includes('mega'));assert.ok(s.game.megaStones.includes(6));s=gameAction(s,'wild');assert.ok(canTransform(s,'mega'));
 const mega=battleAction(s,'transform','mega');assert.equal(mega.game.battle.form,'mega');assert.equal(mega.party[0].id,6);assert.equal(canTransform(mega,'z'),false);assert.ok(parseSave(JSON.stringify(mega)));
 const exit=battleAction(mega,'run');assert.equal(exit.game.battle.form,null);assert.equal(exit.party[0].id,6);
 s.party[0].id=16;assert.equal(canTransform(s,'mega'),false);
});
test('Z move is consumed once and cannot be selected twice in a battle',()=>{
 let s=battle('hauoli');s.game.gear=['z'];s.game.crystals=['불꽃'];s.game.battle.hp=999;s.game.battle.maxHp=999;s.game.battle.id=143;
 s=battleAction(s,'transform','z');assert.equal(s.game.battle.form,'z');s=battleAction(s,'move',0);assert.equal(s.game.battle.form,null);assert.equal(canTransform(s,'z'),false);
});
test('dynamax only works at Galar power spots and reverts HP after three turns',()=>{
 let s=battle('motostoke',143,'gym');s.game.gear=['dynamax'];s.party[0].hp=maxHP(s.party[0]);s.game.battle.hp=999;s.game.battle.maxHp=999;s.game.battle.level=1;s.game.battle.id=129;
 s=battleAction(s,'transform','dynamax');assert.equal(s.party[0].hp,maxHP(s.party[0])*2);assert.ok(parseSave(JSON.stringify(s)));
 for(let i=0;i<3;i++)s=battleAction(s,'guard');assert.equal(s.game.battle.form,null);assert.ok(s.party[0].hp<=maxHP(s.party[0]));assert.equal(canTransform(s,'dynamax'),false);
 const wild=battle('motostoke');wild.game.gear=['dynamax'];assert.equal(canTransform(wild,'dynamax'),false);
});
test('gmax additionally requires the species factor; escape removes temporary HP scaling',()=>{
 let s=battle('motostoke',6,'gym');s.game.gear=['dynamax'];assert.equal(canTransform(s,'gmax'),false);s.game.gmax=[6];const hp=s.party[0].hp;s=battleAction(s,'transform','gmax');assert.equal(s.game.battle.form,'gmax');s=battleAction(s,'run');assert.equal(s.party[0].hp,hp);assert.ok(parseSave(JSON.stringify(s)));
});
test('tera changes defense, consumes charge, and a center recharges it',()=>{
 let s=battle('mesagoza',25);s.game.gear=['tera'];s.game.teraType='땅';s.game.battle.id=25;
 const hp=s.party[0].hp;s=battleAction(s,'transform','tera');s=battleAction(s,'guard');assert.equal(s.party[0].hp,hp,'Electric immunity comes from Ground tera type');assert.equal(s.game.teraCharge,false);
 s=battleAction(s,'run');s=gameAction(s,'closeBattle');s=gameAction(s,'heal');assert.equal(s.game.teraCharge,true);assert.equal(s.party[0].hp,maxHP(s.party[0]));
});
test('defeating a gym grants one badge and battle rewards cannot be claimed again',()=>{
 let s=battle('pallet',6,'gym');s.game.battle.hp=1;const money=s.money;s=battleAction(s,'move',0);assert.equal(s.game.battle.result,'win');assert.equal(s.game.badges.kanto,1);assert.equal(s.money,money+500);assert.equal(battleAction(s,'move',0),s);
 assert.ok(parseSave(JSON.stringify(s)));assert.equal(gameAction(s,'closeBattle').game.battle,null);
});
test('capture uses a ball, can fill the party, and cannot capture gym opponents',()=>{
 let s=battle('pallet');s.game.battle.hp=1;s.rng=1;const balls=s.game.balls;s=battleAction(s,'catch');assert.equal(s.game.balls,balls-1);assert.equal(s.game.battle.result,'caught');assert.equal(s.party.length,2);assert.equal(s.game.catches,1);
 const gym=battle('pallet',6,'gym');assert.equal(battleAction(gym,'catch'),gym);
});
test('old saves migrate without losing pending choices, malformed battle state is rejected',()=>{
 let s=createLife({seed:'old'});delete s.game;delete s.lifespan;const n=parseSave(JSON.stringify(s));assert.ok(n.game);assert.equal(n.rng,s.rng);assert.deepEqual(n.log,s.log);
 for(const patch of [{position:{x:900,y:7}},{battle:{kind:'wild'}},{gear:['unknown']}])assert.equal(parseSave(JSON.stringify({...ready(),game:{...ready().game,...patch}})),null);
});
test('lifespans vary and most playable years contain a decision; all runs terminate',()=>{
 const ages=new Set();for(let i=0;i<4;i++){let s=createLife({seed:`lifetime-${i}`,town:TOWNS[i%40].id}),steps=0;while(!s.ended&&steps++<1100)s=s.encounter?acknowledge(s):s.pending?autoChoice(s):advance(s);assert.ok(s.ended);assert.ok(s.age>=60&&s.age<=100);assert.ok(s.log.filter(e=>e.choices).length>s.age*.65);ages.add(s.age);}
 assert.ok(ages.size>1);
});
test('route decisions retain branch flags without immediate extra choices',()=>{
 let s=createLife({seed:'branches',town:'pallet'});while(!s.pending||!s.log.at(-1).sourceId?.startsWith('route-'))s=s.encounter?acknowledge(s):s.pending?autoChoice(s):advance(s);
 const a=choose(s,0),b=choose(s,1);assert.notDeepEqual(a.flags,b.flags);assert.equal(a.pending,null);assert.equal(a.log.length,s.log.length);assert.equal(a.age,s.age);assert.ok(parseSave(JSON.stringify(a)));
});
