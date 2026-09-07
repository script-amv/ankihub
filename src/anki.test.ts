import { afterEach, expect, it, vi } from 'vitest';
import { invoke, loadSnapshot } from './anki';
afterEach(() => vi.unstubAllGlobals());
it('restores full deck names when scheduler stats return only the child name', async () => {
  const replies = [6,'User',{'Japanese::Vocabulary':12},{'12':{name:'Vocabulary',new_count:2,learn_count:1,review_count:5}},[[1,2,0,3,1,1,2500,1000,0]],'User'];
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({result:replies.shift(),error:null})));
  const result = await loadSnapshot('',new AbortController().signal,()=>{});
  expect(result.decks[0].name).toBe('Japanese::Vocabulary');
  expect(result.reviews[result.decks[0].name]).toHaveLength(1);
});
it('rejects unsupported versions before loading collection data', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({result:5,error:null})); vi.stubGlobal('fetch',fetch);
  await expect(loadSnapshot('',new AbortController().signal,()=>{})).rejects.toThrow('version 6'); expect(fetch).toHaveBeenCalledTimes(1);
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
  const result=await loadSnapshot('',new AbortController().signal,()=>{});
  expect(result.decks).toEqual([]); expect(result.reviews).toEqual({}); expect(fetch).toHaveBeenCalledTimes(4);
});
