import './site.css';
import { createPortfolioPlayer } from '@/player';
import { cases } from './cases';

// Two looks of the same skin: a designer's desk, and the projector (?theme=projector).
const theme = new URLSearchParams(location.search).get('theme') === 'projector' ? 'projector' : 'desk';

for (const figure of document.querySelectorAll<HTMLElement>('figure.case')) {
  const item = cases.find((c) => c.id === figure.dataset.case);
  if (!item) continue;

  const base = `./media/${item.id}`;
  const player = createPortfolioPlayer({
    ...(item.playbackId ? { playbackId: item.playbackId } : { src: `${base}/video.mp4`, thumbnails: `${base}/storyboard.vtt` }),
    poster: item.playbackId ? undefined : `${base}/poster.jpg`,
    chapters: `${base}/chapters.vtt`,
    notes: `${base}/notes.vtt`,
    label: `${item.title} ${item.end ? 'promo' : 'demo'}`,
    ratio: item.ratio,
    end: item.end,
    theme,
  });

  const caption = document.createElement('figcaption');
  caption.innerHTML = `<h3></h3><p></p>`;
  caption.querySelector('h3')!.textContent = item.title;
  caption.querySelector('p')!.textContent = item.meta;

  figure.append(player, caption);
}

for (const button of document.querySelectorAll<HTMLButtonElement>('.theme-switch button')) {
  button.setAttribute('aria-pressed', String(button.dataset.theme === theme));
  button.addEventListener('click', () => {
    const next = button.dataset.theme!;
    for (const pp of document.querySelectorAll('.pp')) {
      if (next === 'desk') pp.setAttribute('data-pp-theme', 'desk');
      else pp.removeAttribute('data-pp-theme');
    }
    for (const b of document.querySelectorAll('.theme-switch button')) b.setAttribute('aria-pressed', String(b === button));
    const url = new URL(location.href);
    if (next === 'projector') url.searchParams.set('theme', 'projector');
    else url.searchParams.delete('theme');
    history.replaceState(null, '', url);
  });
}
