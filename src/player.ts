// Puts a portfolio player on a page: the skin around a video, its chapters and its storyboard.
import '@videojs/html/video/player';
import './video/skin';
import { portfolioPlayerMarkup, type PortfolioPlayerOptions } from './markup';

export type { PortfolioPlayerOptions };

let count = 0;

export function createPortfolioPlayer(options: PortfolioPlayerOptions): HTMLElement {
  if (options.playbackId) void import('@videojs/html/media/mux-video');

  const player = document.createElement('video-player');
  if (options.poster) player.setAttribute('poster', options.poster);
  player.innerHTML = portfolioPlayerMarkup(options, `pp${++count}`);
  return player;
}
