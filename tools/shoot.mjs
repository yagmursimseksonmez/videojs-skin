// Screenshots a list of pages: node tools/shoot.mjs <url> <out.png> [width] [height] [scale]
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';

const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [url, out, w = '1280', h = '720', s = '2'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +s });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
