import type { PortfolioPlayerEnd } from '@/player';

// The videos on the demo page: the Chengel promo first, then the four case demos.
export interface Case {
  id: string;
  title: string;
  meta: string;
  ratio: string;
  /** Set once the video is on Mux; until then the page plays the local copy. */
  playbackId?: string;
  /** The card when the video ends. */
  end?: PortfolioPlayerEnd;
}

const CHENGEL_APP_STORE = 'https://apps.apple.com/app/id6819309538';

export const cases: Case[] = [
  {
    id: 'chengel-promo',
    title: 'Chengel',
    meta: 'A crossword that teaches you words · free on the App Store',
    ratio: '1600 / 900',
    end: {
      title: 'Get Chengel',
      text: 'A crossword that teaches you words. Free, works offline, no subscription.',
      label: 'Download on the App Store',
      href: CHENGEL_APP_STORE,
      qr: './media/chengel-promo/qr.svg',
    },
  },
  { id: 'playmate', title: 'PlayMate', meta: 'Community sports app · 2026 · 3 months', ratio: '1400 / 916' },
  { id: 'chengel', title: 'Chengel', meta: 'Vocabulary puzzles · 2026 · 3 weeks · App Store', ratio: '780 / 1688' },
  { id: 'ikeep', title: 'iKeep', meta: 'Personal vault · 2026 · 1 week · App Store', ratio: '786 / 1708' },
  { id: 'healthbar', title: 'HealthBar', meta: 'RPG health companion · 2026 · ongoing · App Store', ratio: '804 / 1748' },
];
