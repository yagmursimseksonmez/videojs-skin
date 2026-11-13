// The four cases on the demo page, in the order of the portfolio's homepage after PlayMate, the one wide video.
export interface Case {
  id: string;
  title: string;
  meta: string;
  ratio: string;
  /** Set once the video is on Mux; until then the page plays the local copy. */
  playbackId?: string;
}

export const cases: Case[] = [
  { id: 'playmate', title: 'PlayMate', meta: 'Community sports app · 2026 · 3 months', ratio: '1400 / 916' },
  { id: 'chengel', title: 'Chengel', meta: 'Vocabulary puzzles · 2026 · 3 weeks · App Store', ratio: '780 / 1688' },
  { id: 'ikeep', title: 'iKeep', meta: 'Personal vault · 2026 · 1 week · App Store', ratio: '786 / 1708' },
  { id: 'healthbar', title: 'HealthBar', meta: 'RPG health companion · 2026 · ongoing · App Store', ratio: '804 / 1748' },
];
