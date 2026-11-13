// Screenshots one element after the page's media load: node tools/shoot-el.mjs <url> <selector> <out.png> [width] [height] [script]
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';

const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [url, selector, out, w = '1280', h = '800', script = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.querySelectorAll('video')].every((v) => v.readyState >= 1));
await page.waitForFunction(() =>
  [...document.querySelectorAll('media-thumbnail img, media-slider-thumbnail img')].every((i) => !i.src || i.complete)
);
if (script) await page.evaluate(script);
await page.waitForTimeout(1200);
await page.locator(selector).first().screenshot({ path: out });
await browser.close();
