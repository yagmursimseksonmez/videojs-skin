// The skin's own parts, built on Video.js v10 state: the chapter display on the projector's deck with its reverse and
// advance keys, the design note pinned to the line, the chapter slides that show when the video stops, and the thin
// progress line.
import {
  chaptersTrack,
  defineTextTrack,
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

/** Below this screen height the slides no longer come up by themselves on pause: they would cover the whole picture. */
const SHORT_PLAYER = 240;

type Chapter = { start: number; title: string };

/** The design notes, when the media has them: a metadata track labelled "notes", a cue for each chapter. */
const notesTrack = defineTextTrack({ kind: 'metadata', label: 'notes' });

/** How far into the note card its pin sits when the card can stand right over the chapter's dot. */
const PIN_INSET = 22;

/** Whether the design notes show. Off until the viewer turns them on; one setting for every player on the page. */
let notesOn = false;
const noteElements = new Set<ChapterNoteElement>();

function setNotes(on: boolean): void {
  notesOn = on;
  for (const element of noteElements) element.requestUpdate();
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The chapters of the media and the one playing now, from the text cues state. At the very end no cue is active any
 * more; with the time, the last chapter started still counts as the one playing.
 */
function readChapters(textCues: ReturnType<typeof selectTextCues>, time?: number) {
  if (!textCues) return { chapters: [] as Chapter[], active: -1 };
  const cues = getTextCues(textCues, chaptersTrack);
  const [current] = getActiveTextCues(textCues, chaptersTrack);
  const chapters = cues.map((cue) => ({ start: cue.startTime, title: cue.text }));
  let active = current ? cues.findIndex((cue) => cue.id === current.id && cue.startTime === current.startTime) : -1;
  if (active < 0 && time !== undefined) {
    for (let i = chapters.length - 1; i >= 0 && active < 0; i--) if (time >= chapters[i]!.start) active = i;
  }
  return { chapters, active };
}

/**
 * "02 / 09  Joining a game": where you are in the case, on the deck's display. It also runs the deck's reverse and
 * advance keys, which move a chapter at a time like a slide projector's. When the chapter changes, the seek bar's loupe
 * fills with the yellow of the dot it just passed (see the stylesheet).
 */
export class ChapterLabelElement extends UIElement {
  static readonly tagName = 'pp-chapter-label';

  readonly #textCues = new PlayerController(this, playerContext, selectTextCues);
  readonly #time = new PlayerController(this, playerContext, selectTime);
  #key = '';
  #index = -1;
  #chapters: Chapter[] = [];
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.closest('media-container')?.addEventListener('click', this.#onStep, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const time = this.#time.value?.currentTime ?? 0;
    const { chapters, active } = readChapters(this.#textCues.value, time);
    const index = Math.max(active, 0);
    const chapter = chapters[index];
    this.toggleAttribute('data-empty', !chapter);
    this.#chapters = chapters;
    this.#syncSteps(time);

    if (chapter && this.#index >= 0 && index !== this.#index) this.#light();
    this.#index = chapter ? index : -1;

    const key = chapter ? `${index}/${chapters.length}/${chapter.title}` : '';
    if (key === this.#key) return;
    this.#key = key;

    if (!chapter) {
      this.replaceChildren();
      return;
    }

    const count = this.ownerDocument.createElement('span');
    count.className = 'pp-chapter-count';
    count.innerHTML = `<span class="pp-sr">, chapter </span><span class="pp-chapter-current">${pad(index + 1)}</span><span aria-hidden="true"> / </span><span class="pp-sr"> of </span>${pad(chapters.length)}`;

    const title = this.ownerDocument.createElement('span');
    title.className = 'pp-chapter-title';
    title.textContent = chapter.title;

    this.replaceChildren(title, count);
  }

  /** Reverse and advance: shown when there are chapters to move between, off at either end. */
  #syncSteps(time: number): void {
    for (const button of this.closest('media-container')?.querySelectorAll<HTMLElement>('[data-pp-step]') ?? []) {
      button.hidden = this.#chapters.length < 2;
      const target = this.#target(Number(button.dataset.ppStep), time);
      if (target === undefined) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
    }
  }

  /**
   * Where a key goes: advance to the next chapter's start; reverse to the start of this chapter, or of the one before
   * if this one has only just begun.
   */
  #target(step: number, time: number): number | undefined {
    const starts = this.#chapters.map((chapter) => chapter.start);
    if (step > 0) return starts.find((start) => start > time + 0.25);
    const passed = starts.filter((start) => start <= time + 0.25);
    const current = passed.length ? passed[passed.length - 1]! : 0;
    if (time - current > 2) return current;
    const before = starts.filter((start) => start < current - 0.01);
    return before.length ? before[before.length - 1] : time > 0.25 ? 0 : undefined;
  }

  #onStep = (event: Event): void => {
    const button = (event.target as Element | null)?.closest?.<HTMLElement>('[data-pp-step]');
    const container = this.closest('media-container');
    if (!button || !container?.contains(button)) return;
    const media = container.querySelector<HTMLMediaElement>('video, mux-video, hls-video');
    const target = media ? this.#target(Number(button.dataset.ppStep), media.currentTime) : undefined;
    if (media && target !== undefined) media.currentTime = target;
  };

  /** Lights the loupe again from the beginning, even if the last light is still dimming. */
  #light(): void {
    const thumb = this.closest('media-container')?.querySelector<HTMLElement>('.pp-seek-thumb');
    if (!thumb) return;
    thumb.removeAttribute('data-pp-lit');
    void thumb.offsetWidth;
    thumb.setAttribute('data-pp-lit', '');
  }
}

/**
 * The designer's note on the chapter playing now: one sentence on why, on a card over the bottom of the picture. The
 * card moves along to stand over the chapter's dot on the seek bar, and a thin line pins it there. Notes show once
 * turned on from Notes in the settings menu, or with N; the switch is there only when the video has notes.
 */
export class ChapterNoteElement extends UIElement {
  static readonly tagName = 'pp-chapter-note';

  readonly #textCues = new PlayerController(this, playerContext, selectTextCues);
  readonly #time = new PlayerController(this, playerContext, selectTime);
  #text = '';
  #index = -1;
  #placed = '';
  #hasNotes = false;
  #frame = 0;
  #resize: ResizeObserver | null = null;
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    noteElements.add(this);
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;
    this.#resize = new ResizeObserver(() => this.#schedule());
    const container = this.closest('media-container');
    if (container) {
      this.#resize.observe(container);
      container.addEventListener('checked-change', this.#onSwitch, { signal });
      container.addEventListener('keydown', this.#onKeydown, { signal });
    }
    this.#resize.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    noteElements.delete(this);
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#resize?.disconnect();
    this.#resize = null;
    cancelAnimationFrame(this.#frame);
  }

  #toggle(): HTMLElement & { checked: boolean } | null {
    return this.closest('media-container')?.querySelector('.pp-notes-toggle') ?? null;
  }

  #onSwitch = (event: Event): void => {
    if (event.target !== this.#toggle()) return;
    setNotes((event as CustomEvent<{ checked: boolean }>).detail.checked);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey || !this.#hasNotes) return;
    if ((event.target as Element | null)?.closest?.('input, textarea, [contenteditable]')) return;
    setNotes(!notesOn);
  };

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const textCues = this.#textCues.value;
    const { chapters, active } = readChapters(textCues, this.#time.value?.currentTime);
    const index = Math.max(active, 0);
    const chapter = chapters[index];
    // The note that starts with the chapter; one a moment off its start still counts.
    const notes = textCues ? getTextCues(textCues, notesTrack) : [];
    const note = chapter ? notes.find((cue) => Math.abs(cue.startTime - chapter.start) < 0.5) : undefined;
    const text = note?.text.trim() ?? '';

    this.#hasNotes = notes.length > 0;
    const toggle = this.#toggle();
    if (toggle) {
      toggle.hidden = !this.#hasNotes;
      if (toggle.checked !== notesOn) toggle.checked = notesOn;
    }

    this.#index = chapter ? index : -1;
    this.dataset.chapter = chapter ? `${pad(index + 1)} · ${chapter.title}` : '';
    if (text !== this.#text) {
      this.#text = text;
      this.textContent = text;
    }
    // The time moves on every frame; the chip only needs placing when the chapter, the note or the switch changes.
    const placed = `${this.#index}|${text}|${notesOn}`;
    if (placed === this.#placed) return;
    this.#placed = placed;
    this.#schedule();
  }

  #schedule(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#place());
  }

  /** Moves the card over the chapter's dot, inside the deck's width, and sizes the pin from the card down to the dot. */
  #place(): void {
    const container = this.closest('media-container');
    // A short player has no room for a note over its picture.
    const short = !!container?.hasAttribute('data-pp-short');
    this.toggleAttribute('data-open', notesOn && !!this.#text && !short);
    const parent = this.offsetParent as HTMLElement | null;
    const dot = container?.querySelectorAll('.pp-seek > .pp-seek-chapters .pp-seek-dot')[this.#index];
    if (!parent || !dot || !this.hasAttribute('data-open')) return;

    const box = parent.getBoundingClientRect();
    const d = dot.getBoundingClientRect();
    const dotX = d.left + d.width / 2 - box.left;
    const dotTop = d.top + d.height / 2 - 6 - box.top;
    const inset = 12;
    const x = Math.max(inset, Math.min(dotX - PIN_INSET, parent.clientWidth - inset - this.offsetWidth));
    this.style.setProperty('--pp-note-x', `${x}px`);
    this.style.setProperty('--pp-pin-x', `${dotX - x}px`);
    this.style.setProperty('--pp-pin-h', `${Math.max(0, dotTop - this.offsetTop - this.offsetHeight)}px`);
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
  #lastActive = -1;
  #disconnect: AbortController | null = null;
  #resize: ResizeObserver | null = null;
  #deck: ResizeObserver | null = null;

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

      // The deck sits under the picture: the player keeps room for it as tall as it is at this width.
      const deck = container.querySelector<HTMLElement>('.pp-bar');
      if (deck) {
        this.#deck = new ResizeObserver(() => container.style.setProperty('--pp-deck', `${deck.offsetHeight}px`));
        this.#deck.observe(deck);
      }
      this.#resize = new ResizeObserver(([entry]) => {
        const short = (entry?.contentRect.height ?? 0) < SHORT_PLAYER;
        container.toggleAttribute('data-pp-short', short);
        // Wide enough for the desk theme to set things beside the monitor (its own width, so the gutters don't count).
        container.toggleAttribute('data-pp-wide', (entry?.borderBoxSize?.[0]?.inlineSize ?? 0) >= 720);
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
    this.#deck?.disconnect();
    this.#deck = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const { chapters, active } = readChapters(this.#textCues.value, this.#time.value?.currentTime);
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

    // Keep the chapter playing now in view as it changes, unless the viewer is moving along the row.
    if (open && active !== this.#lastActive && !this.contains(this.ownerDocument.activeElement)) {
      requestAnimationFrame(() => this.#scrollTo(this.#buttons[active], 'center'));
    }
    this.#lastActive = active;
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
    // A menu or popover open in the player closes first.
    if ((event.target as Element | null)?.closest?.('[data-popup]')) return;
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

for (const element of [ChapterLabelElement, ChapterNoteElement, ChapterDiscsElement, ProgressElement]) {
  if (!customElements.get(element.tagName)) customElements.define(element.tagName, element);
}
