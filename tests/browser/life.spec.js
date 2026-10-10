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
