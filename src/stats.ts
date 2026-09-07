export type Review = [number, number, number, number, number, number, number, number, number];
export type Deck = { name: string; new_count: number; learn_count: number; review_count: number };
export type Snapshot = { decks: Deck[]; reviews: Record<string, Review[]>; loadedAt: number; profile: string };
export function summarize(reviews: Review[]) {
  const valid = reviews.filter(r => r[3] >= 1 && r[3] <= 4);
  const time = valid.reduce((sum, r) => sum + Math.max(0, r[7]), 0);
  return { count: valid.length, time, seconds: valid.length ? time / valid.length / 1000 : null,
    learned: valid.filter(r => r[8] === 0).length,
    due: valid.filter(r => r[8] === 1 || r[8] === 2).length,
    retention: valid.length ? valid.filter(r => r[3] > 1).length / valid.length * 100 : null };
}
export function dayStart(now: number, rollover: number) {
  const date = new Date(now);
  if (date.getHours() < rollover) date.setDate(date.getDate() - 1);
  date.setHours(rollover, 0, 0, 0);
  return date.getTime();
}
export function selectStats(data: Snapshot, scope: string, rollover: number) {
  const selected = data.decks.filter(d => !scope || d.name === scope || d.name.startsWith(scope + '::'));
  const roots = selected.filter(d => !selected.some(parent => d.name.startsWith(parent.name + '::')));
  const focus = roots.reduce((s, d) => ({ new: s.new + d.new_count, learn: s.learn + d.learn_count, due: s.due + d.review_count }), { new: 0, learn: 0, due: 0 });
  const unique = new Map<number, Review>();
  selected.forEach(d => (data.reviews[d.name] || []).forEach(r => unique.set(r[0], r)));
  const reviews = [...unique.values()];
  return { focus, total: focus.new + focus.learn + focus.due, today: summarize(reviews.filter(r => r[0] >= dayStart(data.loadedAt, rollover) && r[0] <= data.loadedAt)), history: summarize(reviews) };
}
export function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function motivation(total: number) {
  if (!total) return 'All caught up. Make room for something else.';
  if (total <= 25) return 'A little focus. A little closer to fluent.';
  if (total <= 100) return 'Small steps today. Lasting knowledge tomorrow.';
  return 'One card at a time. You’re building something lasting.';
}
