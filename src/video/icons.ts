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
  // Reverse and advance, as on a slide projector: a bar and a triangle.
  previous: svg('<path d="M6.5 6v12"/><path fill="currentColor" stroke="none" d="M18 6.9v10.2c0 .7-.8 1.1-1.4.7L9.6 12.7a.85.85 0 0 1 0-1.4l7-5.1c.6-.4 1.4 0 1.4.7Z"/>'),
  next: svg('<path d="M17.5 6v12"/><path fill="currentColor" stroke="none" d="M6 6.9v10.2c0 .7.8 1.1 1.4.7l7-5.1a.85.85 0 0 0 0-1.4l-7-5.1C6.8 5.8 6 6.2 6 6.9Z"/>'),
  // The chapters: the round slide tray seen from above, its slots around the hub.
  tray: svg('<circle cx="12" cy="12" r="8.25"/><circle cx="12" cy="12" r="2"/><path d="M12 3.75v3"/><path d="M12 17.25v3"/><path d="M3.75 12h3"/><path d="M17.25 12h3"/><path d="m6.2 6.2 2.1 2.1"/><path d="m15.7 15.7 2.1 2.1"/><path d="m17.8 6.2-2.1 2.1"/><path d="m8.3 15.7-2.1 2.1"/>'),
  close: svg('<path d="m7 7 10 10"/><path d="M17 7 7 17"/>'),
  seek: svg('<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>'),
  // Settings: two sliders, drawn like the chapters icon.
  settings: svg(
    '<path d="M4.25 8h3"/><circle cx="9.5" cy="8" r="2.25"/><path d="M11.75 8h8"/><path d="M4.25 16h8"/><circle cx="14.5" cy="16" r="2.25"/><path d="M16.75 16h3"/>'
  ),
  speed: svg('<path d="M4.75 16.5a7.25 7.25 0 1 1 14.5 0"/><path d="m12 16.5 3.25-4.25"/>'),
  captions: svg(
    '<rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2.5"/><path d="M7.5 11h4.5"/><path d="M14.5 11h2"/><path d="M7.5 14.5h2"/><path d="M12 14.5h4.5"/>'
  ),
  // Design notes: a note card pinned to a dot, as in the player.
  notes: svg(
    '<rect x="4.75" y="4.25" width="14.5" height="10.5" rx="2.5"/><path d="M8 8h8"/><path d="M8 11h5"/><path d="M8 14.75v3"/><circle fill="currentColor" stroke="none" cx="8" cy="19.5" r="1.5"/>'
  ),
  chevron: svg('<path d="m10 7 5 5-5 5"/>'),
  check: svg('<path d="m5.75 12.5 4 4 8.5-9"/>'),
};
