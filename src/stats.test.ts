import { describe, expect, it } from 'vitest';
import { dayStart, duration, selectStats, summarize, historyStart, type Review, type Snapshot } from './stats';
const row = (id: number, type: number, ease = 3, time = 10000): Review => [id, 123, 0, ease, 1, 1, 2500, time, type];
describe('review statistics', () => {
  it('counts each card at its earliest learning event before applying date filters', () => {
    const now = new Date(2026,8,7,12).getTime();
    const event = (offset: number, cid: number, type = 0, ease = 3) => {
      const r = row(now - offset, type, ease); r[1] = cid; return r;
    };
    const day = 86400000;
    const data: Snapshot = { profile: 'Test', loadedAt: now,
      decks: [{ name:'A',new_count:0,learn_count:0,review_count:0 }, { name:'A::B',new_count:0,learn_count:0,review_count:0 }],
      reviews: { A: [event(1000,1),event(40*day,1),event(2000,2),event(3000,2),event(5000,3,2),event(6000,4,1),event(7000,5,0,0)],
        'A::B': [event(2*day,6),event(2*day+1000,6),event(-day,7)] } };
    const all = selectStats(data,'');
    expect(all.history.learned).toBe(3);
    expect(all.today.learned).toBe(1);
    expect(selectStats(data,'','7d').history.learned).toBe(2);
    expect(selectStats(data,'A::B','7d').history.learned).toBe(1);
    expect(selectStats(data,'','7d').today).toEqual(all.today);
  });
  it('uses rolling days and clamps month/year subtraction', () => {
    expect(historyStart(new Date(2026,2,31,12,15).getTime(),'30d')).toBe(new Date(2026,2,1,12,15).getTime());
    expect(historyStart(new Date(2026,7,31,12).getTime(),'6m')).toBe(new Date(2026,1,28,12).getTime());
    expect(historyStart(new Date(2024,7,31,12).getTime(),'6m')).toBe(new Date(2024,1,29,12).getTime());
    expect(historyStart(new Date(2024,1,29,12).getTime(),'1y')).toBe(new Date(2023,1,28,12).getTime());
    expect(historyStart(new Date(2026,0,3,12).getTime(),'7d')).toBe(new Date(2025,11,27,12).getTime());
    expect(historyStart(Date.now(),'all')).toBe(-Infinity);
  });
  it('includes the range start and snapshot time, excluding older and future records', () => {
    const now = new Date(2026,8,7,12).getTime(); const start = historyStart(now,'7d');
    const data: Snapshot = { profile:'T',loadedAt:now,decks:[{name:'A',new_count:0,learn_count:0,review_count:0}],
      reviews:{A:[row(start-1,1),row(start,1),row(now,1),row(now+1,1)]} };
    expect(selectStats(data,'','7d').history.count).toBe(2);
  });
  it('counts answer events and excludes manual scheduling records from accuracy and time', () => {
    expect(summarize([row(1,0),row(2,0,1),row(3,1),row(4,2),row(5,3),row(6,4,0)])).toEqual({count:5,time:50000,seconds:10,due:2,retention:80});
  });
  it('does not invent retention or pace for an empty session', () => {
    expect(summarize([])).toMatchObject({count:0,seconds:null,retention:null,time:0});
  });
  it('includes child history without counting parent queue totals twice', () => {
    const now = new Date(2026,8,7,12).getTime();
    const data: Snapshot = {profile:'Test',loadedAt:now,decks:[{name:'A',new_count:10,learn_count:2,review_count:20},{name:'A::B',new_count:5,learn_count:1,review_count:10}],reviews:{A:[row(now-1000,0)],'A::B':[row(now-2000,1),row(now-1000,0),row(now-86400000,1)]}};
    expect(selectStats(data,'')).toMatchObject({total:32,today:{count:2},history:{count:3}});
    expect(selectStats(data,'A').total).toBe(32);
    expect(selectStats(data,'A::B').total).toBe(16);
  });
  it('respects rollover before and after the configured hour', () => {
    expect(dayStart(new Date(2026,8,7,3).getTime(),4)).toBe(new Date(2026,8,6,4).getTime());
    expect(dayStart(new Date(2026,8,7,4).getTime(),4)).toBe(new Date(2026,8,7,4).getTime());
  });
  it('formats durations', () => { expect(duration(0)).toBe('0s'); expect(duration(61500)).toBe('1m 2s'); expect(duration(3720000)).toBe('1h 2m'); });
});
