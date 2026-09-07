import { dayStart, type Review, type Snapshot } from './stats';

/** Entirely synthetic data. Never reads Anki or browser storage. */
export function createDemo(now = Date.now()): Snapshot {
  const start = dayStart(now, 4);
  const history: Review[] = Array.from({ length: 12480 }, (_, i) => [
    start - (12480 - i) * 600000, i, 0, i % 11 === 0 ? 1 : 3,
    4, 1, 2500, 18000 + (i % 9) * 1000, i % 7 === 0 ? 0 : 1,
  ]);
  const today: Review[] = Array.from({ length: 186 }, (_, i) => [
    start + Math.floor((now - start) * (i + 1) / 187), 20000 + i, 0,
    i % 13 === 0 ? 1 : 3, 4, 1, 2500, 18000 + (i % 9) * 1000, i < 24 ? 0 : 1,
  ]);
  return {
    profile: 'Demo', loadedAt: now,
    decks: [
      { name: 'Japanese', new_count: 12, learn_count: 8, review_count: 64 },
      { name: 'Japanese::Vocabulary', new_count: 12, learn_count: 8, review_count: 64 },
      { name: 'Design', new_count: 0, learn_count: 0, review_count: 0 },
    ],
    reviews: { Japanese: [], 'Japanese::Vocabulary': [...history, ...today], Design: [] },
  };
}
