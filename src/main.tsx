import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Layers, RefreshCw, Clock3, Check, Sparkles, BookOpen, Activity, Command } from 'lucide-react';
import { loadSnapshot, type LoadProgress } from './anki';
import { Dropdown } from './Dropdown';
import { createDemo } from './demo';
import { selectStats, duration, motivation, HISTORY_RANGES, type HistoryRange, type Snapshot } from './stats';
import './style.css';

const number = (n: number) => n.toLocaleString();
function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [demo, setDemo] = useState(false);
  const [scope, setScope] = useState('');
  const [range, setRange] = useState<HistoryRange>('all');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<LoadProgress>({ phase: 'connecting' });
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const liveSnapshot = useRef<Snapshot | null>(null);

  async function refresh() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true); setError(''); setProgress({ phase: 'connecting' });
    try {
      const snapshot = await loadSnapshot(controller.signal, next => {
        if (!controller.signal.aborted) setProgress(next);
      });
      if (controller.signal.aborted) return;
      liveSnapshot.current = snapshot;
      setData(snapshot); setDemo(false);
      setScope(old => snapshot.decks.some(d => d.name === old) ? old : '');
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Could not load your data.');
      if (!liveSnapshot.current) {
        setData(createDemo()); setDemo(true);
        setScope(old => ['Japanese', 'Japanese::Vocabulary', 'Design'].includes(old) ? old : '');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => { void refresh(); return () => abort.current?.abort(); }, []);
  const stats = useMemo(() => data ? selectStats(data, scope, range) : null, [data, scope, range]);
  const deckOptions = useMemo(() => [
    { value: '', label: 'All decks', depth: 0 },
    ...(data?.decks.map(d => ({ value: d.name, label: d.name.replaceAll('::', ' / '), depth: d.name.split('::').length - 1 })) ?? []),
  ], [data]);
  const buttonLabel = loading
    ? progress.phase === 'scanning' ? `${progress.completed} / ${progress.total} decks` : 'Connecting…'
    : !demo && data && !error ? 'Refresh' : 'Connect';
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const value = (n: number | undefined) => n === undefined ? '—' : number(n);
  return <div className="app">
    <header className="topbar"><a className="brand" href="./" aria-label="AnkiHub home"><span className="brand-icon"><Layers size={20}/></span>anki<span>hub</span></a><span className="connection"><i/>{loading ? 'Connecting' : demo ? 'Demo · sample data' : error ? 'Disconnected' : 'Connected to Anki'}</span></header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">YOUR DAILY OVERVIEW</div><h1>A little better, every day.</h1><p>{date}</p></div><div className="controls">
        <Dropdown label="Deck filter" value={scope} options={deckOptions} onChange={setScope} searchable disabled={!data} icon={<Layers size={15}/>}/>
        <button className="refresh-button connect-button" onClick={() => void refresh()} disabled={loading} aria-busy={loading}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''}/><span aria-live="polite">{buttonLabel}</span>
        </button>
      </div></div>
      {demo && <p className="release-banner">Demo data · Connect Anki to see your progress.</p>}
      {error && <div className="notice" role="alert"><div><strong>{demo ? 'Your overview is waiting for Anki' : 'Couldn’t refresh your overview'}</strong>
        <p>{error} {!demo && data && 'Showing the last successful snapshot.'}</p></div>
        <a href="https://github.com/script-amv/ankihub#connect-your-anki" target="_blank" rel="noreferrer">Connection help <ArrowUpRight size={14}/></a>
      </div>}

      <section className={`glass focus ${loading && !data ? 'pending' : ''}`} aria-busy={loading}>
        <div className="section-title"><h2><span className="tiny-icon"><Command size={15}/></span>Today’s focus</h2><span className="pill">{scope ? scope.split('::').at(-1) : 'All decks'}</span></div>
        <div className="focus-body"><div className="focus-main"><div className="focus-count">{value(stats?.total)}<span>cards to go</span></div><p className="motivation">{stats ? motivation(stats.total) : 'Your next step starts here.'}</p><div className="estimate"><Clock3 size={14}/>{stats ? stats.total === 0 ? 'Nothing left in your queue' : stats.today.seconds === null ? 'Time estimate after your first review' : `About ${Math.max(1, Math.ceil(stats.total * stats.today.seconds / 60))} min of focus` : 'Connect Anki to see your focus'}</div></div><div className="queue"><Queue label="Due" value={value(stats?.focus.due)} subtitle="Ready to revisit"/><Queue label="New" value={value(stats?.focus.new)} subtitle="Something to discover"/><Queue label="Learning" value={value(stats?.focus.learn)} subtitle="Making it stick"/></div></div>
        <div className="focus-footer"><span><Sparkles size={13}/>{stats?.total === 0 ? 'You showed up. That’s what counts.' : 'Consistency is where the progress happens.'}</span><span>One card at a time <ArrowUpRight size={13}/></span></div>
      </section>
      <section className="session"><div className="section-heading"><h2>Today’s session</h2><span>The work you’ve put in</span></div><div className="metric-grid"><Metric icon={<Layers size={17}/>} label="Total reviews" value={value(stats?.today.count)} detail="Every answer, a step forward"/><Metric icon={<BookOpen size={17}/>} label="Cards learned" value={value(stats?.today.learned)} unit="new" detail={<><b>{value(stats?.today.due)}</b> due reviews & relearning</>}/><Metric icon={<Clock3 size={17}/>} label="Time invested" value={stats ? duration(stats.today.time) : '—'} detail={stats?.today.seconds != null ? `${stats.today.seconds.toFixed(1)}s per card` : 'Your pace will appear here'}/><Metric icon={<Activity size={17}/>} label="Retention" value={stats?.today.retention != null ? `${stats.today.retention.toFixed(1)}%` : '—'} detail="Correct answers · all review types"/></div></section>
      <section className="history"><div className="section-heading"><h2>History</h2><Dropdown label="History range" value={range} options={HISTORY_RANGES} onChange={setRange}/></div><div className="glass history-panel"><div className="history-intro"><span className="history-icon"><Layers size={23}/></span><div><h3>A growing body of knowledge.</h3><p>Every session leaves something behind.</p></div></div><div className="history-values"><div><span>Total reviews</span><strong>{value(stats?.history.count)}</strong></div><div><span>Total time</span><strong>{stats ? duration(stats.history.time) : '—'}</strong></div><div><span>Cards learned</span><strong>{value(stats?.history.learned)}</strong></div></div></div></section>
      <footer className="footer"><span>{demo ? 'Demo · synthetic data' : data ? <><Check size={12}/>Updated {new Date(data.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{error ? ' · stale' : ''}</> : 'Waiting for connection'}</span><a href="https://github.com/script-amv/ankihub" target="_blank" rel="noreferrer">Open source on GitHub ↗</a></footer>
      <p className="data-note">Cards learned counts each card’s first recorded learning event once. History covers cards currently in your collection. Queue counts follow Anki’s scheduler limits.</p>
      <p className="data-note affiliation">An independent project by <a href="https://github.com/script-amv">script-amv</a>. Not affiliated with Anki or AnkiHub.net.</p>
    </main>
  </div>;
}
function Queue({ label, value, subtitle }: { label: string; value: string; subtitle: string }) { return <div className="queue-row"><div><span>{label}</span><small>{subtitle}</small></div><strong>{value}</strong></div>; }
function Metric({ icon, label, value, unit, detail }: { icon: React.ReactNode; label: string; value: string; unit?: string; detail: React.ReactNode }) { return <article className="glass metric"><div className="metric-label">{icon}<span>{label}</span></div><div className="metric-value">{value}{unit && <span>{unit}</span>}</div><p>{detail}</p></article>; }
createRoot(document.getElementById('root')!).render(<App/>);
