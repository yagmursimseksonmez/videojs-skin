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
  poster?: string;
  /** Names the player for screen readers, such as "PlayMate demo". */
  label?: string;
  /** The video's width / height, so the page doesn't shift while it loads, such as "1400 / 916". */
  ratio?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

const MEDIA_PLACEHOLDER = '<!-- Add a compatible media component here. -->';

const attr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The skin's markup with one player's media in it. `uid` keeps its ids apart from other players on the page. */
export function portfolioPlayerMarkup(options: PortfolioPlayerOptions, uid: string): string {
  const flags = [options.autoplay && 'autoplay', options.muted && 'muted', options.loop && 'loop']
    .filter(Boolean)
    .join(' ');
  const tracks = [
    options.chapters && `<track kind="chapters" label="Chapters" srclang="en" src="${attr(options.chapters)}" default>`,
    options.thumbnails && `<track kind="metadata" label="thumbnails" src="${attr(options.thumbnails)}" default>`,
  ]
    .filter(Boolean)
    .join('');
  const media = options.playbackId
    ? `<mux-video playback-id="${attr(options.playbackId)}" src="https://stream.mux.com/${attr(options.playbackId)}.m3u8" playsinline crossorigin="anonymous" preload="metadata" ${flags}>${tracks}</mux-video>`
    : `<video src="${attr(options.src ?? '')}" playsinline crossorigin="anonymous" preload="metadata" ${flags}>${tracks}</video>`;

  let html = template.replaceAll('{{uid}}', uid).replace(MEDIA_PLACEHOLDER, media);
  const label = options.label ? ` aria-label="${attr(options.label)}"` : '';
  const ratio = options.ratio ? ` style="aspect-ratio: ${attr(options.ratio)}"` : '';
  html = html.replace('<media-container class="media-skin pp"', `<media-container class="media-skin pp"${label}${ratio}`);
  return html;
}
