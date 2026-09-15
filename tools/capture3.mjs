// capture3.mjs — third visual pass: mid-drag dimming, stills mid-drag bleed, motion idle chrome,
// reduced-motion resting states, deep-linked filter.
import { chromium } from '/Users/fakhrul/Desktop/dev/Shoal/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, base, out] = process.argv;
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/Users/fakhrul/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
async function ctx(w, h, extra = {}) { const c = await browser.newContext({ viewport: { width: w, height: h }, ...extra }); return [c, await c.newPage()]; }
const enter = async (page) => { await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForSelector('.loader-actions.is-ready', { timeout: 15000 }); await page.locator('.loader-enter-quiet').click(); await page.waitForSelector('.landing.is-ready', { timeout: 15000 }); await sleep(4500); };
{
  const [c, page] = await ctx(1440, 900);
  const shot = (n) => page.screenshot({ path: `${out}/${n}-1440.png` });
  await enter(page);
  await page.mouse.move(900, 450); await page.mouse.down(); await page.mouse.move(700, 450, { steps: 4 }); await sleep(400); await shot('slider-dragging');
  await page.mouse.up(); await sleep(2500);
  await page.goto(base + '/?filter=motion', { waitUntil: 'load' }); await page.waitForSelector('.landing.is-ready', { timeout: 15000 }); await sleep(4500); await shot('deeplink-motion');
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(2500);
  await page.mouse.move(900, 450); await page.mouse.down(); await page.mouse.move(760, 450, { steps: 4 }); await sleep(300); await shot('stills-dragging');
  await page.mouse.up(); await sleep(1500);
  await page.goto(base + '/project/netflix-comic-con-cpt', { waitUntil: 'load' }); await sleep(2500);
  await page.mouse.move(720, 450); await sleep(300); await shot('motion-play-hint');
  await page.mouse.click(720, 450); await sleep(6500); await shot('motion-idle');
  await c.close();
}
{
  const [c, page] = await ctx(1440, 900, { reducedMotion: 'reduce' });
  const shot = (n) => page.screenshot({ path: `${out}/${n}-1440.png` });
  await enter(page); await shot('rm-slider');
  await page.goto(base + '/about', { waitUntil: 'load' }); await sleep(1500); await shot('rm-about');
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(1500); await shot('rm-project');
  await c.close();
}
await browser.close();
console.log('done', out);
