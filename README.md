# Portfolio player

A [Video.js 10](https://videojs.org) skin for the app demos on [yagmursimseksonmez.com](https://yagmursimseksonmez.com), by Yağmur Şimşek Sönmez.

The case pages of the portfolio have a reading line with a yellow dot for every page. Here the seek bar is that line, with a dot for every chapter of the demo. When the video stops, the chapters come up as discs, like the projects on the homepage, so you can jump straight to the part of the case you care about. Dark `#202020`, Inter, the portfolio's yellow, and controls that stay out of the way.

- **Demo:** `npm run dev`, then open the page Vite prints. `workbench.html` is the Video.js workbench (sizes, ratios, languages, playback options).
- **Skin:** everything in `src/`. `src/video/skin.html` is the markup, `skin.css` the look, `elements.ts` the chapter label, the chapter discs and the progress line.

## What it does

- Play and pause, seek, time, volume and mute, fullscreen, all from Video.js 10 components.
- Chapters from a WebVTT chapters track: a dot on the line where each one starts (yellow once you pass it), the current chapter's number and name over the line, and the chapter under the pointer in the seek preview.
- Chapter discs: they open by themselves before the first play, on pause and at the end, and from the Chapters button at any time. Picking one plays from its start. They are one tab stop; arrow keys move along them and Escape closes them.
- The seek preview and the discs show frames from a storyboard track. Mux makes one for every video; `tools/make-media.py` makes one for a local file.
- While the controls rest during playback, a thin yellow progress line stays along the bottom edge.

## Accessibility

- Every control is reachable with Tab and works with Enter, Space and the arrow keys. Player shortcuts: Space or K, J and L, arrow keys, M, F, Home, End and 0 to 9.
- Focus is the portfolio's yellow outline with a dark line inside, so it shows on yellow and on dark footage.
- Text sits on a shade whose stops are in pixels, so it keeps the same depth at any player size. `npm run audit` measures at least 6.7:1 over white, yellow and dark frames.
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
    poster: '/videos/healthbar/poster.jpg',
    label: 'HealthBar walkthrough',
    ratio: '804 / 1748',
  })
);
```

From Mux, pass `playbackId` instead of `src`; the poster and storyboard come from Mux.

In an Astro site, copy `src/` to `src/videojs-skin/` and `astro/PortfolioPlayer.astro` to `src/components/`, then install `@videojs/html@10.4.0`. The component renders the player on the server.

Chapters are plain WebVTT, one cue per chapter:

```
WEBVTT

00:00:00.000 --> 00:00:02.300
Tip and quick actions

00:00:02.300 --> 00:00:03.900
Achievements
```

`python3 tools/make-media.py <folder with the videos>` builds the poster, chapters and storyboard for each video in `media/cases.json`.

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
- `npm run audit`: with the dev server running, checks controls, keyboard, focus, tap sizes, contrast, responsive sizes and reduced motion, and saves screenshots to `design/audit/`.
- `npm run typecheck`.

## License

Apache 2.0, as the Video.js Skins Design Challenge asks of its entries.
