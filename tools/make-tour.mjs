// Records a short tour of the player for the Contra entry: the demo page's first player, a cursor and a line of text
// for each step, captured from Chromium's screencast as it plays. Needs the dev server (npm run dev).
// node tools/make-tour.mjs [url]   (writes design/submission/player-tour.mp4)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const root = new URL('..', import.meta.url).pathname;
const url = process.argv[2] ?? 'http://127.0.0.1:5180/';
const out = join(root, 'design/submission/player-tour.mp4');
const W = 1920;
const H = 1080;
const TOP = 150;

const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const fig = 'figure[data-case="chengel-promo"]';
const pp = `${fig} .pp`;

// Only the first player, as large as fits under the text, with a cursor and a key that can be shown.
await page.evaluate(
  ([fig, W, H, TOP]) => {
    document.querySelector(fig).closest('section').classList.add('tour-keep');
    const style = document.createElement('style');
    style.textContent = `
      header, footer, main > :not(.tour-keep), ${fig} figcaption { display: none !important; }
      main { display: block !important; width: 100% !important; padding: ${TOP}px 0 0 !important; margin: 0 !important;
        max-width: none !important; }
      .tour-keep { display: block !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
      ${fig} { margin: 0 auto !important; width: var(--tour-w) !important; max-width: none !important; }
      html, body { overflow: hidden !important; cursor: none !important; }
      #tour-cap { position: fixed; top: 0; left: 0; right: 0; height: ${TOP}px; display: grid; place-content: center;
        justify-items: center; gap: 6px; color: #f4f1ea; font: 500 42px/1.2 Inter, sans-serif; letter-spacing: -0.01em;
        text-align: center; transition: opacity 0.3s ease; z-index: 2147483646; }
      #tour-cap small { font-size: 24px; font-weight: 400; color: #b9b3a8; }
      #tour-cursor { position: fixed; top: 0; left: 0; width: 34px; height: 34px; pointer-events: none;
        z-index: 2147483647; filter: drop-shadow(0 3px 5px rgb(0 0 0 / 0.45)); }
      .tour-ring { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border: 3px solid #ffd100;
        border-radius: 50%; pointer-events: none; z-index: 2147483646; animation: tour-ring 0.5s ease-out forwards; }
      @keyframes tour-ring { from { scale: 0.4; opacity: 1; } to { scale: 1.4; opacity: 0; } }
      #tour-key { position: fixed; left: 50%; top: ${TOP - 4}px; translate: -50% -100%; min-width: 64px; height: 64px;
        padding: 0 16px; display: grid; place-content: center; border-radius: 12px; background: linear-gradient(#f6f3ec, #e2ddd2);
        box-shadow: inset 0 1px 0 #fff, 0 4px 0 #a9a296, 0 6px 12px rgb(0 0 0 / 0.4); color: #202020;
        font: 600 30px/1 Inter, sans-serif; opacity: 0; transition: opacity 0.2s ease, translate 0.12s ease;
        z-index: 2147483646; }
      #tour-key[data-down] { translate: -50% calc(-100% + 3px); box-shadow: inset 0 1px 0 #fff, 0 1px 0 #a9a296, 0 2px 4px rgb(0 0 0 / 0.3); }
    `;
    document.head.append(style);

    // The widest player whose height still fits under the text; again when the look changes.
    const figure = document.querySelector(fig);
    const player = figure.querySelector('.pp');
    window.tourFit = () => {
      for (let w = W - 160; w > 800; w -= 10) {
        figure.style.setProperty('--tour-w', `${w}px`);
        if (player.getBoundingClientRect().height <= H - TOP - 36) break;
      }
    };
    window.tourFit();

    const cap = document.createElement('div');
    cap.id = 'tour-cap';
    const key = document.createElement('div');
    key.id = 'tour-key';
    const cursor = document.createElement('div');
    cursor.id = 'tour-cursor';
    cursor.innerHTML =
      '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M5 2.5v17.2l4.4-4.1 2.9 6.6 3-1.3-2.9-6.5h6.1z" fill="#202020" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(cap, key, cursor);
    document.addEventListener('mousemove', (e) => (cursor.style.translate = `${e.clientX - 6}px ${e.clientY - 3}px`), true);
    document.addEventListener(
      'mousedown',
      (e) => {
        const ring = document.createElement('div');
        ring.className = 'tour-ring';
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
        document.body.append(ring);
        setTimeout(() => ring.remove(), 600);
      },
      true
    );
  },
  [fig, W, H, TOP]
);

const wait = (ms) => page.waitForTimeout(ms);

async function say(text, sub = '') {
  await page.evaluate(
    ([text, sub]) => {
      const cap = document.getElementById('tour-cap');
      cap.style.opacity = '0';
      setTimeout(() => {
        cap.innerHTML = '';
        cap.append(text);
        if (sub) {
          const small = document.createElement('small');
          small.textContent = sub;
          cap.append(small);
        }
        cap.style.opacity = '1';
      }, 300);
    },
    [text, sub]
  );
  await wait(400);
}

// The cursor glides, easing in and out, for `ms` of real time however long each move takes.
let mouse = { x: W * 0.7, y: H * 0.62 };
async function glide(x, y, ms = 700) {
  const from = { ...mouse };
  const start = Date.now();
  for (let t = 0; t < 1; ) {
    t = Math.min(1, (Date.now() - start) / ms);
    const k = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    mouse = { x: from.x + (x - from.x) * k, y: from.y + (y - from.y) * k };
    await page.mouse.move(mouse.x, mouse.y);
    await wait(12);
  }
}

// Waits until the video has played to `time`, so each step lands in the chapter it talks about.
const until = (time) =>
  page.waitForFunction(([s, time]) => document.querySelector(`${s} :is(video, mux-video)`).currentTime >= time, [pp, time], {
    timeout: 30000,
  });

async function centre(selector) {
  const box = await page.locator(selector).first().boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}

async function click(selector, ms) {
  const [x, y] = await centre(selector);
  await glide(x, y, ms);
  await wait(150);
  await page.mouse.down();
  await wait(90);
  await page.mouse.up();
}

async function press(key, label = key) {
  await page.evaluate((label) => {
    const el = document.getElementById('tour-key');
    el.textContent = label;
    el.style.opacity = '1';
    el.toggleAttribute('data-down', true);
  }, label);
  await page.keyboard.press(key);
  await wait(140);
  await page.evaluate(() => document.getElementById('tour-key').removeAttribute('data-down'));
  await wait(500);
  await page.evaluate(() => (document.getElementById('tour-key').style.opacity = '0'));
}

// Every frame Chromium paints, with its time, so the video keeps the real pace.
const work = mkdtempSync(join(tmpdir(), 'player-tour-'));
const frames = [];
const cdp = await page.context().newCDPSession(page);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = join(work, `${String(frames.length).padStart(5, '0')}.jpg`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, time: metadata.timestamp });
  void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await page.mouse.move(mouse.x, mouse.y);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await wait(300);

// The tour.
await say('Portfolio player', 'A Video.js skin for portfolio, explainer and tutorial videos');
await wait(2600);

await say('Open the description below the video');
await click(`${pp} .pp-settings-button`, 900);
await wait(800);
await click(`${pp} .pp-notes-toggle`, 600);
await wait(700);
await page.keyboard.press('Escape');
await wait(500);

await say('While you watch, it shows a short summary of the section you’re in');
await click(`${pp} .pp-big-play`, 800);
await glide(W * 0.9, H * 0.5, 900);
await until(6.6);

await say('Every chapter is a polaroid, so you can jump straight to it');
await click(`${pp} .pp-chapters-button`, 900);
await wait(900);
await click(`${pp} .pp-disc:has-text("Flash cards")`, 800);
await glide(W * 0.9, H * 0.5, 800);
await until(14.6);

await say('Or step to the next one with the keys');
await click(`${pp} [data-pp-step="1"]`, 800);
await glide(W * 0.9, H * 0.5, 700);
await until(19.6);

await say('N opens and closes it from the keyboard');
await wait(300);
await press('n', 'N');
await wait(700);
await press('n', 'N');
await until(21.6);

await say('Point at the ruler to preview a section');
const seek = await page.locator(`${pp} .pp-seek`).boundingBox();
await glide(seek.x + seek.width * 0.28, seek.y + seek.height / 2, 800);
await wait(600);
await glide(seek.x + seek.width * 0.6, seek.y + seek.height / 2, 1400);
await wait(500);
await glide(W * 0.9, H * 0.5, 700);

await say('At the end, a card shows where to get the app');
await page.waitForFunction((s) => document.querySelector(`${s} :is(video, mux-video)`).ended, pp, { timeout: 15000 });
await wait(2600);

await say('There is a slide projector look too');
await page.evaluate(
  (s) =>
    document.startViewTransition(() => {
      document.querySelector(s).removeAttribute('data-pp-theme');
      window.tourFit();
    }),
  pp
);
await wait(3400);

await say('Portfolio player', 'Built on Video.js 10  ·  yagmursimseksonmez.github.io/videojs-skin');
await wait(3000);

await cdp.send('Page.stopScreencast');
await browser.close();

// Each frame lasts until the next one; the last one holds a little.
const list = frames
  .map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.time ?? f.time + 0.5) - f.time).toFixed(4)}`)
  .join('\n');
writeFileSync(join(work, 'list.txt'), `${list}\nfile '${frames.at(-1).file}'\n`);
mkdirSync(join(root, 'design/submission'), { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'list.txt'), '-vf', `fps=30,scale=${W}:${H},format=yuv420p`,
  '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out]);
console.log(out, `${frames.length} frames`);
rmSync(work, { recursive: true, force: true });
