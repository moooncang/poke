import { test, expect } from '@playwright/test';
import { createLife, advance, acknowledge, autoChoice } from '../../src/engine.js';

function fixture(age, seed = 'browser-test') {
  let s = createLife({ seed, town: 'pallet' });
  while (s.age < age) s = s.encounter ? acknowledge(s) : s.pending ? autoChoice(s) : advance(s);
  return s;
}
async function load(page, state) {
  await page.addInitScript(s => { localStorage.setItem('pokelife.story.v1', JSON.stringify(s)); }, state);
  await page.goto('/');
}

test('birth to first partner, cinematic pauses, save survives reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '작은 시작0세' })).toBeVisible();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '다음 이야기', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('우리의 첫 만남', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '이 순간을 마음에 담기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('나의 첫 파트너 · 함께한 지 0년')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '자라나는 계절6세' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('career choice resolves and map, dex, memories work', async ({ page }) => {
  await load(page, fixture(16));
  await expect(page.getByRole('button', {name: '다음 이야기',exact:true})).toBeDisabled();
  await page.getByRole('button', { name: '연구원 작은 호기심에서 시작되는 발견' }).click();
  await expect(page.getByText('포켓몬 생태 연구원', {exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name: '다음 이야기',exact:true})).toBeEnabled();
  await page.getByRole('button', {name: /만난 포켓몬/}).click();
  await expect(page.getByRole('heading', {name:'우리의 길에서 만난 친구들'})).toBeVisible();
  await page.locator('.dex-card').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', {name:'닫기',exact:true}).click();
  await page.getByRole('button', {name:'세계 지도',exact:true}).click();
  await page.getByRole('button', {name:'호연지방',exact:true}).click();
  await expect(page.getByText('미로마을',{exact:true})).toBeVisible();
  await page.getByRole('button', {name:/소중한 기억/}).click();
  await expect(page.getByRole('heading', {name:'오래도록 빛나는 순간들'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('major NPC cinematic shows portrait and can be replayed', async ({ page }) => {
  await load(page, fixture(10));
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', {name:'오박사'})).toBeVisible();
  await expect(dialog.getByRole('img', {name:'오박사'})).toBeVisible();
  await expect.poll(() => dialog.getByRole('img', {name:'오박사'}).evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.locator('.encounter-ticket').first().click();
  await expect(page.getByRole('button', {name:'기억을 덮어두기'})).toBeVisible();
});

test('legendary scene uses real artwork and supports reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let state;
  for (let i = 0; i < 40 && !state; i++) {
    let s = createLife({seed:`legend-browser-${i}`,town:'littleroot'});
    while (!s.ended) {
      s = s.encounter ? acknowledge(s) : s.pending ? autoChoice(s) : advance(s);
      if (s.encounter?.type === 'legendary') {state=s;break;}
    }
  }
  expect(state).toBeTruthy();
  await load(page, state);
  await expect(page.locator('.encounter-backdrop.legendary')).toBeVisible();
  const img = page.locator('.encounter-pokemon');
  await expect.poll(() => img.evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
  const duration = await img.evaluate(el=>getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(.01);
  await page.getByRole('button',{name:'이 순간을 마음에 담기'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('complete life offers an actual downloadable memoir', async ({ page }) => {
  await load(page, fixture(80));
  await page.getByRole('button', { name: '내 삶 돌아보기' }).click();
  await expect(page.getByRole('dialog', {name:'인생 회고'})).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'나의 연대기 간직하기'}).click();
  expect((await download).suggestedFilename()).toMatch(/80\.txt$/);
});

test('a new life uses the entered name and selected hometown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'새로운 삶'}).click();
  await page.getByLabel('당신의 이름').fill('노을');
  await page.getByLabel('태어날 마을').selectOption('littleroot');
  await page.getByRole('button',{name:'나의 이야기 시작하기'}).click();
  await expect(page.getByRole('heading',{name:'노을 0세'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokelife.story.v1')).hometown)).toBe('littleroot');
});

test('autoplay advances time but waits for a life decision', async ({ page }) => {
  await page.clock.install();
  await load(page, acknowledge(fixture(15)));
  await page.getByRole('button',{name:'자동 진행 시작'}).click();
  await page.clock.runFor(3700);
  await expect(page.getByRole('heading',{name:'당신은 어떤 어른이 되고 싶나요?'})).toBeVisible();
  await expect(page.getByRole('button',{name:'자동 진행 시작'})).toBeDisabled();
  await page.clock.runFor(15000);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokelife.story.v1')).age)).toBe(16);
  await page.getByRole('button',{name:'연구원 작은 호기심에서 시작되는 발견'}).click();
  await page.getByRole('button',{name:'자동 진행 시작'}).click();
  await page.clock.runFor(3700);
  await expect(page.getByRole('heading',{name:'세상을 향해서17세'})).toBeVisible();
  await expect.poll(() => page.evaluate(()=>JSON.parse(localStorage.getItem('pokelife.story.v1')).age)).toBe(17);
});
