// Design review screenshots (skipped in normal runs). Captures every main screen in desktop and mobile:
//   SCREENSHOTS=1 CHROMIUM_PATH=… npx playwright test screens   →   docs/screenshots/review/<project>-<screen>.png
import { test } from '@playwright/test';
import { createLife } from '../../src/engine.js';
import { recordLife, emptyLegacy, heritageFor, heirCandidates } from '../../src/sim/legacy.js';
import { play } from '../helpers.js';

test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture design review screenshots');
test.setTimeout(120000);

test('design review screens', async ({ page }, info) => {
  const out = name => ({ path: `docs/screenshots/review/${info.project.name}-${name}.png`, fullPage: true });
  const first = play(createLife({ seed: 'review-a', goal: 'champion' }), { until: s => s.ended });
  const second = play(createLife({ seed: 'review-b', heritage: heritageFor(first, heirCandidates(first)[0].uid), goal: 'coordinator' }), { until: s => s.ended });
  const legacy = recordLife(recordLife(emptyLegacy(), first), second);
  const mid = play(createLife({ seed: 'review-mid', goal: 'coordinator' }), { until: s => s.age >= 40 && s.pending && !s.encounter });
  const seed = (life, l = legacy) => page.addInitScript(([s, g]) => { localStorage.setItem('pokelife.story.v1', JSON.stringify(s)); localStorage.setItem('pokelife.legacy.v1', JSON.stringify(g)); }, [life, l]);
  await seed(mid);
  await page.goto('/');
  await page.screenshot(out('decision'));
  await page.getByRole('button', { name: '잠깐 숨기고 화면 보기' }).click();
  await page.screenshot(out('story'));
  for (const [tab, name] of [[/^포켓몬 도감/, 'dex'], [/^여행 기록$/, 'map'], [/^시뮬레이션 리포트$/, 'report'], [/^가문의 전당$/, 'hall']]) {
    await page.locator('.main-nav').getByRole('button', { name: tab }).click();
    await page.screenshot(out(name));
  }
  await page.locator('.main-nav').getByRole('button', { name: /^게임 화면$/ }).click();
  await page.locator('.hud-party').click();
  await page.screenshot(out('party-manager'));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '새로운 삶' }).click();
  await page.screenshot(out('new-life'));
  const ended = await page.context().newPage();
  await ended.addInitScript(([s, g]) => { localStorage.setItem('pokelife.story.v1', JSON.stringify(s)); localStorage.setItem('pokelife.legacy.v1', JSON.stringify(g)); }, [second, legacy]);
  await ended.goto('/');
  await ended.getByRole('button', { name: '최종 기록' }).click();
  for (const [tab, name] of [['엔딩 카드', 'ending-cards'], ['트레이너 카드', 'ending-trainer'], ['다음 세대', 'ending-heir']]) {
    await ended.getByRole('button', { name: tab, exact: true }).click();
    await ended.screenshot({ ...out(name), fullPage: false });
  }
});
