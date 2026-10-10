import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,parseSave} from '../src/engine.js';
test('selected gender is saved without changing birth conditions or stats',()=>{
 const male=createLife({seed:'profile',gender:'male'}),female=createLife({seed:'profile',gender:'female'});
 assert.equal(male.gender,'male');assert.equal(female.gender,'female');
 assert.deepEqual({...male,gender:'female'},female);assert.deepEqual(parseSave(JSON.stringify(female)),female);
 assert.equal(createLife({seed:'profile'}).gender,createLife({seed:'profile'}).gender);
 assert.equal(createLife({gender:'unspecified'}).gender,'unspecified');
});
test('older profiles retain their data and migrate to unspecified gender',()=>{
 const s=createLife({seed:'legacy-profile'});delete s.gender;
 assert.deepEqual(parseSave(JSON.stringify(s)),{...s,gender:'unspecified'});
 assert.equal(parseSave(JSON.stringify({...s,gender:'invalid'})),null);
});
