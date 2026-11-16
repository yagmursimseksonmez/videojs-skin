// Renders the Chengel promo from the Chengel demo: tools/promo/promo.html, one frame at a time, then ffmpeg.
// node tools/make-promo.mjs [--frames 0,140,300]   (writes media/chengel-promo.mp4; with --frames, only those stills,
// into the current folder)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const root = new URL('..', import.meta.url).pathname;
const demo = join(root, 'apps/preview/public/media/chengel/video.mp4');
const FPS = 30;
const LENGTH = 27.5;
const only = process.argv.includes('--frames') ? process.argv[process.argv.indexOf('--frames') + 1].split(',').map(Number) : null;

const work = mkdtempSync(join(tmpdir(), 'chengel-promo-'));
const demoFrames = join(work, 'demo');
const outFrames = join(work, 'out');
mkdirSync(demoFrames);
mkdirSync(outFrames);
execFileSync('ffmpeg', ['-v', 'error', '-i', demo, '-vf', `fps=${FPS}`, '-q:v', '2', join(demoFrames, '%04d.jpg')]);
const demoCount = Math.floor(23.233 * FPS);

const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`file://${join(root, 'tools/promo/promo.html')}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const total = Math.round(LENGTH * FPS);
const frames = only ?? [...Array(total).keys()];
for (const i of frames) {
  const t = i / FPS;
  const n = Math.min(i, demoCount - 1) + 1;
  await page.evaluate(([src, time]) => window.setFrame(src).then(() => window.render(time)), [`file://${join(demoFrames, String(n).padStart(4, '0'))}.jpg`, t]);
  await page.screenshot({ path: only ? join(process.cwd(), `promo-${i}.png`) : join(outFrames, `${String(i).padStart(4, '0')}.png`) });
}
await browser.close();

if (!only) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(outFrames, '%04d.png'), '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', join(root, 'media/chengel-promo.mp4')]);
  console.log(join(root, 'media/chengel-promo.mp4'));
}
rmSync(work, { recursive: true, force: true });
