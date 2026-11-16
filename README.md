# Portfolio player

A [Video.js 10](https://videojs.org) skin for the app demos on [yagmursimseksonmez.com](https://yagmursimseksonmez.com), by Yağmur Şimşek Sönmez.

The case pages of the portfolio have a reading line with a yellow dot for every page. Here the seek bar is that line, with a dot for every chapter of the demo. The player sits on a designer's desk: the video is on a monitor against the wall, and the controls lie on the desk in front of it. The display is a sticky note with the chapter and the time, the keys are keycaps, and the line is a ruler with a loupe on it. When the video stops, the chapters come up as polaroids, so you can jump straight to the part of the case you care about, and reverse and advance keys move one chapter at a time. Each chapter can carry a design note, one sentence on why, on a sticky note pinned to its dot; viewers turn the notes on in Settings. A wide player has a plant, a pencil cup and a mug beside the monitor. The portfolio's yellow is the play key, the lit part of the line and the current chapter. The second look is a slide projector.

- **Demo:** `npm run dev`, then open the page Vite prints. It opens with a promo for Chengel, the app on the App Store, then the case demos. `workbench.html` is the Video.js workbench (sizes, ratios, languages, playback options).
- **Skin:** everything in `src/`. `src/video/skin.html` is the markup, `skin.css` the look (the projector first, then the desk on top of it), `elements.ts` the chapter display with the reverse and advance keys, the design note, the chapter polaroids and the progress line.

## What it does

- Play and pause, seek, time, volume and mute, fullscreen, all from Video.js 10 components.
- Chapters from a WebVTT chapters track: a dot in the line's groove where each one starts (lit once you pass it), the chapter's number, name and the time on the display, and the chapter under the pointer in the seek preview.
- Reverse and advance keys go to the previous and next chapter (reverse first goes back to the start of the chapter playing, as a projector's would).
- Chapter polaroids (slides on the projector): they come up by themselves before the first play, on pause and at the end, and from the chapters key at any time. Picking one plays from its start. They are one tab stop; arrow keys move along them and Escape closes them.
- Design notes from a WebVTT metadata track labelled `notes`, a cue per chapter: a sticky note (a slide label on the projector) over the bottom of the picture with one sentence on why, standing over its chapter and pinned to its dot by a thin line. The notes are off until the viewer turns them on with Notes in the settings menu, or with N; the switch shows only when the video has notes, and it sets every player on the page. The note stays while the video plays and steps aside while the slides are up. A short player (a wide video on a phone) has no room for it.
- The seek bar's thumb is a loupe: a metal ring with the line inside it twice as large. Passing a chapter's dot, it lights up yellow at once, as when a new slide drops into the lamp's light, and dims again.
- A second look, `theme: 'projector'`: the same player as a slide projector. The video is the picture on its screen, the controls are its dark deck with a dot matrix display (Doto), the chapters are slides from its tray and the notes are cream slide labels; its light is on while it plays. The desk is `data-pp-theme="desk"` on the player, so without it the skin is the projector. The demo page switches between the two, and `?theme=projector` opens it on the projector.
- End card: with `end`, the player shows a card when the video ends, such as where to download the app: the link, and a QR code for whoever watches at a desk. On a phone the card is the link alone.
- The seek preview and the discs show frames from a storyboard track. Mux makes one for every video; `tools/make-media.py` makes one for a local file.
- Settings: speed from 0.5× to 2×, captions when the video has a captions track, and the design notes switch when it has notes. Captions move up above the bar while the controls show.
- The controls stay while the video plays, since they lie on the desk (on the projector, they are its body).

## Accessibility

- Every control is reachable with Tab and works with Enter, Space and the arrow keys. Player shortcuts: Space or K, J and L, arrow keys, M, F, C, N for the design notes, < and >, Home, End and 0 to 9. Escape closes the settings menu one page at a time, then the chapter discs.
- Focus is the portfolio's yellow outline with a dark line inside, so it shows on yellow and on dark footage.
- The display and the keys sit under the picture, on the desk, so they read over any video. Over the picture, the chapters' names sit on a dark shade and the notes on sticky notes. `npm run audit` measures at least 7:1 over white, yellow and dark frames.
- Buttons are 44px; the seek bar is 40px tall on touch screens.
- With reduced motion, nothing slides, scales or spins: things only fade, and the loading ring breathes. Higher contrast and reduced transparency make the shade and the panels solid.

## Use it

In any page with a bundler:

```ts
import { createPortfolioPlayer } from './src/player';

document.querySelector('#demo')!.append(
  createPortfolioPlayer({
    src: '/videos/healthbar.mp4',
    chapters: '/videos/healthbar/chapters.vtt',
    thumbnails: '/videos/healthbar/storyboard.vtt',
    notes: '/videos/healthbar/notes.vtt',
    poster: '/videos/healthbar/poster.jpg',
    end: {
      title: 'Get HealthBar',
      label: 'Download on the App Store',
      href: 'https://apps.apple.com/app/id6773367246',
      qr: '/videos/healthbar/qr.svg',
    },
    label: 'HealthBar walkthrough',
    ratio: '804 / 1748',
  })
);
```

From Mux, pass `playbackId` instead of `src`; the poster and storyboard come from Mux.

In an Astro site, copy `src/` to `src/videojs-skin/` and `astro/PortfolioPlayer.astro` to `src/components/`, then install `@videojs/html@10.4.0` and `@videojs/mux-video@10.4.0` (needed to build even without Mux; it loads only where a Mux player is). Load Inter on the page, and Doto for the projector's display (it falls back to a monospace). The component renders the player on the server.

Chapters are plain WebVTT, one cue per chapter:

```
WEBVTT

00:00:00.000 --> 00:00:02.300
Tip and quick actions

00:00:02.300 --> 00:00:03.900
Achievements
```

Notes are WebVTT too, written by hand: a `notes.vtt` with the same times as `chapters.vtt` and one sentence per cue. A chapter without a note shows only its name.

`python3 tools/make-media.py <folder with the videos>` builds the poster, chapters and storyboard for each video in `media/cases.json`. `node tools/make-promo.mjs` renders the Chengel promo from its demo (`tools/promo/promo.html`, frame by frame), and `python3 tools/qr.py <link> <file.svg>` writes a QR code for an end card, with no libraries.

## Tokens

Set these on `.pp` or any parent:

| Token | Default | |
| --- | --- | --- |
| `--pp-accent` | `#ffd100` | Dots, fill, current chapter, focus |
| `--pp-radius` | `16px` | Corner radius |
| `--pp-letterbox` | `#1a1a1a` | Behind a video that doesn't fill the player |
| `--pp-disc` | `64px` | Chapter disc size (smaller players use less) |
| `--pp-disc-zoom` | `1` | Zoom into the frame in the discs and the preview |
| `--pp-font` | Inter | Typeface |

## Scripts

- `npm run dev`: the demo and the workbench.
- `npm run build`: a static site in `dist/`.
- `npm run audit`: with the dev server running, checks controls, keyboard, focus, tap sizes, contrast, responsive sizes, the end card and reduced motion, and saves screenshots to `design/audit/`.
- `npm run typecheck`.

## License

Apache 2.0, as the Video.js Skins Design Challenge asks of its entries.
