import './site.css';
import { createPortfolioPlayer } from '@/player';
import { cases } from './cases';

for (const figure of document.querySelectorAll<HTMLElement>('figure.case')) {
  const item = cases.find((c) => c.id === figure.dataset.case);
  if (!item) continue;

  const base = `./media/${item.id}`;
  const player = createPortfolioPlayer({
    ...(item.playbackId ? { playbackId: item.playbackId } : { src: `${base}/video.mp4`, thumbnails: `${base}/storyboard.vtt` }),
    poster: item.playbackId ? undefined : `${base}/poster.jpg`,
    chapters: `${base}/chapters.vtt`,
    label: `${item.title} demo`,
    ratio: item.ratio,
  });

  const caption = document.createElement('figcaption');
  caption.innerHTML = `<h3></h3><p></p>`;
  caption.querySelector('h3')!.textContent = item.title;
  caption.querySelector('p')!.textContent = item.meta;

  figure.append(player, caption);
}
