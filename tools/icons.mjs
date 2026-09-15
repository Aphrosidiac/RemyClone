// icons.mjs — render the FF mark into app/apple-icon.png (180) and app/favicon.ico (64) in the
// reference's icon style: red wordmark centred on #111.
import { chromium } from '/Users/fakhrul/Desktop/dev/Shoal/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
const browser = await chromium.launch({ executablePath: '/Users/fakhrul/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
async function render(size, text, fontPx, file) {
  const page = await (await browser.newContext({ viewport: { width: size, height: size } })).newPage();
  await page.setContent(`<!doctype html><html><head><style>
  @font-face{font-family:Inter;font-weight:800;src:url(http://localhost:3150/fonts/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2) format("woff2")}
  html,body{margin:0;height:100%;background:#111}
  .w{height:100%;display:flex;align-items:center;justify-content:center;color:#ff3131;font:800 ${fontPx}px/1 Inter,Arial,sans-serif;letter-spacing:-.03em;text-transform:uppercase;-webkit-font-smoothing:antialiased}
  sup{font-size:.45em;vertical-align:super;line-height:0}
  </style></head><body><div class="w">${text}</div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: file });
}
await render(180, 'FF<sup>®</sup>', 82, 'app/apple-icon.png');
await render(64, 'FF', 36, '/tmp/favicon-64.png');
await browser.close();
execSync(`python3 -c "from PIL import Image; im=Image.open('/tmp/favicon-64.png').convert('RGBA'); im.save('app/favicon.ico', sizes=[(64,64),(32,32),(16,16)])"`);
console.log('icons written');
