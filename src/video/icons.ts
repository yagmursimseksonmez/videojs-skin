// The skin's own icons, drawn on a 24px grid in the portfolio's quiet style: filled shapes for
// play and pause, a 1.75px rounded line for everything else.
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const speaker =
  '<path fill="currentColor" stroke="none" d="M4 9.25h2.9l4.1-3.66c.5-.44 1.25-.09 1.25.57v11.68c0 .66-.76 1.01-1.25.57L6.9 14.75H4a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1Z"/>';

export const icons = {
  play: svg(
    '<path fill="currentColor" stroke="none" d="M8.5 5.62v12.76c0 .84.93 1.35 1.63.9l9.96-6.38a1.07 1.07 0 0 0 0-1.8L10.13 4.72c-.7-.45-1.63.06-1.63.9Z"/>'
  ),
  pause: svg(
    '<rect fill="currentColor" stroke="none" x="6.25" y="5" width="4" height="14" rx="1.4"/><rect fill="currentColor" stroke="none" x="13.75" y="5" width="4" height="14" rx="1.4"/>'
  ),
  restart: svg('<path d="M4.75 12a7.25 7.25 0 1 0 2.12-5.13"/><path d="M4.75 4.75V8.5H8.5"/>'),
  'volume-high': svg(`${speaker}<path d="M15.5 9.25a3.9 3.9 0 0 1 0 5.5"/><path d="M18.1 6.6a7.6 7.6 0 0 1 0 10.8"/>`),
  'volume-low': svg(`${speaker}<path d="M15.5 9.25a3.9 3.9 0 0 1 0 5.5"/>`),
  'volume-off': svg(`${speaker}<path d="m15.75 9.75 4.5 4.5"/><path d="m20.25 9.75-4.5 4.5"/>`),
  'fullscreen-enter': svg(
    '<path d="M4.75 9V5.75a1 1 0 0 1 1-1H9"/><path d="M15 4.75h3.25a1 1 0 0 1 1 1V9"/><path d="M19.25 15v3.25a1 1 0 0 1-1 1H15"/><path d="M9 19.25H5.75a1 1 0 0 1-1-1V15"/>'
  ),
  'fullscreen-exit': svg(
    '<path d="M9 4.75V8a1 1 0 0 1-1 1H4.75"/><path d="M15 4.75V8a1 1 0 0 0 1 1h3.25"/><path d="M19.25 15H16a1 1 0 0 0-1 1v3.25"/><path d="M4.75 15H8a1 1 0 0 1 1 1v3.25"/>'
  ),
  // The chapters: a dot for each one, as on the seek bar.
  chapters: svg(
    '<circle fill="currentColor" stroke="none" cx="5" cy="7" r="1.5"/><circle fill="currentColor" stroke="none" cx="5" cy="12" r="1.5"/><circle fill="currentColor" stroke="none" cx="5" cy="17" r="1.5"/><path d="M9.5 7h10"/><path d="M9.5 12h10"/><path d="M9.5 17h6.5"/>'
  ),
  close: svg('<path d="m7 7 10 10"/><path d="M17 7 7 17"/>'),
  seek: svg('<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>'),
};
