import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, choose, parseSave } from '../src/engine.js';
import { addPokemon } from '../src/sim/party.js';
import { breedingPairs, breedingSex, offspringFor } from '../src/sim/breeding.js';
import { BREEDING_EVENTS, BREEDING_CONSEQUENCES } from '../src/data/breeding-events.js';
import { ADVENTURE_SAGAS } from '../src/data/adventure-sagas.js';
import { takeDueChoice } from '../src/sim/consequences.js';
import { present } from './helpers.js';
function state() {
 const s=createLife({seed:'breeding-test',town:'pallet'});
 s.age=35;s.money=6000;s.career='traveler';s.reputation=50;s.encounter=null;
 addPokemon(s,6,{origin:'partner',affection:80});addPokemon(s,132,{affection:80});
 return s;
}
test('breeding checks egg groups, distinct individuals, sex, babies and legends',()=>{
 const s=state(),[a,ditto]=s.party;
 assert.equal(offspringFor(s,a,ditto),4);
 assert.equal(offspringFor(s,a,a),null);
 for(const id of [132,172,150,493]) assert.equal(offspringFor(s,{...a,id},ditto),null);
 const female={...a,id:29},male={...ditto,id:32};
 assert.equal(breedingSex(s,female),'female');assert.equal(breedingSex(s,male),'male');
 assert.ok([29,32].includes(offspringFor(s,female,male)));
 assert.equal(offspringFor(s,female,{...male,id:81}),null);
 assert.equal(offspringFor(s,{...a,id:81},ditto),81,'genderless can breed with Ditto');
 assert.deepEqual(breedingPairs(s),breedingPairs(parseSave(JSON.stringify(s))));
});
test('breeding success persists through save, deferred care and hatch with parent records',()=>{
 let s=state();s.stats.bond=100;s.rng=1;
 const root=BREEDING_EVENTS[0];s=choose(present(s,root.build(s)),0);
 assert.ok(s.seeds.some(x=>x.id==='nursery-egg'));
 assert.equal(root.when(s),false,'one family story at a time');
 s=parseSave(JSON.stringify(s));s.age+=2;
 s=choose(present(s,takeDueChoice(s)),0);s.age+=1;
 const event=takeDueChoice(s);assert.ok(event.body.includes('{poke:6}'));assert.ok(event.body.includes('{poke:132}'));
 const before=[...s.party,...s.box].length;
 const pending=present(s,event),restored=parseSave(JSON.stringify(pending));
 s=choose(pending,0);assert.deepEqual(s,choose(restored,0));
 const members=[...s.party,...s.box];assert.equal(members.length,before+1);
 assert.ok(members.some(p=>p.id===4&&p.origin==='egg'));
 assert.ok(s.seeds.some(x=>x.id==='nursery-first-steps'));
 assert.ok(parseSave(JSON.stringify(s)));
});
test('nursery decline and adoption branch do not add an unwanted duplicate',()=>{
 const s=state(),count=s.party.length;
 const declined=choose(present(s,BREEDING_EVENTS[0].build(s)),1);
 assert.equal(declined.seeds.length,0);assert.equal(declined.party.length,count);
 const event=BREEDING_CONSEQUENCES['nursery-hatch'].build(s,{data:{a:6,b:132,child:4}});
 const sent=choose(present(s,event),1);assert.equal(sent.party.length,count);assert.ok(sent.seeds.some(x=>x.id==='nursery-letter'));
});
test('108 adventure chapters and nursery decisions preserve saves on every choice',()=>{
 assert.equal(ADVENTURE_SAGAS.length,108);
 assert.equal(new Set(ADVENTURE_SAGAS.map(x=>x.id)).size,108);
 const stories=[...ADVENTURE_SAGAS,...BREEDING_EVENTS,...Object.values(BREEDING_CONSEQUENCES).filter(x=>x.type==='choice')];
 for(const st of stories){
  const s=state(),event=st.build(s,{data:{a:6,b:132,child:4}});
  assert.ok(event.choices.some(c=>!c.cost));
  for(let i=0;i<event.choices.length;i++){
   const pending=present(structuredClone(s),structuredClone(event));
   assert.ok(parseSave(JSON.stringify(pending)),`${event.title} pending`);
   assert.ok(parseSave(JSON.stringify(choose(pending,i))),`${event.title} choice ${i}`);
  }
 }
});
test('adventure later chapters require progress, time and respect withdrawal',()=>{
 let s=state();const [first,second,third]=ADVENTURE_SAGAS;
 assert.ok(first.when(s));assert.ok(!second.when(s));s.stats.courage=100;s.rng=1;
 s=choose(present(s,first.build(s)),0);s.cooldowns[first.id]=s.age;
 assert.ok(s.flags[first.id]);assert.ok(!second.when(s));s.age+=2;assert.ok(second.when(s));assert.ok(!third.when(s));
 s=choose(present(s,second.build(s)),2);assert.ok(!second.when(s));assert.ok(!third.when(s));
});
test('only three new adventure chains run concurrently and chapter endings free a slot',()=>{
 const s=state();
 for(const key of ['lavender','first-ball','photo-dex']) s.flags[`adventure-${key}-0`]=true;
 const root=ADVENTURE_SAGAS.find(x=>x.id==='adventure-red-0');
 assert.equal(root.when(s),false);
 s.flags['adventure-first-ball-2']=true;
 assert.equal(root.when(s),true);
 const charity=ADVENTURE_SAGAS.find(x=>x.id==='adventure-champion-charity-0');
 assert.equal(charity.when(s),false);s.flags['league-kanto-champion']=true;assert.equal(charity.when(s),true);
});
