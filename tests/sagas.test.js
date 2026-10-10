import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,choose,parseSave} from '../src/engine.js';
import {CAREER_SAGAS} from '../src/data/career-sagas.js';
import {LEAGUE_SAGAS,LEAGUE_REGIONS} from '../src/data/league-sagas.js';
import {addPokemon} from '../src/sim/party.js';
import {TOWNS} from '../src/data/world.js';
import {present} from './helpers.js';
function state(){const s=createLife({seed:'saga-tests',town:'pallet'});s.age=35;s.money=6000;s.career='traveler';s.reputation=50;addPokemon(s,149,{xp:2375,origin:'partner'});addPokemon(s,6,{xp:2375});addPokemon(s,9,{xp:2375});s.encounter=null;return s;}
test('all 186 new events have free choices and every branch preserves saves',()=>{
 for(const st of [...CAREER_SAGAS,...LEAGUE_SAGAS]){
  const base=state(),region=LEAGUE_REGIONS.find(r=>st.id.startsWith(`league-${r.id}-`));
  if(region){base.town=TOWNS.find(t=>t.map===region.id).id;base.visited.push(base.town);base.visited=[...new Set(base.visited)];}
  const event=st.build(base);assert.ok(event.choices.some(c=>!c.cost));
  for(let index=0;index<event.choices.length;index++){
   const input=present(structuredClone(base),structuredClone(event));assert.ok(parseSave(JSON.stringify(input)),`${st.id} pending`);
   const output=choose(input,index);assert.ok(parseSave(JSON.stringify(output)),`${st.id} option ${index}`);
  }
 }
 assert.equal(CAREER_SAGAS.length+LEAGUE_SAGAS.length,186);
});
test('career chapters require prior success and elapsed years, withdrawal closes only that project',()=>{
 const s=state(),[first,second,third]=CAREER_SAGAS;
 assert.ok(first.when(s));assert.ok(!second.when(s));s.stats.courage=100;s.rng=1;
 const passed=choose(present(s,first.build(s)),0);assert.ok(passed.flags[first.id]);passed.cooldowns[first.id]=35;
 assert.ok(!second.when(passed));passed.age=37;assert.ok(second.when(passed));assert.ok(!third.when(passed));
 const stopped=choose(present(passed,second.build(passed)),2);assert.ok(!second.when(stopped));assert.ok(!third.when(stopped));assert.equal(stopped.career,'traveler');
});
test('champion cannot be skipped and a loss never grants a title; cleared stages survive',()=>{
 const s=state(),final=LEAGUE_SAGAS.find(x=>x.id==='league-kanto-final');
 assert.ok(!final.when(s));s.flags['league-kanto-licensed']=true;s.flags['league-kanto-elite-3']=true;assert.ok(final.when(s));
 s.party=[s.party[0]];s.party[0].id=129;s.party[0].xp=0;
 const lost=choose(present(s,final.build(s)),0);assert.ok(!lost.flags['league-kanto-champion']);assert.ok(lost.flags['league-kanto-elite-3']);assert.ok(final.when(lost));assert.equal(lost.money,s.money);assert.ok(!lost.seeds.some(x=>x.id==='hall-of-fame'));
});
test('all victories are required, rewards occur once, and saved final rounds are deterministic',()=>{
 const s=state(),event={kind:'choice',title:'연전 검증',body:'검증',choices:[{label:'출전',description:'3연전',effects:{},outcome:'출전했다.',battle:{kind:'league',level:5,opponents:[10,13,129]},after:{win:{flag:'test-series-win'},lose:{effects:{joy:-1}}}}]};
 const pending=present(s,event),saved=parseSave(JSON.stringify(pending));assert.ok(saved);
 const won=choose(pending,0);assert.deepEqual(won,choose(saved,0));assert.ok(won.flags['test-series-win']);assert.equal(won.money,s.money+1200);assert.equal(won.game.wins,s.game.wins+3);
 assert.equal(choose(won,0),won);
 pending.log.at(-1).choices[0].battle.opponents=[];assert.equal(parseSave(JSON.stringify(pending)),null);
});
test('champion victory schedules the hall of fame and opens post-title stories',()=>{
 const s=state();s.flags['league-kanto-licensed']=true;s.flags['league-kanto-elite-3']=true;s.rng=1;
 const final=LEAGUE_SAGAS.find(x=>x.id==='league-kanto-final');const won=choose(present(s,final.build(s)),0);
 assert.ok(won.flags['league-kanto-champion']);assert.ok(won.seeds.some(x=>x.id==='hall-of-fame'));assert.ok(!final.when(won));
 assert.ok(LEAGUE_SAGAS.find(x=>x.id==='league-kanto-defence').when(won));assert.ok(parseSave(JSON.stringify(won)));
});
