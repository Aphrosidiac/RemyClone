// capture.mjs — screenshot a site (reference or ours) in every state, at fixed widths.
//   node tools/capture.mjs <baseUrl> <outDir> [widths]
import { chromium } from '/Users/fakhrul/Desktop/dev/Shoal/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, base='https://www.remyshoots.co.za', out='docs/reference/2026-09-15/shots', widthsArg='1440x900,390x844'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const sizes = widthsArg.split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch({ executablePath: '/Users/fakhrul/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const shot = (name) => page.screenshot({ path: `${out}/${name}-${w}.png` });
  const enter = async () => {
    await page.goto(base + '/', { waitUntil: 'load' });
    await sleep(1500);
    await shot('loader');
    await page.locator('.loader-enter-quiet').click();
    await sleep(6000);
  };
  await enter();
  await shot('slider');
  if (w > 760) {
    await page.locator('.view-toggle button').nth(1).click(); await sleep(4500); await shot('grid');
    await page.locator('.view-toggle button').nth(2).click(); await sleep(4500); await shot('list');
    await page.locator('.view-toggle button').nth(0).click(); await sleep(4500);
  }
  // filters
  await page.locator('.nav-drop a').first().click({ force: true }).catch(()=>{}); await sleep(3000); await shot('slider-stills');
  // hover the works nav to show drop
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(2500); await shot('project-stills');
  await page.mouse.move(w/2, h/2); await sleep(300); await shot('project-stills-hover');
  await page.goto(base + '/project/netflix-comic-con-cpt', { waitUntil: 'load' }); await sleep(4000); await shot('project-motion');
  await page.goto(base + '/about', { waitUntil: 'load' }); await sleep(2500); await shot('about');
  await page.goto(base + '/does-not-exist', { waitUntil: 'load' }); await sleep(2500); await shot('notfound');
  await ctx.close();
}
await browser.close();
console.log('captured to', out);
