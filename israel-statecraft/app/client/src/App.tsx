import React, { useEffect, useState } from 'react';
import { api, type ScenarioInfo } from './api.js';
import { GameScreen } from './GameScreen.js';
import { ReplayScreen } from './ReplayScreen.js';

type Route = { screen: 'home' } | { screen: 'game'; runId: string } | { screen: 'replay'; runId: string };

function parseHash(): Route {
  const h = location.hash;
  const game = h.match(/^#\/game\/(.+)$/);
  if (game) return { screen: 'game', runId: game[1] };
  const replay = h.match(/^#\/replay\/(.+)$/);
  if (replay) return { screen: 'replay', runId: replay[1] };
  return { screen: 'home' };
}

export function App() {
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [route, setRoute] = useState<Route>(parseHash());
  const [runs, setRuns] = useState<{ runId: string; meta: { createdAt?: string; seed?: string } }[]>([]);
  const [error, setError] = useState('');
  const [model, setModel] = useState<string>('mock');

  useEffect(() => {
    api.scenario().then((s) => { setScenario(s); setModel(localStorage.getItem('model') ?? s.defaultModel); }).catch(() => setError('השרת אינו זמין. הפעל: npm run dev'));
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (route.screen === 'home') api.listRuns().then(setRuns).catch(() => undefined);
  }, [route]);

  if (error) return <div className="home"><h1>ממלכתיות</h1><p className="desc">{error}</p></div>;
  if (!scenario) return <div className="home"><h1>ממלכתיות</h1><p className="desc">טוען…</p></div>;

  if (route.screen === 'game') {
    return <GameScreen scenario={scenario} runId={route.runId} onExit={() => { location.hash = ''; }} />;
  }
  if (route.screen === 'replay') {
    return <ReplayScreen scenario={scenario} runId={route.runId} onExit={() => { location.hash = ''; }} />;
  }

    const startRun = async () => {
    const { runId } = await api.newRun(undefined, model);
    location.hash = `#/game/${runId}`;
  };

  const TIER_ICON: Record<string, string> = { mock: '⚙️', fast: '⚡', balanced: '⚖️', strong: '✦' };

  return (
    <div className="home">
      <h1>{scenario.meta.titleHe}</h1>
      <p className="desc">{scenario.meta.descriptionHe}</p>
      <p className="desc" style={{ fontSize: 12.5 }}>
        משחק בזמן אמת — ללא השהיה וללא כפתור חזרה. אתה קובע מה הממשלה מנסה; העולם קובע מה קורה.
        משך ריצה מלאה: כ־16 דקות.
      </p>
      <div className="model-picker" role="radiogroup" aria-label="בחירת מנוע ה-AI">
        <h3>בחר את מנוע המשחק</h3>
        <div className="model-options">
          {scenario.models.map((m) => (
            <button key={m.id} className={`model-card ${model === m.id ? 'on' : ''}`} onClick={() => { setModel(m.id); localStorage.setItem('model', m.id); }} role="radio" aria-checked={model === m.id}>
              <span className="model-name">{TIER_ICON[m.tier] ?? '•'} {m.nameHe}</span>
              <span className="model-note">{m.noteHe}</span>
            </button>
          ))}
        </div>
        {!scenario.liveAvailable && (
          <p className="desc" style={{ fontSize: 11.5, marginTop: 4 }}>
            מודלים חיים אינם זמינים כעת. להפעלתם: הריצו את השרת עם <code>MODEL_PROVIDER=claude-cli</code> לאחר <code>claude login</code>.
          </p>
        )}
      </div>
      <button className="bigbtn" onClick={startRun}>התחלת כהונה{model !== 'mock' ? ' 🔴 חי' : ''}</button>
      {runs.length > 0 && (
        <>
          <h3 style={{ margin: '8px 0 0' }}>ריצות מוקלטות — שחזור</h3>
          <div className="runs-list">
            {runs.slice(0, 12).map((r) => (
              <div key={r.runId} className="run-row">
                <span>{r.runId}</span>
                <button className="iconbtn" onClick={() => { location.hash = `#/replay/${r.runId}`; }}>🎞️ שחזור</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
