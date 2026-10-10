import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,choose,parseSave,successChance,advance} from '../src/engine.js';
import {academyExam,CHALLENGE_EVENTS} from '../src/data/challenges.js';
function exam(wisdom,rng) {
 const s=createLife({seed:'exam'});s.age=18;s.education='travel';s.stats.wisdom=wisdom;s.rng=rng;s.money=1000;
 const entry={id:'exam-18',age:18,season:0,town:s.town,kind:'choice',title:'특별전형',body:'시험',effects:{},choices:[academyExam]};
 s.log.push(entry);s.pending=entry.id;return s;
}
test('chance follows the relevant stat, is bounded and never changes RNG',()=>{
 const s=exam(0,1),rng=s.rng;assert.equal(successChance(s,academyExam),10);
 s.stats.wisdom=100;assert.equal(successChance(s,academyExam),80);
 s.stats.bond=100;assert.equal(successChance(s,academyExam),80);assert.equal(s.rng,rng);
 const c={challenge:{stat:'wisdom',difficulty:100}};assert.equal(successChance(s,c),5);c.challenge.difficulty=-100;assert.equal(successChance(s,c),95);
});
test('admission only happens on success, cost is charged once on either result',()=>{
 const low=exam(0,1),high=exam(100,1);
 const failed=choose(low,0),passed=choose(high,0);
 assert.equal(failed.education,'travel');assert.equal(failed.flags['elite-academy'],undefined);assert.equal(failed.money,800);
 assert.equal(passed.education,'academy');assert.ok(passed.flags['elite-academy']);assert.equal(passed.money,1600);
 assert.equal(failed.log.at(-1).resolution.check.success,false);assert.equal(passed.log.at(-1).resolution.check.success,true);
 assert.equal(failed.log.at(-1).resolution.check.chance,10);assert.equal(low.money,1000);
 assert.equal(choose(passed,0),passed);assert.equal(advance(passed).age,19);
});
test('pending checks survive saves and deterministic rolls cannot be rerolled by reload',()=>{
 const s=exam(65,7);const saved=parseSave(JSON.stringify(s));assert.ok(saved);
 assert.deepEqual(choose(s,0),choose(saved,0));assert.deepEqual(parseSave(JSON.stringify(choose(s,0))),choose(s,0));
 s.money=199;assert.equal(choose(s,0),s);
 s.log.at(-1).choices=structuredClone(s.log.at(-1).choices);s.log.at(-1).choices[0].challenge.stat='invalid';assert.equal(parseSave(JSON.stringify(s)),null);
});
test('60 unique events have two stat checks, meaningful outcomes and a guaranteed alternative',()=>{
 assert.equal(CHALLENGE_EVENTS.length,60);assert.equal(new Set(CHALLENGE_EVENTS.map(e=>e.id)).size,60);
 for(const event of CHALLENGE_EVENTS){
  assert.notEqual(event.choices[0].challenge.stat,event.choices[1].challenge.stat);
  for(const option of event.choices.slice(0,2))assert.notEqual(option.outcome,option.challenge.failure.outcome);
  const s=exam(50,10);s.log.at(-1).choices=event.choices;
  const result=choose(s,2);assert.equal(result.pending,null);assert.equal(result.rng,s.rng);assert.equal(result.money,1080);assert.ok(parseSave(JSON.stringify(result)));
 }
});
