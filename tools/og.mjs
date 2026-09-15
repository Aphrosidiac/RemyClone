// og.mjs — render the OG card (1200×630) with the real site fonts and save it as app/opengraph-image.png
import { chromium } from '/Users/fakhrul/Desktop/dev/Shoal/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: '/Users/fakhrul/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
await page.setContent(`<!doctype html><html><head><style>
@font-face{font-family:Inter;font-weight:800;src:url(http://localhost:3150/fonts/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2) format("woff2")}
@font-face{font-family:"Roboto Mono";font-weight:500;src:url(http://localhost:3150/fonts/2f13ad8e538108e0-s.p.22iyan98j1_2e.woff2) format("woff2")}
html,body{margin:0;height:100%;background:#111}
.w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ff3131;-webkit-font-smoothing:antialiased}
h1{font:800 132px/1 Inter,Arial,sans-serif;letter-spacing:-.03em;text-transform:uppercase;margin:0}
h1 sup{font-size:.45em;vertical-align:super;line-height:0}
p{font:500 26px/1.2 "Roboto Mono",monospace;color:#8e8c87;text-transform:uppercase;letter-spacing:-.02em;margin:22px 0 0}
</style></head><body><div class="w"><h1>FF Dev Studio<sup>®</sup></h1><p>documenting emotion, movement and meaning.</p></div></body></html>`);
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: 'app/opengraph-image.png' });
await browser.close();
console.log('wrote app/opengraph-image.png');
