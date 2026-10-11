import { test, expect } from '@playwright/test';
import { createLife } from '../../src/engine.js';
import { play } from '../helpers.js';

const atDecision = (seed, age) => play(createLife({ seed }), { until: s => s.age >= age && Boolean(s.pending) && !s.encounter });
const load = (page, state) => page.addInitScript(s => localStorage.setItem('pokelife.story.v1', JSON.stringify(s)), state);

test('birth report shows randomly allocated circumstances and no manual controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: '출생 배정 결과' })).toBeVisible();
  await expect(page.getByText('경제적 형편', { exact: true })).toBeVisible();
  await expect(page.getByText('소꿉친구', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '이 삶 시작하기' }).click();
  await expect(page.getByRole('button', { name: '3×', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /야생 배틀/ })).toHaveCount(0);
});

test('selecting a decision resumes automatic progression', async ({ page }) => {
  await page.clock.install();
  const state = atDecision('resume', 8);
  await load(page, state);
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: '행동 선택' })).toBeVisible();
  await page.locator('.decision-options button:not([disabled])').first().click();
  for (let tick = 0; tick < 3; tick++) await page.clock.runFor(3700);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).log.length)).toBeGreaterThan(state.log.length + 1);
});

test('a hidden decision lets the player browse other tabs and then return', async ({ page }) => {
  await load(page, atDecision('browse', 30));
  await page.goto('/');
  await page.getByRole('button', { name: '잠깐 숨기고 화면 보기' }).click();
  await page.getByRole('button', { name: '여행 기록', exact: true }).click();
  await expect(page.getByRole('heading', { name: '여행 기록과 세계 정세' })).toBeVisible();
  await page.getByRole('button', { name: /선택지 다시 열기/ }).click();
  await expect(page.getByRole('dialog', { name: '행동 선택' })).toBeVisible();
});

test('the sidebar shows the world, the people around the player and the PC box without horizontal scroll', async ({ page }) => {
  await load(page, atDecision('sidebar', 30));
  await page.goto('/');
  await page.getByRole('button', { name: '잠깐 숨기고 화면 보기' }).click();
  await expect(page.getByRole('heading', { name: /지방 정세$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '인연' })).toBeVisible();
  await expect(page.getByText(/PC 박스 · \d+마리/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the trainer HUD keeps money and stats visible, and the party can be managed', async ({ page }) => {
  const state = atDecision('hud', 30);
  await load(page, state);
  await page.goto('/');
  await page.getByRole('button', { name: '잠깐 숨기고 화면 보기' }).click();
  const hud = page.getByRole('region', { name: '트레이너 요약' });
  await expect(hud.getByText(`${state.money.toLocaleString()}P`)).toBeVisible();
  await expect(hud.locator('.hud-stat')).toHaveCount(5);
  await expect(hud.locator('.hud-stat[data-stat="vitality"] b')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await hud.getByRole('button', { name: /파티 관리/ }).click();
  const dialog = page.getByRole('dialog', { name: '파티 관리' });
  await expect(dialog).toBeVisible();
  await dialog.getByText('직접 편성', { exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).partyPlan.mode)).toBe('manual');
  if (state.party.length > 1 && !state.party[1].locked) {
    await dialog.locator('.pm-member').nth(1).getByRole('button', { name: /선두로/ }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).party[0].uid)).toBe(state.party[1].uid);
  }
});

test('a finished life records ending cards and hands an egg to the next generation', async ({ page }) => {
  const finished = play(createLife({ seed: 'browser-ending' }), { until: s => s.ended });
  await load(page, finished);
  await page.goto('/');
  await page.getByRole('button', { name: '최종 기록' }).click();
  const archive = page.getByRole('dialog', { name: '생애 기록관' });
  await expect(archive.locator('.ending-card').first()).toBeVisible();
  await archive.getByRole('button', { name: '트레이너 카드' }).click();
  await expect(archive.locator('.trainer-card')).toBeVisible();
  await archive.getByRole('button', { name: '다음 세대' }).click();
  await archive.locator('.heir-option button').first().click();
  await expect(archive.locator('.heir-chosen')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.legacy.v1')).lives.length)).toBe(1);
  await archive.getByRole('button', { name: /새 삶 시작/ }).click();
  const form = page.getByRole('dialog', { name: '새로운 삶 시작하기' });
  await expect(form.locator('.heir-toggle')).toBeVisible();
  await form.getByRole('button', { name: /게임 시작/ }).click();
  await expect(page.getByRole('dialog', { name: '출생 배정 결과' }).getByText(/의 알 · /)).toBeVisible();
  await page.getByRole('button', { name: '이 삶 시작하기' }).click();
  await page.getByRole('button', { name: '가문의 전당', exact: true }).click();
  await expect(page.locator('.legacy-life')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.legacy.v1')).heir)).toBe(null);
});

test('the simulation report draws the life graphs, decisions and companion stories', async ({ page }) => {
  const state = atDecision('report', 40);
  await load(page, state);
  await page.goto('/');
  await page.getByRole('button', { name: '잠깐 숨기고 화면 보기' }).click();
  await page.getByRole('button', { name: '시뮬레이션 리포트', exact: true }).click();
  await expect(page.getByRole('heading', { name: '시뮬레이션 리포트' })).toBeVisible();
  await expect(page.locator('.report-chart svg polyline').first()).toBeVisible();
  await expect(page.locator('.report-numbers li')).toHaveCount(7);
  await page.locator('.member-rename input').fill('번개');
  await page.locator('.member-rename button').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).party.concat(JSON.parse(localStorage.getItem('pokelife.story.v1')).box).some(m => m.nickname === '번개'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a new life can take challenge rules', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '이 삶 시작하기' }).click();
  await page.getByRole('button', { name: '새로운 삶' }).click();
  const form = page.getByRole('dialog', { name: '새로운 삶 시작하기' });
  await form.locator('.rule-picker li').filter({ hasText: '무일푼 출발' }).locator('input').check();
  await expect(form.locator('.perk-picker li[data-unlocked="false"]').first()).toBeVisible();
  await form.getByRole('button', { name: /게임 시작/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).rules)).toEqual(['poor']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).money)).toBe(0);
});

test('the character card shows job, place and standing; keyboard shortcuts pick choices and skip ahead', async ({ page }) => {
  const state = atDecision('standing', 30);
  await load(page, state);
  await page.goto('/');
  const card = page.getByRole('region', { name: '인물 카드' });
  await expect(card.locator('.cc-name')).toHaveText(state.name);
  await expect(card.locator('.cc-place')).toContainText('·');
  await page.keyboard.press('1');
  await expect(page.getByRole('dialog', { name: '행동 선택' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1')).pending)).toBe(null);
  await page.keyboard.press(' ');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('pokelife.story.v1')); return Boolean(s.pending || s.encounter || s.ended); }), { timeout: 15000 }).toBe(true);
});

test('save slots keep separate lives', async ({ page }) => {
  const state = atDecision('slots', 25);
  await load(page, state);
  await page.goto('/');
  await page.getByRole('button', { name: '잠깐 숨기고 화면 보기' }).click();
  await page.getByRole('button', { name: '설정' }).click();
  const dialog = page.getByRole('dialog', { name: '게임 설정' });
  await dialog.locator('.slot').nth(1).getByRole('button', { name: '여기에 저장' }).click();
  await expect(dialog.locator('.slot').nth(1)).toHaveAttribute('data-filled', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pokelife.story.v1.slot2')).seed)).toBe(state.seed);
  await dialog.locator('.slot').nth(1).getByRole('button', { name: '불러오기' }).click();
  await expect(page.getByRole('dialog', { name: '게임 설정' })).toHaveCount(0);
});
