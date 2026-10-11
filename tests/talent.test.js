import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,parseSave,choose,successChance} from '../src/engine.js';
import {createTalent,talentGrowth} from '../src/sim/talent.js';
import {TALENT_EVENTS,TALENT_CONSEQUENCES} from '../src/data/talent-events.js';
import {milestoneEvent} from '../src/data/milestones.js';
import {present} from './helpers.js';

test('five talent tiers are assigned reproducibly without changing simulation RNG',()=>{
 const counts=[0,0,0,0,0,0],fields=new Set();
 for(let i=0;i<1000;i++){const talent=createTalent(`talent-${i}`);counts[talent.level]++;fields.add(talent.field);assert.deepEqual(talent,createTalent(`talent-${i}`));}
 assert.equal(fields.size,4);assert.ok(counts.slice(1).every(n=>n>0));assert.ok(counts[5]<counts[2]);
 const s=createLife({seed:'unchanged'});assert.deepEqual(s.talent,createTalent(s.seed));
});
test('v2 migration preserves pending choices and RNG and rejects malformed current talent',()=>{
 const old=createLife({seed:'talent-migration'});old.age=18;
 const event=milestoneEvent(old),pending=present(old,event);pending.version=2;delete pending.talent;
 const saved=parseSave(JSON.stringify(pending));assert.ok(saved);assert.equal(saved.version,3);
 assert.equal(saved.rng,pending.rng);assert.deepEqual(saved.log,pending.log);assert.equal(saved.pending,pending.pending);
 assert.deepEqual(parseSave(JSON.stringify(pending)),saved);
 for(const talent of [{field:'fake',level:3},{field:'battle',level:0},{field:'battle',level:6},{field:'battle',level:2.5},null]) assert.equal(parseSave(JSON.stringify({...saved,talent})),null);
});
test('talent bonuses are field-specific, capped, and practice does not change birth tier',()=>{
 let s=createLife({seed:'talent-bonus'});s.age=30;s.stats.wisdom=50;s.talent={field:'research',level:5};
 const choice={challenge:{stat:'wisdom',talent:'research',difficulty:0}};
 assert.equal(successChance(s,choice),72);assert.equal(successChance(s,{challenge:{...choice.challenge,talent:'craft'}}),60);
 s.stats.wisdom=100;assert.equal(successChance(s,choice),95);
 const lesson=TALENT_CONSEQUENCES['talent-lesson'].build(s,{data:s.talent});
 s=choose(present(s,lesson),1);assert.equal(s.talent.level,5);assert.ok(s.flags['talent-research-trained']);
 s.stats.wisdom=50;assert.equal(successChance(s,choice),75);
 s.career='researcher';assert.equal(talentGrowth(s),1.15);s.career='keeper';assert.equal(talentGrowth(s),1);
});
test('all 20 talent events restrict tier and field and each branch keeps a valid save',()=>{
 assert.equal(TALENT_EVENTS.length,20);
 for(const event of TALENT_EVENTS){
  const [,field,,raw]=event.id.split('-'),level=Number(raw);
  const s=createLife({seed:'talent-events'});s.age=30;s.talent={field,level};
  assert.ok(event.when(s));assert.ok(!event.when({...s,talent:{field,level:level===5?1:level+1}}));
  const built=event.build(s);
  for(let i=0;i<built.choices.length;i++) assert.ok(parseSave(JSON.stringify(choose(present(structuredClone(s),built),i))),event.id);
 }
});
test('school and career choices differ by tier and preserve ordinary paths',()=>{
 for(const age of [7,12,16,18,22]) for(let level=1;level<=5;level++){
  const s=createLife({seed:'talent-paths'});s.age=age;s.talent={field:'battle',level};
  const event=milestoneEvent(s),special=event.choices.at(-1);
  assert.ok(event.choices.length<=8);assert.ok(special.label.includes(level>=4?'특별 추천':level===3?'유망주':'기초 멘토링'));
  assert.ok(event.choices.length>=4);assert.ok(parseSave(JSON.stringify(present(s,event))));
 }
});
