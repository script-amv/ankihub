import { describe, expect, it } from 'vitest';
import { dayStart, duration, selectStats, summarize, type Review, type Snapshot } from './stats';
const row = (id: number, type: number, ease = 3, time = 10000): Review => [id, 123, 0, ease, 1, 1, 2500, time, type];
describe('review statistics', () => {
  it('counts learning steps and excludes manual scheduling records from accuracy and time', () => {
    expect(summarize([row(1,0),row(2,0,1),row(3,1),row(4,2),row(5,3),row(6,4,0)])).toEqual({count:5,time:50000,seconds:10,learned:2,due:2,retention:80});
  });
  it('does not invent retention or pace for an empty session', () => {
    expect(summarize([])).toMatchObject({count:0,seconds:null,retention:null,time:0});
  });
  it('includes child history without counting parent queue totals twice', () => {
    const now = new Date(2026,8,7,12).getTime();
    const data: Snapshot = {profile:'Test',loadedAt:now,decks:[{name:'A',new_count:10,learn_count:2,review_count:20},{name:'A::B',new_count:5,learn_count:1,review_count:10}],reviews:{A:[row(now-1000,0)],'A::B':[row(now-2000,1),row(now-1000,0),row(now-86400000,1)]}};
    expect(selectStats(data,'',4)).toMatchObject({total:32,today:{count:2},history:{count:3}});
    expect(selectStats(data,'A',4).total).toBe(32);
    expect(selectStats(data,'A::B',4).total).toBe(16);
  });
  it('respects rollover before and after the configured hour', () => {
    expect(dayStart(new Date(2026,8,7,3).getTime(),4)).toBe(new Date(2026,8,6,4).getTime());
    expect(dayStart(new Date(2026,8,7,4).getTime(),4)).toBe(new Date(2026,8,7,4).getTime());
  });
  it('formats durations', () => { expect(duration(0)).toBe('0s'); expect(duration(61500)).toBe('1m 2s'); expect(duration(3720000)).toBe('1h 2m'); });
});
