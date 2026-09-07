import { afterEach, expect, it, vi } from 'vitest';
import { invoke, loadSnapshot } from './anki';
afterEach(() => vi.unstubAllGlobals());
it('reports only completed decks, and never sends an API key', async () => {
  const progress = vi.fn();
  const fetch = vi.fn().mockImplementation(async (_url, request) => {
    const { action } = JSON.parse(request.body);
    expect(JSON.parse(request.body)).not.toHaveProperty('key');
    if (action === 'cardReviews') {
      expect(progress).toHaveBeenLastCalledWith({ phase: 'scanning', completed: 0, total: 1 });
    }
    const replies: Record<string, unknown> = { version: 6, getActiveProfile: 'User', deckNamesAndIds: { A: 1 }, getDeckStats: { '1': { name: 'A', new_count: 0, learn_count: 0, review_count: 0 } }, cardReviews: [] };
    return Response.json({ result: replies[action], error: null });
  });
  vi.stubGlobal('fetch', fetch);
  await loadSnapshot(new AbortController().signal, progress);
  expect(progress.mock.calls.map(([value]) => value)).toEqual([
    { phase: 'connecting' }, { phase: 'scanning', completed: 0, total: 1 }, { phase: 'scanning', completed: 1, total: 1 },
  ]);
});
it('restores full deck names when scheduler stats return only the child name', async () => {
  const replies = [6,'User',{'Japanese::Vocabulary':12},{'12':{name:'Vocabulary',new_count:2,learn_count:1,review_count:5}},[[1,2,0,3,1,1,2500,1000,0]],'User'];
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({result:replies.shift(),error:null})));
  const result = await loadSnapshot(new AbortController().signal,()=>{});
  expect(result.decks[0].name).toBe('Japanese::Vocabulary');
  expect(result.reviews[result.decks[0].name]).toHaveLength(1);
});
it('rejects unsupported versions before loading collection data', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({result:5,error:null})); vi.stubGlobal('fetch',fetch);
  await expect(loadSnapshot(new AbortController().signal,()=>{})).rejects.toThrow('version 6'); expect(fetch).toHaveBeenCalledTimes(1);
});
it('surfaces API errors even with HTTP 200', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({result:null,error:'Invalid key'})));
  await expect(invoke('version')).rejects.toThrow('Invalid key');
});
it('explains disconnected Anki', async () => {
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(invoke('version')).rejects.toThrow('Open Anki');
});
it('loads an empty collection without requesting deck stats or review history', async () => {
  const replies = [6,'User',{},'User'];
  const fetch=vi.fn().mockImplementation(async()=>Response.json({result:replies.shift(),error:null})); vi.stubGlobal('fetch',fetch);
  const result=await loadSnapshot(new AbortController().signal,()=>{});
  expect(result.decks).toEqual([]); expect(result.reviews).toEqual({}); expect(fetch).toHaveBeenCalledTimes(4);
});
