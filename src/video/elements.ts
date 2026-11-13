// The skin's own parts, built on Video.js v10 state: the chapter label over the seek bar, the chapter discs that
// show when the video stops, and the thin progress line left when the controls fade out.
import {
  chaptersTrack,
  getActiveTextCues,
  getTextCues,
  PlayerController,
  playerContext,
  type PropertyValues,
  selectPlayback,
  selectTextCues,
  selectTime,
  UIElement,
} from '@videojs/html';

/** Below this player height the discs no longer open by themselves on pause: they would cover the whole frame. */
const SHORT_PLAYER = 300;

type Chapter = { start: number; title: string };

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The chapters of the media and the one playing now, from the text cues state. */
function readChapters(textCues: ReturnType<typeof selectTextCues>) {
  if (!textCues) return { chapters: [] as Chapter[], active: -1 };
  const cues = getTextCues(textCues, chaptersTrack);
  const [current] = getActiveTextCues(textCues, chaptersTrack);
  const chapters = cues.map((cue) => ({ start: cue.startTime, title: cue.text }));
  const active = current ? cues.findIndex((cue) => cue.id === current.id && cue.startTime === current.startTime) : -1;
  return { chapters, active };
}

/** "02 / 09  Joining a game": where you are in the case, above the seek bar. */
export class ChapterLabelElement extends UIElement {
  static readonly tagName = 'pp-chapter-label';

  readonly #textCues = new PlayerController(this, playerContext, selectTextCues);
  #key = '';

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const { chapters, active } = readChapters(this.#textCues.value);
    const index = Math.max(active, 0);
    const chapter = chapters[index];
    this.toggleAttribute('data-empty', !chapter);

    const key = chapter ? `${index}/${chapters.length}/${chapter.title}` : '';
    if (key === this.#key) return;
    this.#key = key;

    if (!chapter) {
      this.replaceChildren();
      return;
    }

    const count = this.ownerDocument.createElement('span');
    count.className = 'pp-chapter-count';
    count.innerHTML = `<span class="pp-sr">Chapter </span>${pad(index + 1)}<span aria-hidden="true"> / </span><span class="pp-sr"> of </span>${pad(chapters.length)}`;

    const title = this.ownerDocument.createElement('span');
    title.className = 'pp-chapter-title';
    title.textContent = chapter.title;

    this.replaceChildren(count, title);
  }
}

/**
 * The chapters as discs, like the projects on the portfolio's homepage: a frame of each chapter in a circle, its time
 * and its name. They open by themselves when the video stops (before it starts, when paused, at the end) and from the
 * Chapters button at any time. Picking one plays the case from there. Escape closes them.
 */
export class ChapterDiscsElement extends UIElement {
  static readonly tagName = 'pp-chapter-discs';

  readonly #textCues = new PlayerController(this, playerContext, selectTextCues);
  readonly #playback = new PlayerController(this, playerContext, selectPlayback);
  readonly #time = new PlayerController(this, playerContext, selectTime);

  #list: HTMLOListElement | null = null;
  #buttons: HTMLButtonElement[] = [];
  #chaptersKey = '';
  #forced = false;
  #dismissed = false;
  #wasPaused = true;
  #short = false;
  #open = false;
  #focusIndex = -1;
  #pointerPick = false;
  #disconnect: AbortController | null = null;
  #resize: ResizeObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;

    this.addEventListener('keydown', this.#onKeydown, { signal });
    this.addEventListener(
      'focusin',
      (event) => {
        const index = this.#buttons.indexOf(event.target as HTMLButtonElement);
        if (index >= 0 && index !== this.#focusIndex) {
          this.#focusIndex = index;
          this.#buttons.forEach((b, i) => (b.tabIndex = i === index ? 0 : -1));
        }
      },
      { signal }
    );
    this.addEventListener('click', this.#onClick, { signal });
    this.#toggleButton()?.addEventListener('click', this.#onToggle, { signal });

    const container = this.#container();
    if (container) {
      // Portrait phone recordings and wide videos crop into the discs differently (see the stylesheet).
      const media = container.querySelector<HTMLVideoElement>('video, mux-video, hls-video');
      const orient = () => {
        if (!media?.videoWidth) return;
        container.dataset.ppOrientation = media.videoHeight > media.videoWidth ? 'portrait' : 'landscape';
      };
      media?.addEventListener('loadedmetadata', orient, { signal });
      orient();

      // Escape closes the discs wherever focus is in the player, as it closes a menu.
      container.addEventListener('keydown', this.#onContainerKeydown, { signal });
      this.#resize = new ResizeObserver(([entry]) => {
        const short = (entry?.contentRect.height ?? 0) < SHORT_PLAYER;
        container.toggleAttribute('data-pp-short', short);
        if (short !== this.#short) {
          this.#short = short;
          this.requestUpdate();
        }
      });
      this.#resize.observe(container);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#resize?.disconnect();
    this.#resize = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const { chapters, active } = readChapters(this.#textCues.value);
    const playback = this.#playback.value;
    const paused = playback ? playback.paused : true;

    // A new pause opens the discs again, even if they were closed during the last one.
    if (paused && !this.#wasPaused) this.#dismissed = false;
    if (!paused && this.#wasPaused) {
      this.#forced = false;
      this.#dismissed = false;
    }
    this.#wasPaused = paused;

    this.#render(chapters);
    // One tab stop for the whole row (the chapter playing now, or the one last focused); arrow keys move within it.
    const roving = this.#focusIndex >= 0 ? this.#focusIndex : Math.max(active, 0);
    this.#buttons.forEach((button, i) => {
      if (i === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      button.toggleAttribute('data-passed', active >= 0 && i < active);
      button.tabIndex = i === roving ? 0 : -1;
    });

    const open = chapters.length > 1 && (this.#forced || (paused && !this.#dismissed && !this.#short));
    this.#setOpen(open);
  }

  #render(chapters: Chapter[]): void {
    const key = chapters.map((c) => `${c.start}:${c.title}`).join('|');
    if (key === this.#chaptersKey) return;
    this.#chaptersKey = key;

    const doc = this.ownerDocument;
    const list = doc.createElement('ol');
    list.className = 'pp-discs-list';
    list.setAttribute('aria-label', 'Chapters');

    this.#buttons = chapters.map((chapter, i) => {
      const item = doc.createElement('li');
      item.className = 'pp-disc-item';
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'pp-disc';
      button.dataset.index = String(i);
      button.dataset.start = String(chapter.start);

      const image = doc.createElement('span');
      image.className = 'pp-disc-image';
      const thumbnail = doc.createElement('media-thumbnail');
      thumbnail.className = 'pp-disc-thumbnail';
      // A moment into the chapter, past any transition into it.
      thumbnail.setAttribute('time', String(chapter.start + 0.6));
      image.append(thumbnail);

      const time = doc.createElement('span');
      time.className = 'pp-disc-time';
      time.textContent = formatTime(chapter.start);

      const title = doc.createElement('span');
      title.className = 'pp-disc-title';
      title.textContent = chapter.title;

      button.append(image, time, title);
      item.append(button);
      return button;
    });

    list.append(...this.#buttons.map((b) => b.parentElement!));
    this.#list = list;
    this.replaceChildren(list);
    this.toggleAttribute('data-empty', chapters.length < 2);
    this.#toggleButton()?.toggleAttribute('hidden', chapters.length < 2);
  }

  #setOpen(open: boolean): void {
    if (open === this.#open) return;
    this.#open = open;

    const hadFocus = this.contains(this.ownerDocument.activeElement);
    this.toggleAttribute('data-open', open);
    this.inert = !open;
    this.#container()?.toggleAttribute('data-pp-chapters', open);

    const toggle = this.#toggleButton();
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Hide chapters' : 'Chapters');

    this.#focusIndex = -1;
    if (open) {
      // Bring the chapter playing now into view in a row that scrolls.
      this.#scrollTo(this.#buttons.find((b) => b.hasAttribute('aria-current')), 'center');
    } else if (hadFocus) {
      // Focus never drops to the page: after a click or tap it rests on the player, from the keyboard it goes back
      // to the button that opens the discs.
      const target = this.#pointerPick ? this.#container() : toggle;
      target?.focus({ preventScroll: true });
    }
    this.#pointerPick = false;
  }

  /** Scrolls the row only, never the page around the player. */
  #scrollTo(button: HTMLElement | undefined, align: 'center' | 'nearest'): void {
    const list = this.#list;
    if (!button || !list || list.scrollWidth <= list.clientWidth) return;
    const item = button.parentElement as HTMLElement;
    const start = item.offsetLeft - list.offsetLeft;
    const end = start + item.offsetWidth;
    if (align === 'center') list.scrollLeft = start - (list.clientWidth - item.offsetWidth) / 2;
    else if (start < list.scrollLeft + 16) list.scrollLeft = start - 16;
    else if (end > list.scrollLeft + list.clientWidth - 16) list.scrollLeft = end - list.clientWidth + 16;
  }

  #close(): void {
    if (this.#playback.value?.paused) this.#dismissed = true;
    this.#forced = false;
    this.requestUpdate();
  }

  #onToggle = (): void => {
    if (this.#open) {
      this.#close();
      return;
    }
    this.#forced = true;
    this.#dismissed = false;
    this.requestUpdate();
    // Keyboard users land on the chapter playing now.
    queueMicrotask(() => {
      if (this.ownerDocument.activeElement === this.#toggleButton()) {
        const target = this.#buttons.find((b) => b.tabIndex === 0) ?? this.#buttons[0];
        target?.focus({ preventScroll: true });
      }
    });
  };

  #onClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.pp-disc');
    if (!button) return;
    // A click has a detail count; Enter or Space on the focused disc does not.
    this.#pointerPick = event.detail > 0;
    const start = Number(button.dataset.start);
    this.#time.value?.seek(start);
    const playback = this.#playback.value;
    if (playback?.paused) void playback.play();
    this.#forced = false;
    this.requestUpdate();
  };

  // Arrow keys move along the row, Home and End go to its ends; none of them reach the player's seek shortcuts.
  #onKeydown = (event: KeyboardEvent): void => {
    const index = this.#buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const last = this.#buttons.length - 1;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const next: Record<string, number> = {
      ArrowRight: rtl ? index - 1 : index + 1,
      ArrowLeft: rtl ? index + 1 : index - 1,
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = this.#buttons[Math.min(last, Math.max(0, next[event.key]!))];
    target?.focus({ preventScroll: true });
    this.#scrollTo(target, 'nearest');
  };

  #onContainerKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#open) return;
    event.stopPropagation();
    this.#close();
  };

  #container(): HTMLElement | null {
    return this.closest('media-container');
  }

  #toggleButton(): HTMLButtonElement | null {
    if (!this.id) return null;
    return this.#container()?.querySelector<HTMLButtonElement>(`[aria-controls="${CSS.escape(this.id)}"]`) ?? null;
  }
}

/** A hairline of progress at the bottom edge, left behind when the controls fade out during playback. */
export class ProgressElement extends UIElement {
  static readonly tagName = 'pp-progress';

  readonly #time = new PlayerController(this, playerContext, selectTime);

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const time = this.#time.value;
    const progress = time && time.duration > 0 ? Math.min(1, time.currentTime / time.duration) : 0;
    this.style.setProperty('--pp-progress', String(progress));
  }
}

for (const element of [ChapterLabelElement, ChapterDiscsElement, ProgressElement]) {
  if (!customElements.get(element.tagName)) customElements.define(element.tagName, element);
}
