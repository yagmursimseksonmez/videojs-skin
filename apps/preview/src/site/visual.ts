import './site.css';
import './visual.css';
import { createPortfolioPlayer } from '@/player';
import { cases } from './cases';

const theme = new URLSearchParams(location.search).get('theme') === 'projector' ? 'projector' : 'desk';

for (const figure of document.querySelectorAll<HTMLElement>('figure.case')) {
  const item = cases.find((c) => c.id === figure.dataset.case)!;
  const base = `./media/${item.id}`;
  figure.append(
    createPortfolioPlayer({
      src: `${base}/video.mp4`,
      thumbnails: `${base}/storyboard.vtt`,
      poster: `${base}/poster.jpg`,
      chapters: `${base}/chapters.vtt`,
      notes: `${base}/notes.vtt`,
      label: `${item.title} ${item.end ? 'promo' : 'demo'}`,
      ratio: item.ratio,
      end: item.end,
      theme,
    })
  );
  const caption = document.createElement('figcaption');
  caption.innerHTML = `<h3>${item.title}</h3>`;
  figure.append(caption);
}
