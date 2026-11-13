// Renders the submission image from the real skin: node tools/visual.mjs [url] (dev server running).
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';

const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const url = process.argv[2] ?? 'http://127.0.0.1:5180/visual.html';
const out = new URL('../design/submission/', import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.querySelectorAll('video')].every((v) => v.readyState >= 2));

const at = (id, t) =>
  page.evaluate(([i, time]) => { const v = document.querySelector(`[data-case=${i}] video`); v.currentTime = time; }, [id, t]);

// HealthBar: stopped in the achievements, the chapter discs up.
await at('healthbar', 5.2);
// iKeep: over a white frame, discs put away: the reading line and the yellow play disc.
await at('ikeep', 1.3);
await sleep(600);
await page.locator('[data-case=ikeep] .pp-chapters-button').click();
// PlayMate: playing in its third chapter, pointing at the fifth on the line.
await at('playmate', 16.2);
await page.locator('[data-case=playmate] .pp-play').click();
await sleep(1200);
const seek = await page.locator('[data-case=playmate] .pp-seek').boundingBox();
await page.mouse.move(seek.x + seek.width * 0.57, seek.y + seek.height / 2, { steps: 4 });
await sleep(900);
await page.screenshot({ path: `${out}portfolio-player.png` });
await browser.close();
console.log(`${out}portfolio-player.png`);
