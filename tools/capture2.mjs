// capture2.mjs — second visual pass: interaction states (hover rolls, nav drop, zoom, mobile menu,
// motion end card, mid-iris frame, filter meta, loader ready state).
import { chromium } from '/Users/fakhrul/Desktop/dev/Shoal/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, base, out] = process.argv;
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/Users/fakhrul/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
async function ctx(w, h) { const c = await browser.newContext({ viewport: { width: w, height: h } }); return [c, await c.newPage()]; }
{
  const [c, page] = await ctx(1440, 900);
  const shot = (n) => page.screenshot({ path: `${out}/${n}-1440.png` });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('.loader-actions.is-ready', { timeout: 15000 }); await sleep(800);
  await shot('loader-ready');
  await page.hover('.loader-enter'); await sleep(600); await shot('loader-hover');
  await page.locator('.loader-enter-quiet').click();
  await page.waitForSelector('.landing.is-ready', { timeout: 15000 }); await sleep(4500);
  await page.hover('.nav-drop a >> nth=1'); await sleep(600); await shot('nav-hover');
  await page.hover('.view-toggle button >> nth=2'); await sleep(600); await shot('toggle-hover');
  await page.mouse.move(720, 450); await sleep(300);
  await page.locator('.nav-drop a').nth(1).click(); await sleep(2600); await shot('filter-motion');
  await page.locator('.view-toggle button').nth(1).click(); await sleep(4200); await shot('grid-motion');
  await page.keyboard.press('Enter'); await sleep(450); await shot('iris-mid');
  await page.waitForSelector('.detail', { timeout: 10000 }); await sleep(3500); await shot('project-from-iris');
  await c.close();
}
{
  const [c, page] = await ctx(1440, 900);
  const shot = (n) => page.screenshot({ path: `${out}/${n}-1440.png` });
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(2500);
  await page.hover('.detail-nav-works'); await sleep(700); await shot('project-nav-drop');
  await page.mouse.move(720, 450); await sleep(200); await page.mouse.click(720, 450); await sleep(2200); await shot('project-zoomed');
  await page.mouse.move(1300, 450); await sleep(300); await shot('project-zoomed-next-hint');
  await page.keyboard.press('Escape'); await sleep(2200);
  for (let i = 0; i < 9; i++) { await page.keyboard.press('ArrowRight'); await sleep(250); } await sleep(1500); await shot('project-end');
  await page.goto(base + '/project/netflix-comic-con-cpt', { waitUntil: 'load' }); await sleep(2500);
  await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = Math.max(0, (v.duration || 85) - 0.2); v.play().catch(() => {}); }); await sleep(2500); await shot('motion-end');
  await page.goto(base + '/about', { waitUntil: 'load' }); await sleep(2500);
  await page.hover('.nav-filters'); await sleep(700); await shot('about-nav-drop');
  await page.hover('.studio-social-email'); await sleep(600); await shot('about-hover-email');
  await c.close();
}
{
  const [c, page] = await ctx(390, 844);
  const shot = (n) => page.screenshot({ path: `${out}/${n}-390.png` });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('.loader-actions.is-ready', { timeout: 15000 });
  await page.locator('.loader-enter-quiet').click();
  await page.waitForSelector('.landing.is-ready', { timeout: 15000 }); await sleep(4500);
  await page.locator('.menu-btn').click(); await sleep(500); await shot('menu-open');
  await page.locator('.menu-items a').nth(2).click(); await sleep(2600); await shot('filter-motion');
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(2500);
  await page.locator('.detail-menu-btn').click(); await sleep(500); await shot('project-menu');
  await page.goto(base + '/project/netflix-comic-con-cpt', { waitUntil: 'load' }); await sleep(2500);
  await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = Math.max(0, (v.duration || 85) - 0.2); v.play().catch(() => {}); }); await sleep(2500); await shot('motion-end');
  await c.close();
}
await browser.close();
console.log('done', out);
