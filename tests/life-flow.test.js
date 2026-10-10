import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advance,autoChoice,acknowledge,choose,parseSave} from '../src/engine.js';
import {seasonalEvent} from '../src/data/life-events.js';
import {relationshipEvent} from '../src/data/relationships.js';
test('birth randomizes town, family situation and environment reproducibly',()=>{const lives=Array.from({length:20},(_,i)=>createLife({seed:'birth'+i}));assert.ok(new Set(lives.map(s=>s.town)).size>5);assert.ok(new Set(lives.map(s=>s.background.id)).size>4);assert.ok(new Set(lives.map(s=>s.background.environment)).size>3);assert.deepEqual(createLife({seed:'fixed'}),createLife({seed:'fixed'}));});
test('seasonal choices preserve age, then advance the year, and save round-trips',()=>{let s=createLife({seed:'seasons'});for(let n=0;n<3;n++){s=advance(s);assert.equal(s.age,0);assert.ok(s.pending);s=choose(s,0);}s=advance(s);assert.equal(s.age,1);assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.equal(s.game.ap,undefined);});
test('a playable life reaches marriage and seasonal travel through decisions',()=>{let s=createLife({seed:'family-run'}),n=0;while(!s.ended&&s.age<65&&n++<1000){if(s.encounter)s=acknowledge(s);else if(s.pending){const e=s.log.find(e=>e.id===s.pending);const chosen=choose(s,0);s=chosen===s?autoChoice(s):chosen;}else s=advance(s);}assert.ok(s.age>=60);assert.ok(s.relationship.marriedAt>=18);assert.ok(s.visited.length>1);assert.ok(s.log.filter(e=>e.choices).length>s.age*2);assert.ok(parseSave(JSON.stringify(s)));});
