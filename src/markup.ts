// The skin's markup with one player's media in it, as a string. No browser APIs, so a server can render it too
// (the Astro component in astro/ does).
import template from './video/skin.html?raw';

export interface PortfolioPlayerOptions {
  /** An MP4 (or any file the browser plays). */
  src?: string;
  /** A Mux playback ID instead of `src`; the poster and storyboard then come from Mux. */
  playbackId?: string;
  /** A WebVTT chapters file: a cue per chapter, its text the chapter's name. */
  chapters?: string;
  /** A storyboard WebVTT file for the discs and the seek preview. Mux makes one by itself. */
  thumbnails?: string;
  /** A WebVTT file of design notes: a cue per chapter, at the chapter's times, its text one sentence on why. */
  notes?: string;
  poster?: string;
  /** Names the player for screen readers, such as "PlayMate demo". */
  label?: string;
  /** The video's width / height, so the page doesn't shift while it loads, such as "1400 / 916". */
  ratio?: string;
  /** How the player looks: a designer's desk (the default) or a slide projector. */
  theme?: 'projector' | 'desk';
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  /** A card for when the video ends, such as where to download the app: a link, and a QR code for desktop viewers. */
  end?: PortfolioPlayerEnd;
}

export interface PortfolioPlayerEnd {
  /** "Get Chengel" */
  title: string;
  /** One line under the title. */
  text?: string;
  /** The link's words, such as "Download on the App Store". */
  label: string;
  href: string;
  /** An image of a QR code for the same link; it shows only where there is a mouse, since a phone can't scan itself. */
  qr?: string;
}

const MEDIA_PLACEHOLDER = '<!-- Add a compatible media component here. -->';
const END_PLACEHOLDER = '<!-- End card -->';

function endMarkup(end: PortfolioPlayerEnd): string {
  const qr = end.qr ? `<img class="pp-end-qr" src="${attr(end.qr)}" alt="" width="132" height="132" decoding="async">` : '';
  const text = end.text ? `<p class="pp-end-text">${attr(end.text)}</p>` : '';
  const hint = end.qr ? '<p class="pp-end-hint">or scan the code with your phone</p>' : '';
  return (
    `<div class="pp-end" role="group" aria-label="${attr(end.title)}">${qr}<div class="pp-end-body">` +
    `<p class="pp-end-title">${attr(end.title)}</p>${text}` +
    `<a class="pp-end-link" href="${attr(end.href)}" target="_blank" rel="noopener">${attr(end.label)}</a>${hint}</div></div>`
  );
}

const attr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The skin's markup with one player's media in it. `uid` keeps its ids apart from other players on the page. */
export function portfolioPlayerMarkup(options: PortfolioPlayerOptions, uid: string): string {
  const flags = [options.autoplay && 'autoplay', options.muted && 'muted', options.loop && 'loop']
    .filter(Boolean)
    .join(' ');
  const tracks = [
    options.chapters && `<track kind="chapters" label="Chapters" srclang="en" src="${attr(options.chapters)}" default>`,
    options.thumbnails && `<track kind="metadata" label="thumbnails" src="${attr(options.thumbnails)}" default>`,
    options.notes && `<track kind="metadata" label="notes" srclang="en" src="${attr(options.notes)}" default>`,
  ]
    .filter(Boolean)
    .join('');
  const media = options.playbackId
    ? `<mux-video playback-id="${attr(options.playbackId)}" src="https://stream.mux.com/${attr(options.playbackId)}.m3u8" playsinline crossorigin="anonymous" preload="metadata" ${flags}>${tracks}</mux-video>`
    : `<video src="${attr(options.src ?? '')}" playsinline crossorigin="anonymous" preload="metadata" ${flags}>${tracks}</video>`;

  let html = template.replaceAll('{{uid}}', uid).replace(MEDIA_PLACEHOLDER, media).replace(END_PLACEHOLDER, options.end ? endMarkup(options.end) : '');
  const label = options.label ? ` aria-label="${attr(options.label)}"` : '';
  const ratio = options.ratio ? ` style="aspect-ratio: ${attr(options.ratio)}"` : '';
  const theme = options.theme === 'projector' ? '' : ' data-pp-theme="desk"';
  html = html.replace('<media-container class="media-skin pp"', `<media-container class="media-skin pp"${label}${ratio}${theme}`);
  return html;
}
