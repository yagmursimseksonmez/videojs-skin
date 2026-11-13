// Audits the skin on the demo page the way the challenge checks it: working controls, keyboard, visible focus,
// thumb-sized targets, contrast over bright and dark frames, responsive sizes and reduced motion.
// node tools/audit.mjs [url]   (screenshots go to design/audit/)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const url = process.argv[2] ?? 'http://127.0.0.1:5180/';
const out = new URL('../design/audit/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const results = [];
const check = (area, name, pass, detail = '') => {
  results.push({ area, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${area.padEnd(12)} ${name}${detail ? `  (${detail})` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: exe });

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2, ...options });
  const page = await context.newPage();
  page.on('pageerror', (e) => check('page', 'no script errors', false, e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('video')].every((v) => v.readyState >= 1));
  await sleep(500);
  return { context, page };
}

const hero = '[data-case=playmate] .pp';
const video = (page, sel = hero) => page.locator(`${sel} video`);
const state = (page, sel = hero) =>
  page.evaluate((s) => {
    const v = document.querySelector(`${s} video`);
    return { paused: v.paused, time: v.currentTime, muted: v.muted, volume: v.volume };
  }, sel);

// ------------------------------------------------------------------ controls
{
  const { context, page } = await open();
  const p = page.locator(hero);

  check('controls', 'chapters open before the first play', await p.locator('.pp-discs[data-open]').count() === 1);
  await p.locator('.pp-play').click();
  await sleep(900);
  let s = await state(page);
  check('controls', 'play button plays', !s.paused && s.time > 0.2, `t=${s.time.toFixed(2)}`);
  check('controls', 'chapters close while playing', (await p.locator('.pp-discs[data-open]').count()) === 0);

  await p.locator('.pp-play').click();
  await sleep(300);
  s = await state(page);
  check('controls', 'play button pauses', s.paused);
  check('controls', 'chapters open on pause', (await p.locator('.pp-discs[data-open]').count()) === 1);

  const box = await p.locator('.pp-seek').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
  await sleep(500);
  s = await state(page);
  check('controls', 'seek bar seeks', Math.abs(s.time - 25.5) < 1.2, `t=${s.time.toFixed(2)}`);
  const label = (await p.locator('.pp-chapter').innerText()).replace(/\s+/g, ' ');
  check('controls', 'chapter label follows', /04\s*\/?\s*(of)?\s*09/i.test(label) && /finding a match/i.test(label), label);
  const time = (await p.locator('.pp-time-row').innerText()).replace(/\s+/g, ' ');
  check('controls', 'time shows current / duration', /0:25\s*\/\s*0:51/.test(time), time);

  await p.locator('.pp-mute').click();
  s = await state(page);
  check('controls', 'mute button mutes', s.muted);
  await p.locator('.pp-mute').click();
  s = await state(page);
  check('controls', 'mute button unmutes', !s.muted);

  await p.locator('.pp-mute').hover();
  await sleep(500);
  const popover = p.locator('.pp-volume[data-open]');
  check('controls', 'volume slider opens on hover', (await popover.count()) === 1);
  if (await popover.count()) {
    const vb = await p.locator('.pp-volume-slider').boundingBox();
    await page.mouse.click(vb.x + vb.width / 2, vb.y + vb.height * 0.7);
    await sleep(300);
    s = await state(page);
    check('controls', 'volume slider sets volume', s.volume < 0.5 && s.volume > 0.1, `v=${s.volume.toFixed(2)}`);
    await page.screenshot({ path: `${out}volume.png`, clip: await p.boundingBox() });
  }

  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height / 2);
  await sleep(500);
  check('controls', 'seek preview shows chapter and time', /0:31/.test(await p.locator('.pp-preview').innerText()));
  await page.screenshot({ path: `${out}preview.png`, clip: await p.boundingBox() });

  await p.locator('.pp-disc').nth(2).click();
  await sleep(700);
  s = await state(page);
  check('controls', 'a chapter disc plays from its start', !s.paused && s.time >= 14.8 && s.time < 16.5, `t=${s.time.toFixed(2)}`);

  await page.mouse.move(box.x + box.width * 0.5, box.y - 200);
  await sleep(600);
  await page.screenshot({ path: `${out}playing.png`, clip: await p.boundingBox() });
  await page.mouse.move(5, 5);
  await sleep(3500);
  const hidden = await p.locator('.pp-content:not([data-visible])').count();
  check('controls', 'controls rest during playback', hidden === 1);
  await page.screenshot({ path: `${out}resting.png`, clip: await p.boundingBox() });

  // Any movement over the player wakes the controls again.
  await page.mouse.move(box.x + box.width * 0.5, box.y - 150, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.4, box.y - 120, { steps: 6 });
  await sleep(400);
  check('controls', 'controls wake on pointer movement', (await p.locator('.pp-content[data-visible]').count()) === 1);
  await p.locator('.pp-fullscreen').click();
  await sleep(600);
  const fs = await page.evaluate(() => !!document.fullscreenElement);
  check('controls', 'fullscreen button enters fullscreen', fs);
  if (fs) {
    await page.screenshot({ path: `${out}fullscreen.png` });
    await p.locator('.pp-fullscreen').click({ force: true });
    await sleep(500);
    check('controls', 'fullscreen button leaves fullscreen', !(await page.evaluate(() => !!document.fullscreenElement)));
  }
  await context.close();
}

// ------------------------------------------------------------------ keyboard and focus
{
  const { context, page } = await open();
  const p = page.locator(hero);
  await page.locator('.site-nav nav a').last().focus();
  const order = [];
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      const pp = el.closest('[data-case]');
      const cs = getComputedStyle(el);
      const img = el.querySelector?.('.pp-disc-image');
      const ics = img && getComputedStyle(img);
      const visible =
        (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) ||
        (cs.boxShadow !== 'none' && el.matches('.pp')) ||
        (ics && ics.outlineStyle !== 'none');
      return {
        player: pp?.dataset.case ?? '',
        name: el.getAttribute('aria-label') || el.getAttribute('role') || el.textContent.trim().slice(0, 24) || el.localName,
        cls: el.className,
        visible,
      };
    });
    order.push(info);
    if (info.player && info.player !== 'playmate') break;
  }
  console.log('      tab order:', order.map((o) => `${o.player}:${o.name}`).join(' → '));
  const inHero = order.filter((o) => o.player === 'playmate');
  check('keyboard', 'player, discs and every control reachable by Tab', ['Play', 'Seek', 'Mute', 'Fullscreen'].every((n) => inHero.some((o) => o.name.toLowerCase().includes(n.toLowerCase()))) && inHero.some((o) => o.cls.includes('pp-disc')), `${inHero.length} stops`);
  check('focus', 'every stop shows a focus ring', inHero.every((o) => o.visible), inHero.filter((o) => !o.visible).map((o) => o.name).join(', '));

  await p.focus();
  await page.keyboard.press('Space');
  await sleep(700);
  let s = await state(page);
  check('keyboard', 'Space plays', !s.paused);
  await page.keyboard.press('m');
  s = await state(page);
  check('keyboard', 'M mutes', s.muted);
  await page.keyboard.press('m');
  const before = (await state(page)).time;
  await page.keyboard.press('ArrowRight');
  await sleep(300);
  s = await state(page);
  check('keyboard', 'Arrow Right seeks forward', s.time > before + 2, `${before.toFixed(1)} → ${s.time.toFixed(1)}`);

  await p.locator('.pp-chapters-button').focus();
  await page.keyboard.press('Enter');
  await sleep(400);
  let focus = await page.evaluate(() => document.activeElement.className);
  check('keyboard', 'Chapters button opens the discs and moves focus in', focus.includes('pp-disc'), focus);
  await page.keyboard.press('ArrowRight');
  const idx = await page.evaluate(() => document.activeElement.dataset.index);
  check('keyboard', 'arrow keys move between discs', idx !== undefined);
  await page.screenshot({ path: `${out}keyboard-discs.png`, clip: await p.boundingBox() });
  await page.keyboard.press('Escape');
  await sleep(400);
  focus = await page.evaluate(() => document.activeElement.className);
  check('keyboard', 'Escape closes the discs, focus back on the button', (await p.locator('.pp-discs[data-open]').count()) === 0 && focus.includes('pp-chapters-button'), focus);

  await p.locator('.pp-mute').focus();
  await page.keyboard.press('Tab');
  focus = await page.evaluate(() => document.activeElement.className + ' ' + (document.activeElement.getAttribute('aria-label') ?? ''));
  check('keyboard', 'volume slider reachable from the mute button', /volume/i.test(focus), focus);
  await page.keyboard.press('Escape');

  await page.screenshot({ path: `${out}focus.png`, clip: await p.boundingBox() });
  await context.close();
}

// ------------------------------------------------------------------ tap targets
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const sel of ['[data-case=playmate] .pp', '[data-case=chengel] .pp']) {
    const sizes = await page.evaluate((s) => {
      const root = document.querySelector(s);
      return [...root.querySelectorAll('.pp-button, .pp-disc, .pp-seek, .pp-big-play')]
        .filter((el) => el.getClientRects().length && getComputedStyle(el).display !== 'none')
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { name: el.getAttribute('aria-label') || el.className.split(' ').pop(), w: Math.round(r.width), h: Math.round(r.height) };
        });
    }, sel);
    const small = sizes.filter((x) => x.w < 44 || x.h < 40);
    check('tap size', `${sel.match(/=(\w+)/)[1]}: controls at least 44px (seek bar 40px tall on touch)`, small.length === 0, small.map((x) => `${x.name} ${x.w}x${x.h}`).join(', ') || `${sizes.length} targets`);
  }
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('.pp-row')].map((r) => r.scrollWidth - r.clientWidth).filter((d) => d > 1)
  );
  check('responsive', 'control rows fit on a phone', overflow.length === 0, overflow.join(','));
  await page.screenshot({ path: `${out}phone-page.png` });
  await page.locator('[data-case=playmate] .pp').screenshot({ path: `${out}phone-hero.png` });
  await page.evaluate(() => document.querySelector('[data-case=playmate] .pp-chapters-button').click());
  await sleep(500);
  check('responsive', 'short player opens the discs only from the button', (await page.locator('[data-case=playmate] .pp[data-pp-short]').count()) === 1);
  await page.locator('[data-case=playmate] .pp').screenshot({ path: `${out}phone-hero-chapters.png` });
  await page.locator('[data-case=chengel] .pp').scrollIntoViewIfNeeded();
  await sleep(300);
  await page.locator('[data-case=chengel] .pp').screenshot({ path: `${out}phone-chengel.png` });
  await context.close();
}

// ------------------------------------------------------------------ contrast over bright and dark frames
{
  const { context, page } = await open({ viewport: { width: 1280, height: 1400 } });
  const frames = [
    ['playmate', 10, 'bright yellow'],
    ['ikeep', 1.2, 'white'],
    ['healthbar', 0.3, 'dark'],
  ];
  for (const [id, t, kind, discs] of frames.flatMap((f) => [[...f, 'open'], [...f, 'closed']])) {
    const sel = `[data-case=${id}] .pp`;
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.evaluate(([s, time]) => { const v = document.querySelector(`${s} video`); v.currentTime = time; }, [sel, t]);
    await sleep(800);
    // Closed: the plain shade under the bar, as while playing with the controls up.
    if (discs === 'closed' && (await page.locator(`${sel} .pp-discs[data-open]`).count())) await page.locator(`${sel} .pp-chapters-button`).click();
    await sleep(400);
    await page.mouse.move(10, 10);
    const texts = await page.evaluate((s) => {
      const root = document.querySelector(s);
      const nodes = [
        ...root.querySelectorAll('.pp-chapter-count, .pp-chapter-title, .pp-time-current, .pp-time-duration, .pp-disc-time, .pp-disc-title'),
      ].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && el.closest('.pp-discs')?.hasAttribute('data-open') !== false);
      return nodes.map((el, i) => {
        el.dataset.auditId = String(i);
        // The box of the text itself, without decorations such as the current chapter's dot.
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { id: i, name: el.className, text: el.textContent.trim().slice(0, 20), color: getComputedStyle(el).color, box: { x: r.x, y: r.y, width: r.width, height: r.height } };
      });
    }, sel);
    // One screenshot with every audited text made transparent, then each text's box is read from it.
    await page.evaluate(() => document.querySelectorAll('[data-audit-id]').forEach((el) => {
      for (const n of [el, ...el.querySelectorAll('*')]) { n.style.setProperty('color', 'transparent', 'important'); n.style.setProperty('text-shadow', 'none', 'important'); }
    }));
    await sleep(100);
    const png = await page.screenshot();
    await page.evaluate(() => document.querySelectorAll('[data-audit-id]').forEach((el) => {
      for (const n of [el, ...el.querySelectorAll('*')]) { n.style.removeProperty('color'); n.style.removeProperty('text-shadow'); }
    }));
    const ratios = await page.evaluate(async ([b64, items]) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const k = img.width / innerWidth;
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
      return items.map((it) => {
        const { x, y, width, height } = it.box;
        const d = g.getImageData(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(width * k)), Math.max(1, Math.round(height * k))).data;
        const [fr, fg, fb, fa = 1] = it.color.match(/[\d.]+/g).map(Number);
        const ls = [];
        for (let i = 0; i < d.length; i += 4) {
          // The text's own colour blended over this pixel, against the pixel.
          const r = fr * fa + d[i] * (1 - fa), gg = fg * fa + d[i + 1] * (1 - fa), b = fb * fa + d[i + 2] * (1 - fa);
          const L1 = lum(r, gg, b), L2 = lum(d[i], d[i + 1], d[i + 2]);
          ls.push((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05));
        }
        ls.sort((a, b) => a - b);
        return { text: it.text, ratio: ls[Math.floor(ls.length * 0.05)] }; // the 5% least favourable pixels
      });
    }, [png.toString('base64'), texts.filter((t) => t.box.width > 1 && t.box.y >= 0 && t.box.y + t.box.height <= 1400)]);
    const worst = ratios.reduce((a, b) => (b.ratio < a.ratio ? b : a), { ratio: 99 });
    check('contrast', `text over a ${kind} frame (${id}, chapters ${discs}) at least 4.5:1`, worst.ratio >= 4.5, `lowest ${worst.ratio.toFixed(2)}:1 on "${worst.text}"`);
    await page.locator(sel).screenshot({ path: `${out}contrast-${id}-${discs}.png` });
  }
  await context.close();
}

// ------------------------------------------------------------------ reduced motion
{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  const styles = await page.evaluate(() => {
    const q = (s) => getComputedStyle(document.querySelector(s));
    const spinner = q('.pp-spinner');
    return {
      discs: q('.pp-discs').transitionProperty,
      discsTranslate: q('.pp-discs').translate,
      bigPlay: q('.pp-big-play').transitionProperty,
      spinner: spinner.animationName,
    };
  });
  check('motion', 'discs only fade (no slide)', !/translate/.test(styles.discs) && styles.discsTranslate === 'none', styles.discs);
  check('motion', 'big play only fades (no scale)', !/scale/.test(styles.bigPlay), styles.bigPlay);
  check('motion', 'buffering ring breathes instead of spinning', styles.spinner === 'pp-breathe', styles.spinner);
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
