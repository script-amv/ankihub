import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Layers, RefreshCw, Settings2, Clock3, Check, Sparkles, BookOpen, Activity, X, ChevronDown, Command } from 'lucide-react';
import { loadSnapshot } from './anki';
import { createDemo } from './demo';
import { selectStats, duration, motivation, type Snapshot } from './stats';
import './style.css';

const number = (n: number) => n.toLocaleString();
function App() {
  const [demo, setDemo] = useState(true);
  const [data, setData] = useState<Snapshot | null>(() => createDemo());
  const [scope, setScope] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Connecting to Anki…');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [key, setKey] = useState('');
  const [rollover, setRollover] = useState(4);
  const abort = useRef<AbortController | null>(null);
  async function refresh(live = false) {
    abort.current?.abort();
    if (demo && !live) { setData(createDemo()); setError(''); setLoading(false); return; }
    const controller = new AbortController(); abort.current = controller;
    setLoading(true); setError('');
    try {
      const snapshot = await loadSnapshot(key, controller.signal, setMessage);
      if (controller.signal.aborted) return;
      setData(snapshot);
      setScope(old => snapshot.decks.some(d => d.name === old) ? old : '');
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load your data.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function showDemo() {
    abort.current?.abort(); setDemo(true); setData(createDemo()); setScope(''); setError(''); setLoading(false); setSettings(false);
  }
  function connect() {
    setDemo(false); setData(null); setScope(''); void refresh(true);
  }
  useEffect(() => () => abort.current?.abort(), []);
  const stats = data ? selectStats(data, scope, demo ? 4 : rollover) : null;
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const value = (n: number | undefined) => n === undefined ? '—' : number(n);
  return <div className="app">
    <header className="topbar"><a className="brand" href="./" aria-label="AnkiHub home"><span className="brand-icon"><Layers size={20}/></span>anki<span>hub</span></a><div className="header-right"><span className="connection"><i/>{demo ? 'Demo · sample data' : loading ? 'Connecting' : error ? 'Disconnected' : 'Connected to Anki'}</span><button className="icon-button" onClick={() => setSettings(!settings)} aria-label="Connection settings" aria-expanded={settings}><Settings2 size={17}/></button></div></header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">YOUR DAILY OVERVIEW</div><h1>A little better, every day.</h1><p>{date}</p></div><div className="controls"><div className="select-wrap"><Layers size={15}/><select aria-label="Deck filter" value={scope} onChange={e => setScope(e.target.value)} disabled={!data}><option value="">All decks</option>{data?.decks.map(d => <option key={d.name} value={d.name}>{d.name.replaceAll('::', ' / ')}</option>)}</select><ChevronDown size={13}/></div><button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} className={loading ? 'spinning' : ''}/><span>Refresh</span></button></div></div>
      <div className="release-banner"><span>{demo ? 'Take a look around. This is sample data.' : 'Your data stays in this browser session.'}</span><button onClick={demo ? () => setSettings(true) : showDemo}>{demo ? 'Connect your Anki' : 'Explore demo'}<ArrowUpRight size={13}/></button></div>
      {settings && <section className="glass settings"><div className="section-title"><h2>Connection settings</h2><button className="icon-button" aria-label="Close settings" onClick={() => setSettings(false)}><X size={16}/></button></div><p>Open Anki with <a href="https://ankiweb.net/shared/info/2055492159" target="_blank" rel="noreferrer">AnkiConnect</a> enabled on this computer. In Tools → Add-ons → AnkiConnect → Config, add <code>{location.origin}</code> to <code>webCorsOriginList</code>, then restart Anki.</p><p>When your browser asks, allow local-network access so this page can reach Anki. If access was denied, update this site’s permissions in your browser and reconnect.</p><div className="settings-fields"><label>API key (if configured)<input type="password" value={key} autoComplete="off" onChange={e => setKey(e.target.value)} placeholder="Optional · kept in memory"/></label><label>Study day starts at<select value={rollover} onChange={e => setRollover(Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label><button className="refresh-button" onClick={demo ? connect : () => void refresh()} disabled={loading}>{demo ? 'Connect' : 'Reconnect'}</button></div><p className="small">Match the next-day start time in Anki’s preferences. Times use this computer’s timezone. Live connection requires desktop Anki; the demo works everywhere.</p></section>}
      {error && <div className="notice" role="alert"><div><strong>{data ? 'Couldn’t refresh your overview' : 'Your overview is waiting for Anki'}</strong><p>{error} {data && 'Showing the last successful snapshot.'}</p></div><button onClick={() => setSettings(true)}>Connection settings <ArrowUpRight size={14}/></button></div>}
      <section className={`glass focus ${loading && !data ? 'pending' : ''}`} aria-busy={loading}>
        <div className="section-title"><h2><span className="tiny-icon"><Command size={15}/></span>Today’s focus</h2><span className="pill">{scope ? scope.split('::').at(-1) : 'All decks'}</span></div>
        <div className="focus-body"><div className="focus-main"><div className="focus-count">{value(stats?.total)}<span>cards to go</span></div><p className="motivation">{stats ? motivation(stats.total) : 'Your next step starts here.'}</p><div className="estimate"><Clock3 size={14}/>{stats ? stats.total === 0 ? 'Nothing left in your queue' : stats.today.seconds === null ? 'Time estimate after your first review' : `About ${Math.max(1, Math.ceil(stats.total * stats.today.seconds / 60))} min of focus` : 'Connect Anki to see your focus'}</div></div><div className="queue"><Queue label="Due" value={value(stats?.focus.due)} subtitle="Ready to revisit"/><Queue label="New" value={value(stats?.focus.new)} subtitle="Something to discover"/><Queue label="Learning" value={value(stats?.focus.learn)} subtitle="Making it stick"/></div></div>
        <div className="focus-footer"><span><Sparkles size={13}/>{stats?.total === 0 ? 'You showed up. That’s what counts.' : 'Consistency is where the progress happens.'}</span><span>One card at a time <ArrowUpRight size={13}/></span></div>
      </section>
      <section className="session"><div className="section-heading"><h2>Today’s session</h2><span>The work you’ve put in</span></div><div className="metric-grid"><Metric icon={<Layers size={17}/>} label="Total reviews" value={value(stats?.today.count)} detail="Every answer, a step forward"/><Metric icon={<BookOpen size={17}/>} label="Cards learned" value={value(stats?.today.learned)} unit="new" detail={<><b>{value(stats?.today.due)}</b> due reviews & relearning</>}/><Metric icon={<Clock3 size={17}/>} label="Time invested" value={stats ? duration(stats.today.time) : '—'} detail={stats?.today.seconds != null ? `${stats.today.seconds.toFixed(1)}s per card` : 'Your pace will appear here'}/><Metric icon={<Activity size={17}/>} label="Retention" value={stats?.today.retention != null ? `${stats.today.retention.toFixed(1)}%` : '—'} detail="Correct answers · all review types"/></div></section>
      <section className="history"><div className="section-heading"><h2>All history</h2><span>It all adds up</span></div><div className="glass history-panel"><div className="history-intro"><span className="history-icon"><Layers size={23}/></span><div><h3>A growing body of knowledge.</h3><p>Every session leaves something behind.</p></div></div><div className="history-values"><div><span>Total reviews</span><strong>{value(stats?.history.count)}</strong></div><div><span>Total time</span><strong>{stats ? duration(stats.history.time) : '—'}</strong></div><div><span>New learning reviews</span><strong>{value(stats?.history.learned)}</strong></div></div></div></section>
      <footer className="footer"><span aria-live="polite">{demo ? 'Demo · synthetic data' : loading ? <><RefreshCw size={12} className="spinning"/>{message}</> : data ? <><Check size={12}/>Updated {new Date(data.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{error ? ' · stale' : ''}</> : 'Waiting for connection'}</span><a href="https://github.com/script-amv/ankihub" target="_blank" rel="noreferrer">Open source on GitHub ↗</a></footer>
      <p className="data-note">Learning counts include repeated learning steps. History covers cards currently in your collection. Queue counts follow Anki’s scheduler limits.</p>
      <p className="data-note affiliation">An independent project by <a href="https://github.com/script-amv">script-amv</a>. Not affiliated with Anki or AnkiHub.net.</p>
    </main>
  </div>;
}
function Queue({ label, value, subtitle }: { label: string; value: string; subtitle: string }) { return <div className="queue-row"><div><span>{label}</span><small>{subtitle}</small></div><strong>{value}</strong></div>; }
function Metric({ icon, label, value, unit, detail }: { icon: React.ReactNode; label: string; value: string; unit?: string; detail: React.ReactNode }) { return <article className="glass metric"><div className="metric-label">{icon}<span>{label}</span></div><div className="metric-value">{value}{unit && <span>{unit}</span>}</div><p>{detail}</p></article>; }
createRoot(document.getElementById('root')!).render(<App/>);
