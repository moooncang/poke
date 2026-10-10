import { test, expect } from '@playwright/test';
import { createLife, advance, acknowledge, autoChoice } from '../../src/engine.js';
import { gameAction, maxHP } from '../../src/game.js';
function fixture(age,seed='browser-test',town='pallet') {let s=createLife({seed,town});while(s.age<age&&!s.ended)s=s.encounter?acknowledge(s):s.pending?autoChoice(s):advance(s);return s;}
function settled(age=18,town='pallet'){let s=fixture(age,'browser-test',town);while(s.pending||s.encounter)s=s.encounter?acknowledge(s):autoChoice(s);return s;}
async function load(page,state){await page.addInitScript(s=>{if(!sessionStorage.getItem('fixture-loaded')){localStorage.setItem('pokelife.story.v1',JSON.stringify(s));sessionStorage.setItem('fixture-loaded','yes');}},state);await page.goto('/');}
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('pokelife.story.v1')));}
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}

test('birth to partner, decision popup, save survives reload and layout fits',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('heading',{name:'유년기0세'})).toBeVisible();
 for(let i=0;i<6;i++)await page.getByRole('button',{name:'다음 해',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText('첫 파트너',{exact:true})).toBeVisible();await page.getByRole('button',{name:'확인 · 계속하기'}).click();await expect(page.locator('.party-slot')).toHaveCount(1);
 await page.getByRole('button',{name:'다음 해',exact:true}).click();await expect(page.getByRole('dialog',{name:'행동 선택'})).toBeVisible();await page.locator('.decision-options button').first().click();
 while(await page.getByRole('dialog',{name:'행동 선택'}).count())await page.locator('.decision-options button').last().click();await page.reload();expect((await saved(page)).age).toBe(7);await noOverflow(page);expect(errors).toEqual([]);
});

test('career popup changes income path; map travel, dex and archive work',async({page})=>{
 await load(page,fixture(16));await expect(page.getByRole('dialog',{name:'행동 선택'})).toBeVisible();await page.getByRole('button',{name:/연구원 작은 호기심/}).click();expect((await saved(page)).career).toBe('researcher');
 await page.getByRole('button',{name:'지방 이동',exact:true}).click();await page.getByRole('button',{name:'팔데아',exact:true}).click();await expect(page.getByRole('heading',{name:'테이블시티'})).toBeVisible();await page.locator('.travel-grid article').filter({has:page.getByRole('heading',{name:'테이블시티'})}).getByRole('button').click();expect((await saved(page)).town).toBe('mesagoza');
 await page.getByRole('button',{name:/포켓몬 도감/}).click();await page.locator('.dex-card').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:/주요 기록/}).click();await expect(page.getByRole('heading',{name:'주요 사건 기록'})).toBeVisible();await noOverflow(page);
});

test('keyboard and touch controls move character; buildings become usable on arrival',async({page})=>{
 await load(page,settled(12));const player=page.locator('.field-trainer');await expect(player).toHaveAttribute('data-x','8');await page.getByRole('button',{name:'오른쪽으로 이동'}).click();await expect(player).toHaveAttribute('data-x','9');await page.locator('.field-viewport').focus();await page.keyboard.press('ArrowLeft');await expect(player).toHaveAttribute('data-x','8');
 await page.getByRole('button',{name:'포켓몬센터',exact:true}).click();await expect(player).toHaveAttribute('data-y','4');const before=(await saved(page)).money;await page.getByRole('button',{name:/전원 회복/}).click();expect((await saved(page)).money).toBe(before-100);await noOverflow(page);
});

test('wild battle, turn actions, state reload and returning to field',async({page})=>{
 await load(page,settled(18));await page.getByRole('button',{name:/야생 배틀 포획 가능/}).click();await expect(page.getByRole('dialog',{name:'포켓몬 배틀'})).toBeVisible();await page.getByRole('button',{name:'방어 받는 피해 60% 감소'}).click();expect((await saved(page)).game.battle.turn).toBe(1);
 await page.reload();await expect(page.getByText('TURN 2')).toBeVisible();await page.getByRole('button',{name:'배틀 포기 보상 없이 필드로'}).click();await page.getByRole('button',{name:'필드로 돌아가기'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect((await saved(page)).game.ap).toBe(5);
});

test('mega cinematic sprite loads and only one transformation can be used',async({page})=>{
 let s=settled(18,'lumiose');s.party[0]={id:6,joined:6,shiny:false,xp:1000,hp:170};s.seen.push(6);s.money=3000;s.game.badges.kalos=1;s=gameAction(s,'unlock','mega');await load(page,s);await page.getByRole('button',{name:/야생 배틀 포획 가능/}).click();await page.getByRole('button',{name:'메가진화',exact:true}).click();
 await expect(page.locator('.player-mon')).toHaveAttribute('src',/forms\/10034.png/);await expect.poll(()=>page.locator('.player-mon').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);await expect(page.getByRole('button',{name:'메가진화',exact:true})).toBeDisabled();await noOverflow(page);
});

test('16x autoplay progresses despite walking and stops at a manual decision',async({page})=>{
 await page.clock.install();await load(page,settled(6));await page.getByRole('button',{name:'16×',exact:true}).click();await page.getByRole('button',{name:'자동 진행 시작'}).click();await page.clock.runFor(250);await expect(page.getByRole('dialog',{name:'행동 선택'})).toBeVisible();expect((await saved(page)).age).toBe(7);await page.clock.runFor(3000);expect((await saved(page)).age).toBe(7);
});

test('automatic decisions resolve successive popups at 16x',async({page})=>{
 await page.clock.install();await load(page,settled(6));await page.getByRole('checkbox',{name:'자동 결정',exact:true}).check();await page.getByRole('button',{name:'16×',exact:true}).click();await page.getByRole('button',{name:'자동 진행 시작'}).click();
 for(let i=0;i<20;i++)await page.clock.runFor(250);expect((await saved(page)).age).toBeGreaterThanOrEqual(9);
});

test('1x autoplay is not reset by moving character',async({page})=>{
 await page.clock.install();await load(page,settled(6));await page.getByRole('button',{name:'자동 진행 시작'}).click();for(let i=0;i<8;i++)await page.clock.runFor(500);expect((await saved(page)).age).toBe(7);
});

test('major NPC portrait loads and its encounter can be replayed',async({page})=>{
 await load(page,fixture(10));await expect(page.getByRole('heading',{name:'오박사'})).toBeVisible();await expect.poll(()=>page.getByRole('img',{name:'오박사'}).evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);await page.keyboard.press('Escape');await page.locator('.encounter-ticket').first().click();await expect(page.getByRole('button',{name:'다시 보기 종료'})).toBeVisible();
});

test('end of life reports actual age and downloads a complete log',async({page})=>{
 let s=createLife({seed:'ending'});while(!s.ended)s=s.encounter?acknowledge(s):s.pending?autoChoice(s):advance(s);await load(page,s);await page.getByRole('button',{name:'최종 기록',exact:true}).click();await expect(page.getByRole('dialog',{name:'인생 회고'})).toBeVisible();const download=page.waitForEvent('download');await page.getByRole('button',{name:'전체 기록 내려받기'}).click();expect((await download).suggestedFilename()).toContain(`-${s.age}.txt`);
});

test('new game can start in a newly added region',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'새로운 삶'}).click();await page.getByLabel('당신의 이름').fill('새봄');await page.getByLabel('태어날 마을').selectOption('postwick');await page.getByRole('button',{name:'게임 시작'}).click();expect((await saved(page)).hometown).toBe('postwick');await expect(page.getByRole('heading',{name:'새봄',exact:true})).toBeVisible();
});

test('gmax uses its form, expires after three turns, and restores normal HP',async({page})=>{
 let s=settled(18,'motostoke');s.party[0]={id:6,joined:6,shiny:false,xp:500,hp:110};s.seen.push(6);s.game.gear=['dynamax'];s.game.gmax=[6];s=gameAction(s,'gym');s.game.battle.id=129;s.game.battle.level=1;s.game.battle.hp=999;s.game.battle.maxHp=999;await load(page,s);
 await page.getByRole('button',{name:'거다이맥스',exact:true}).click();await expect(page.locator('.player-mon')).toHaveAttribute('src',/forms\/10196.png/);await expect.poll(()=>page.locator('.player-mon').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'방어 받는 피해 60% 감소'}).click();expect((await saved(page)).game.battle.form).toBeNull();await expect(page.locator('.player-mon')).toHaveAttribute('src',/front\/6.png/);
});

test('legendary artwork loads, reduced motion is honored, dialog can close',async({page})=>{
 let found;for(let i=0;i<30&&!found;i++){let s=createLife({seed:`cinema-${i}`,town:'mesagoza'});while(!s.ended){s=s.encounter?acknowledge(s):s.pending?autoChoice(s):advance(s);if(s.encounter?.type==='legendary'){found=s;break;}}}
 expect(found).toBeTruthy();await page.emulateMedia({reducedMotion:'reduce'});await load(page,found);await expect(page.locator('.encounter-backdrop.legendary')).toBeVisible();const img=page.locator('.encounter-pokemon');await expect.poll(()=>img.evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);expect(parseFloat(await img.evaluate(el=>getComputedStyle(el).animationDuration))).toBeLessThan(.01);await page.getByRole('button',{name:'확인 · 계속하기'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
