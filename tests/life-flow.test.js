import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advance,autoChoice,acknowledge,choose,parseSave} from '../src/engine.js';
test('random birth is reproducible and varied',()=>{const lives=Array.from({length:20},(_,i)=>createLife({seed:'birth'+i}));assert.ok(new Set(lives.map(s=>s.town)).size>5);assert.ok(new Set(lives.map(s=>s.background.id)).size>4);assert.deepEqual(createLife({seed:'fixed'}),createLife({seed:'fixed'}));});
test('automatic records separate decisions by 4–7 entries without moving milestones',()=>{
 for(const seed of ['schedule-a','schedule-b']){
  let s=createLife({seed}),steps=0,lastDecision=-1;
  while(!s.ended&&steps++<1100){
   if(s.encounter)s=acknowledge(s);
   else if(s.pending){
    const index=s.log.findIndex(e=>e.id===s.pending);
    if(lastDecision>=0){const gap=index-lastDecision-1;assert.ok(gap>=4&&gap<=7,`gap ${gap}`);}
    lastDecision=index;
    const n=choose(s,0);s=n===s?autoChoice(s):n;assert.equal(s.pending,null);
   }else{
    const length=s.log.length,age=s.age,deferred=Boolean(s.scheduledEvent);s=advance(s);
    assert.equal(s.log.length,length+1);assert.equal(s.age,deferred?age:age+1);
   }
  }
  assert.ok(s.ended);assert.ok(s.log.filter(e=>e.automatic).length>s.log.filter(e=>e.choices).length*2);
  for(const [age,title] of [[7,'어린 시절의 학습 방식'],[12,'성장기 활동 방향'],[16,'진로 선택'],[18,'학교 졸업 후의 선택']])assert.ok(s.log.some(e=>e.age===age&&e.title===title));
  assert.ok(s.relationship.marriedAt>=18);assert.ok(parseSave(JSON.stringify(s)));
 }
});
test('automatic progress resumes from a save and follows the selected activity',()=>{
 let s=createLife({seed:'activity-save'});
 while(!s.pending)s=s.encounter?acknowledge(s):advance(s);
 s=choose(s,0);s=advance(s);assert.ok(s.scheduledEvent);assert.ok(s.log.at(-1).automatic);assert.equal(s.log.at(-1).parentId,s.activity.parentId);assert.equal(s.activity.mode,'wisdom');
 const saved=parseSave(JSON.stringify(s));assert.ok(saved);assert.deepEqual(advance(saved),advance(s));
 const age=s.age,money=s.money;while(s.scheduledEvent)s=advance(s);
 assert.equal(s.age,age);assert.equal(s.money,money);assert.ok(s.pending);
});
test('an old mid-season save keeps its pending choice then proceeds to next year',()=>{let s=createLife({seed:'migration'});s=advance(s);s.season=2;const loaded=parseSave(JSON.stringify(s));let settled=loaded.pending?autoChoice(loaded):loaded;settled=settled.encounter?acknowledge(settled):settled;assert.equal(advance(settled).age,loaded.age+1);});

test('non-school route avoids graduation and retains the option of later study',()=>{let s=createLife({seed:'no-school'});while(s.age<22||s.scheduledEvent){if(s.encounter)s=acknowledge(s);else if(s.pending){let index=s.age===7?1:s.age===12?1:s.age===16?4:s.age===18?3:0;const next=choose(s,index);s=next===s?autoChoice(s):next;}else s=advance(s);}assert.equal(s.log.find(e=>e.age===18&&e.choices).title,'성인기의 새로운 방향');assert.equal(s.log.at(-1).title,'앞으로의 활동 계획');assert.equal(s.career,null);assert.equal(s.education,'travel');assert.ok(s.log.at(-1).choices.some(c=>c.education==='study'));assert.ok(parseSave(JSON.stringify(s)));});
