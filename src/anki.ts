import type { Deck, Review, Snapshot } from './stats';
export async function invoke<T>(action: string, params: object = {}, key = '', signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch('http://127.0.0.1:8765', { method: 'POST', body: JSON.stringify({ action, version: 6, params, ...(key ? { key } : {}) }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000) });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Can’t reach Anki. Open Anki on this computer and check that AnkiConnect is enabled.');
  }
  if (!response.ok) throw new Error('Connection blocked. Allow this page’s origin in AnkiConnect settings.');
  const json = await response.json();
  if (json.error) throw new Error(String(json.error));
  if (!Object.hasOwn(json, 'result')) throw new Error('AnkiConnect returned an unexpected response.');
  return json.result as T;
}
export async function loadSnapshot(key: string, signal: AbortSignal, progress: (message: string) => void): Promise<Snapshot> {
  const call = <T,>(action: string, params = {}) => invoke<T>(action, params, key, signal);
  progress('Connecting to Anki…');
  const version = await call<number>('version');
  if (version < 6) throw new Error('Update AnkiConnect to API version 6 to use this dashboard.');
  const profile = await call<string>('getActiveProfile');
  const deckIds = await call<Record<string, number>>('deckNamesAndIds');
  const names = Object.keys(deckIds);
  const stats = names.length ? await call<Record<string, Deck>>('getDeckStats', { decks: names }) : {};
  const reviews: Record<string, Review[]> = {};
  // cardReviews matches one exact deck ID, so fetch every deck, including children.
  for (const [i, deck] of names.entries()) {
    progress(`Reading history · ${i + 1} of ${names.length} decks`);
    const rows = await call<Review[]>('cardReviews', { deck, startID: 0 });
    if (!Array.isArray(rows) || rows.some(r => !Array.isArray(r) || r.length !== 9 || r.some(n => typeof n !== 'number'))) throw new Error('Anki returned an unsupported review history format.');
    reviews[deck] = rows;
  }
  if (await call<string>('getActiveProfile') !== profile) throw new Error('Your Anki profile changed while loading. Refresh to try again.');
  // Scheduler tree names can be leaf-only; use the canonical names from the ID map.
  const decks = names.map(name => {
    const deck = stats[String(deckIds[name])];
    // Anki omits the empty Default deck from its scheduler tree.
    return { ...(deck || { new_count: 0, learn_count: 0, review_count: 0 }), name };
  });
  return { profile, decks, reviews, loadedAt: Date.now() };
}
