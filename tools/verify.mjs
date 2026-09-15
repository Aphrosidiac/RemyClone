// verify.mjs — drive the site through its flows headlessly and print what the DOM says.
//   node tools/verify.mjs <baseUrl> [out.json]
// Run against the reference and against ours; the two outputs should agree on every field
// except the brand strings and asset URLs.
import { chromium } from '/Users/fakhrul/Desktop/dev/Shoal/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, base='http://localhost:3150', out] = process.argv;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/Users/fakhrul/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const R = {};
const errors = [];
async function run(name, w, h, fn) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: console ${m.text().slice(0, 160)}`); });
  try { R[name] = await fn(page); } catch (e) { R[name] = { error: String(e.message).slice(0, 200) }; }
  await ctx.close();
}
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
const cls = (page, sel) => page.evaluate((s) => document.querySelector(s)?.className ?? null, sel);
const enter = async (page) => {
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('.loader-actions.is-ready', { timeout: 15000 });
  await page.locator('.loader-enter-quiet').click();
  await page.waitForSelector('.landing.is-ready', { timeout: 15000 });
  await sleep(4500);
};

await run('landing', 1440, 900, async (page) => {
  const r = {};
  await page.goto(base + '/', { waitUntil: 'load' });
  r.loaderTitleVisible = await page.evaluate(() => getComputedStyle(document.querySelector('.loader-title')).opacity);
  const t0 = Date.now();
  await page.waitForSelector('.loader-actions.is-ready', { timeout: 15000 });
  r.loaderReadyMs = Date.now() - t0;
  r.pct = await q(page, '.loader-pct');
  await page.locator('.loader-enter-quiet').click();
  await page.waitForSelector('.landing.is-ready', { timeout: 15000 });
  await sleep(4500);
  r.landingClass = await cls(page, '.landing');
  r.loaderGone = await page.evaluate(() => !document.querySelector('.loader') || getComputedStyle(document.querySelector('.loader')).display === 'none');
  r.meta = [await q(page, '.meta-index .meta'), await q(page, '.meta-name .meta'), await q(page, '.meta-type .meta'), await q(page, '.meta-tag .meta')];
  r.metaOpacityInSlider = await page.evaluate(() => getComputedStyle(document.querySelector('.meta-name .meta')).transform);
  r.tickName = await page.evaluate(() => [...document.querySelectorAll('.tick-group')].filter(g => g.style.visibility === 'visible' && parseFloat(g.querySelector('.tick-name').style.opacity) > 0.9).map(g => g.querySelector('.tick-name').textContent));
  r.canvas = await page.evaluate(() => { const c = document.querySelector('.slider-view canvas'); return c ? [c.width, c.height, c.dataset.engine] : null; });
  r.frameloop = await page.evaluate(() => document.querySelector('.slider-view')?.dataset.frameloop);
  r.chromeText = await page.evaluate(() => [...document.querySelectorAll('.chrome .roll-face:first-child, .view-toggle .roll-face:first-child, .trusted .roll-face:first-child, .sound-toggle .roll-face:first-child, .hand-toggle .roll-face:first-child')].map(e => e.textContent));
  r.toggleCaretX = await page.evaluate(() => Math.round(document.querySelector('.toggle-caret').getBoundingClientRect().left));
  r.navCaretX = await page.evaluate(() => Math.round(document.querySelector('.nav-site-caret').getBoundingClientRect().left));
  // arrow key steps
  await page.keyboard.press('ArrowRight'); await sleep(1500);
  r.metaAfterRight = [await q(page, '.meta-index .meta'), await q(page, '.meta-name .meta')];
  await page.keyboard.press('ArrowLeft'); await sleep(1500);
  r.metaAfterLeft = await q(page, '.meta-index .meta');
  // wheel
  await page.mouse.move(720, 450); await page.mouse.wheel(0, 600); await sleep(1800);
  r.metaAfterWheel = await q(page, '.meta-index .meta');
  // drag
  await page.mouse.move(900, 450); await page.mouse.down(); await page.mouse.move(300, 450, { steps: 12 }); await page.mouse.up(); await sleep(2000);
  r.metaAfterDrag = await q(page, '.meta-index .meta');
  // grid
  await page.locator('.view-toggle button').nth(1).click(); await sleep(300);
  r.morphClass = await cls(page, '.landing');
  await sleep(3500);
  r.gridClass = await cls(page, '.landing');
  r.gridTickers = await page.evaluate(() => ['top','bottom','left','right'].map(s => [...document.querySelectorAll(`.gticker-${s} .gtick-group`)].filter(g => g.style.visibility === 'visible').length));
  r.metaTransformInGrid = await page.evaluate(() => getComputedStyle(document.querySelector('.meta-name .meta')).transform);
  r.gridToggleCaretX = await page.evaluate(() => Math.round(document.querySelector('.toggle-caret').getBoundingClientRect().left));
  await page.keyboard.press('ArrowDown'); await sleep(1500);
  r.gridMetaAfterDown = await q(page, '.meta-index .meta');
  // list
  await page.locator('.view-toggle button').nth(2).click(); await sleep(4000);
  r.listClass = await cls(page, '.landing');
  r.listRails = await page.evaluate(() => [...document.querySelectorAll('.vticker .vtick-group')].filter(g => g.style.visibility === 'visible').length);
  r.listCaretX = await page.evaluate(() => Math.round(document.querySelector('.vticker-caret').getBoundingClientRect().left));
  await page.keyboard.press('ArrowDown'); await sleep(1500);
  r.listMetaAfterDown = await q(page, '.meta-index .meta');
  // back to slider
  await page.locator('.view-toggle button').nth(0).click(); await sleep(4000);
  r.sliderAgain = await cls(page, '.landing');
  // filter
  await page.locator('.nav-drop a').first().click(); await sleep(2500);
  r.filterMeta = [await q(page, '.meta-index .meta'), await q(page, '.meta-type .meta')];
  r.filterCurrent = await page.evaluate(() => document.querySelector('.nav-filters a.is-current')?.textContent);
  r.filterNavCaretX = await page.evaluate(() => Math.round(document.querySelector('.nav-site-caret').getBoundingClientRect().left));
  r.tickTypes = await page.evaluate(() => [...new Set([...document.querySelectorAll('.tick-group')].filter(g => g.style.visibility === 'visible').map(g => g.querySelector('.tm-type').textContent.replace(/\[.*/, '')))]);
  await page.locator('.nav-drop a').nth(1).click(); await sleep(2500);
  r.motionMeta = await q(page, '.meta-type .meta');
  r.previewVideo = await page.evaluate(() => { const v = [...document.querySelectorAll('body > video')].pop(); return v ? { paused: v.paused, t: Math.round(v.currentTime), src: v.currentSrc.split('/').pop().slice(0, 30) } : null; });
  await page.locator('.nav-works-row a').click(); await sleep(2500);
  r.worksMeta = await q(page, '.meta-index .meta');
  // fisheye
  await page.locator('.fisheye-toggle').click(); await sleep(2200);
  r.lens = await page.evaluate(() => [document.querySelector('.landing').style.getPropertyValue('--lens-amount'), !!document.querySelector('.stage-vignette'), document.querySelector('.fisheye-toggle').getAttribute('aria-pressed'), document.querySelector('.fisheye-toggle .roll-face').textContent]);
  await page.locator('.fisheye-toggle').click(); await sleep(2200);
  r.lensOff = await page.evaluate(() => [document.querySelector('.landing').style.getPropertyValue('--lens-amount'), !!document.querySelector('.stage-vignette')]);
  // sound
  await page.locator('.sound-toggle').click(); await sleep(300);
  r.sound = await q(page, '.sound-toggle .roll-face');
  // open project via Enter
  await page.keyboard.press('Enter'); await sleep(400);
  r.irisDuringNav = await page.evaluate(() => getComputedStyle(document.querySelector('.iris-layer')).display);
  await page.waitForSelector('.detail', { timeout: 10000 }); await sleep(3000);
  r.projectUrl = page.url().replace(base, '');
  r.irisAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.iris-layer')).display);
  r.detailChromeOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.detail-chrome')).opacity);
  r.detailTitle = await q(page, '.detail-title h1');
  return r;
});

await run('project-stills', 1440, 900, async (page) => {
  const r = {};
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(2500);
  r.count = [await q(page, '.detail-count p'), await q(page, '.detail-count-total')];
  r.cells = await page.evaluate(() => [...document.querySelectorAll('.detail-cell')].filter(c => c.style.visibility === 'visible').map(c => [Math.round(parseFloat(c.style.width)), Math.round(parseFloat(c.style.height)), c.style.transform.match(/translate3d\(([-\d.]+)px/)?.[1] | 0]));
  r.nextCell = await q(page, '.detail-next .detail-next-name');
  await page.keyboard.press('ArrowRight'); await sleep(1500);
  r.countAfterRight = await q(page, '.detail-count p');
  r.headX = await page.evaluate(() => document.querySelector('.detail-head').style.transform);
  await page.mouse.move(720, 450); await sleep(200);
  r.zoomHint = await page.evaluate(() => [document.querySelector('.detail-zoom-hint').textContent, document.querySelector('.detail-zoom-hint').className]);
  await page.mouse.click(720, 450); await sleep(2000);
  r.zoomed = await cls(page, '.detail');
  r.zoomCell = await page.evaluate(() => { const c = [...document.querySelectorAll('.detail-cell')].find(c => c.style.visibility === 'visible' && Math.abs(parseFloat(c.style.transform.match(/translate3d\(([-\d.]+)px/)[1]) + parseFloat(c.style.width)/2 - innerWidth/2) < 5); return c ? [Math.round(parseFloat(c.style.width)), Math.round(parseFloat(c.style.height))] : null; });
  r.zoomBtn = await q(page, '.detail-fullscreen .roll-face');
  await page.keyboard.press('Escape'); await sleep(2000);
  r.unzoomed = await cls(page, '.detail');
  // wheel to the end and beyond → next project
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(300, 0); await sleep(120); }
  await sleep(1500);
  r.countNearEnd = await q(page, '.detail-count p');
  await page.keyboard.press('ArrowRight'); await sleep(800); await page.keyboard.press('ArrowRight'); await sleep(3500);
  r.nextUrl = page.url().replace(base, '');
  r.nextTitle = await q(page, '.detail-title h1');
  await page.goBack(); await sleep(3500);
  r.backUrl = page.url().replace(base, '');
  r.backTitle = await q(page, '.detail-title h1');
  // works link → iris home
  await page.locator('.detail-nav .nav-works-row a').click(); await sleep(3500);
  r.homeUrl = page.url().replace(base, '');
  r.homeClass = await cls(page, '.landing');
  r.homeLoader = await page.evaluate(() => !!document.querySelector('.loader'));
  return r;
});

await run('project-motion', 1440, 900, async (page) => {
  const r = {};
  await page.goto(base + '/project/netflix-comic-con-cpt', { waitUntil: 'load' }); await sleep(3000);
  r.detailClass = await cls(page, '.detail');
  r.count = [await q(page, '.detail-count p'), await q(page, '.detail-count-total')];
  r.video = await page.evaluate(() => { const v = document.querySelector('.detail-video video'); return v ? { paused: v.paused, muted: v.muted, poster: !!v.poster, ready: v.readyState } : null; });
  r.playHint = await page.evaluate(() => [document.querySelector('.detail-play-hint').textContent, document.querySelector('.detail-play-hint').className]);
  r.fullscreenBtn = await q(page, '.detail-fullscreen .roll-face');
  await page.locator('.detail-fullscreen').click(); await sleep(400);
  r.fullscreen = await cls(page, '.detail');
  await page.keyboard.press('Escape'); await sleep(400);
  r.fullscreenOff = await cls(page, '.detail');
  r.endCard = await page.evaluate(() => [document.querySelector('.detail-next-end .detail-next-name')?.textContent, document.querySelector('.detail-next-end').className]);
  await page.locator('.detail-nav a[href="/about"]').click(); await sleep(3500);
  r.aboutUrl = page.url().replace(base, '');
  r.studioReady = await cls(page, '.studio');
  return r;
});

await run('about', 1440, 900, async (page) => {
  const r = {};
  await page.goto(base + '/about', { waitUntil: 'load' }); await sleep(2500);
  r.ready = await cls(page, '.studio');
  r.headline = await page.evaluate(() => [...document.querySelectorAll('.studio-line')].map(e => [e.textContent, getComputedStyle(e).transform]));
  r.cols = await page.evaluate(() => ['.studio-about', '.studio-services', '.studio-clients'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }));
  r.footer = await page.evaluate(() => [...document.querySelectorAll('.studio-footer > *, .studio-socials > *')].map(e => [e.className.split(' ')[0], Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top)]));
  r.navCaretX = await page.evaluate(() => Math.round(document.querySelector('.nav-site-caret').getBoundingClientRect().left));
  await page.hover('.nav-filters'); await sleep(600);
  r.dropOpen = await page.evaluate(() => [getComputedStyle(document.querySelector('.nav-drop-hover')).maxHeight, getComputedStyle(document.querySelector('.nav-drop-reveal')).transform]);
  await page.locator('.nav-drop-hover a').first().click(); await sleep(4500);
  r.homeUrl = page.url().replace(base, '');
  r.homeFilter = await page.evaluate(() => document.querySelector('.nav-filters a.is-current')?.textContent);
  r.homeMetaType = await q(page, '.meta-type .meta');
  return r;
});

await run('notfound', 1440, 900, async (page) => {
  const r = {};
  const res = await page.goto(base + '/nope', { waitUntil: 'load' }); await sleep(2000);
  r.status = res.status();
  r.text = [await q(page, '.nf-code'), await q(page, '.nf-message'), await q(page, '.nf-home')];
  r.ready = await cls(page, '.notfound');
  r.lineTransform = await page.evaluate(() => getComputedStyle(document.querySelector('.nf-line')).transform);
  return r;
});

await run('mobile', 390, 844, async (page) => {
  const r = {};
  await enter(page);
  r.landingClass = await cls(page, '.landing');
  r.dial = await page.evaluate(() => [getComputedStyle(document.querySelector('.dial')).display, document.querySelector('.dial-name').textContent, document.querySelector('.dial-wheel').style.transform, document.querySelectorAll('.dial-wheel i.is-active').length]);
  r.hidden = await page.evaluate(() => ['.tagline', '.nav-right', '.ticker', '.trusted', '.view-toggle'].map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'absent'; }));
  r.menuBtn = await q(page, '.menu-btn .roll-face');
  await page.locator('.menu-btn').click(); await sleep(400);
  r.menuOpen = [await cls(page, '.landing'), await page.evaluate(() => [...document.querySelectorAll('.menu-items a')].map(a => a.textContent))];
  await page.locator('.menu-items a').nth(2).click(); await sleep(2500);
  r.afterFilter = [await cls(page, '.landing'), await q(page, '.dial-meta .tm-type')];
  await page.mouse.move(300, 400); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(300 - 30 * i, 400); await sleep(40); } await sleep(150); await page.mouse.up(); await sleep(2500);
  r.dialAfterDrag = await q(page, '.dial-name');
  await page.goto(base + '/project/totalsports-womens-race', { waitUntil: 'load' }); await sleep(2500);
  r.projectMenu = await page.evaluate(() => [getComputedStyle(document.querySelector('.detail-nav')).display, getComputedStyle(document.querySelector('.detail-menu-btn')).display]);
  r.stripInset = await page.evaluate(() => { const s = document.querySelector('.detail-strip').getBoundingClientRect(); return [Math.round(s.top), Math.round(s.bottom)]; });
  await page.goto(base + '/about', { waitUntil: 'load' }); await sleep(2000);
  r.aboutStack = await page.evaluate(() => ['.studio-headline', '.studio-about', '.studio-services', '.studio-trusted', '.studio-footer'].map(s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)]; }));
  return r;
});

await browser.close();
R.errors = errors;
const json = JSON.stringify(R, null, 1);
if (out) fs.writeFileSync(out, json);
console.log(json);
