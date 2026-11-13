import { createPortfolioPlayer } from '@/player';

// What the workbench plays: the PlayMate demo, with its chapters and storyboard from `apps/preview/public/media`.
export function createPlayer(): HTMLElement {
  return createPortfolioPlayer({
    src: './media/playmate/video.mp4',
    poster: './media/playmate/poster.jpg',
    chapters: './media/playmate/chapters.vtt',
    thumbnails: './media/playmate/storyboard.vtt',
    label: 'PlayMate demo',
  });
}
