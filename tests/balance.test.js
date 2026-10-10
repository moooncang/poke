import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,choose,parseSave,advance,acknowledge,autoChoice} from '../src/engine.js';
import {annualTraining,careerMilestone} from '../src/data/progression.js';
import {wildEncounter} from '../src/data/life-events.js';
import {maxHP} from '../src/game.js';
function prepare(event,s){const e={...event,id:'balance-choice',age:s.age,season:0,town:s.town,effects:{}};s.log.push(e);s.pending=e.id;return s;}
test('profession, education and health affect annual growth',()=>{
 const s=createLife({seed:'growth'});s.career='traveler';const trainer=annualTraining(s);s.career='merchant';assert.ok(trainer>annualTraining(s));
 const base=annualTraining(s);s.education='apprentice';assert.ok(annualTraining(s)>base);const healthy=annualTraining(s);s.stats.vitality=20;assert.ok(annualTraining(s)<healthy);
});
test('fixed career checkpoints adapt to employment and education',()=>{
 const s=createLife();for(const age of [16,26,35,40,50,60]){s.age=age;assert.ok(careerMilestone(s));}s.age=27;assert.equal(careerMilestone(s),null);
 s.age=26;s.career='keeper';assert.ok(careerMilestone(s).choices.some(c=>c.promotion));assert.ok(careerMilestone(s).choices.some(c=>c.leaveCareer));
 const before=careerMilestone(s).choices.find(c=>c.career==='researcher').challenge.difficulty;s.education='academy';assert.ok(careerMilestone(s).choices.find(c=>c.career==='researcher').challenge.difficulty<before);
 s.stats.bond=0;s.rng=1;const failed=choose(prepare(careerMilestone(s),s),0);assert.equal(failed.career,'keeper');assert.equal(failed.careerRank,undefined);
});
test('successful capture sends overflow to storage and failure grants no Pokemon',()=>{
 let s=createLife({seed:'catch'});s.age=20;s.stats.bond=100;s.party=Array.from({length:6},()=>({id:25,joined:6,shiny:false,xp:100,hp:maxHP({xp:100})}));
 const event=wildEncounter(s);s=prepare(event,s);s.rng=1;const result=choose(s,1);assert.equal(result.party.length,6);assert.equal(result.box.length,1);assert.equal(result.game.catches,1);assert.equal(result.money,s.money-60);assert.ok(parseSave(JSON.stringify(result)));
 s.stats.bond=0;s.rng=1000;let failed=choose(s,1);assert.equal(failed.log.at(-1).resolution.check.success,false);assert.equal(failed.box.length,0);
});
test('early life offers capture opportunities while respecting milestone ages',()=>{
 let s=createLife({seed:'capture-schedule'}),steps=0;
 while(s.age<26&&steps++<300)s=s.encounter?acknowledge(s):s.pending?autoChoice(s):advance(s);
 assert.ok(s.log.filter(e=>e.title==='야생 포켓몬과의 조우').length>=4);
 assert.ok(s.log.some(e=>e.title==='진로 선택'&&e.age===16));
});
