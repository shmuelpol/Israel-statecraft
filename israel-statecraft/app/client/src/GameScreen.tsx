// The in-world game screen: map-dominant layout, strategic (curated) feed with
// a detail-resolution toggle, per-theater updates center, one gameplay composer
// with channel modes (auto/internal directive/public declaration) and category
// helpers, clickable context, and the meta Director drawer outside the world.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, connectWs, type ClientView, type ScenarioInfo } from './api.js';
import { MapView, project, computeViewport, israelWindow, fullWindow, clampWindow, type MapWindow, type RegionView } from './MapView.js';

const ICONS: Record<string, string> = {
  ribbon: '🎗️', shield: '🛡️', globe: '🌍', flame: '🔥', us: '🇺🇸', atom: '⚛️', map: '🗺️',
  mountain: '⛰️', coins: '🪙', people: '👥', bank: '🏛️', mega: '📣', tag: '🎖️', gear: '⚙️',
  handshake: '🤝', lock: '🔒', anchor: '⚓', bulb: '💡', rocket: '🚀', web: '🕸️',
};
const URGENCY_HE: Record<string, string> = { immediate: 'מיידי', urgent: 'דחוף', window: 'חלון הזדמנות' };
const KIND_HE: Record<string, string> = { internal: 'פנימי', public: 'ציבורי', diplomatic: 'דיפלומטי', intel: 'מודיעין', hostile: 'עוין', media: 'תקשורת', outcome: 'תוצאה' };
const CONF_HE: Record<string, string> = { high: 'ודאות גבוהה', medium: 'ודאות בינונית', low: 'ודאות נמוכה' };

/** Ref-5 salvage, per product-owner direction: category helpers that seed the
 *  prompt — NOT permanent arena tabs and NOT a control plane. */
const CATEGORIES: { labelHe: string; prefixHe: string }[] = [
  { labelHe: '🪖 צבא וביטחון', prefixHe: 'לרמטכ״ל: ' },
  { labelHe: '🕵️ מודיעין', prefixHe: 'לראש המוסד: ' },
  { labelHe: '🤝 דיפלומטיה', prefixHe: 'למשרד החוץ: ' },
  { labelHe: '🪙 כלכלה', prefixHe: 'לשר האוצר: ' },
  { labelHe: '👥 פנים וחברה', prefixHe: 'בנושא פנים וחברה: ' },
  { labelHe: '🌍 זירה בינלאומית', prefixHe: 'הצהרה בינלאומית: ' },
  { labelHe: '🎗️ חטופים', prefixHe: 'בנושא החטופים: ' },
  { labelHe: '⚖️ משפט וממשל', prefixHe: 'ליועמ״ש: ' },
  { labelHe: '💡 טכנולוגיה וחוסן', prefixHe: 'בנושא הון אנושי וטכנולוגיה: ' },
];

const BRIEFING_TOPICS = [
  { id: 'gaza', nameHe: '🗺️ זירת עזה' },
  { id: 'north', nameHe: '⛰️ הצפון וסוריה' },
  { id: 'iran', nameHe: '⚛️ איראן והגרעין' },
  { id: 'usa', nameHe: '🇺🇸 ארה״ב והמעצמות' },
  { id: 'region', nameHe: '🤝 האזור ונורמליזציה' },
  { id: 'domestic', nameHe: '🏛️ פנים וכלכלה' },
];

function hebDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T00:00:00Z'));
  } catch { return iso; }
}

/** Track a container's size for aspect-fit map projection. */
export function useContainerSize(ref: React.RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 1000, h: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return size;
}

interface Props {
  scenario: ScenarioInfo;
  runId: string;
  onExit: () => void;
}

type Channel = 'auto' | 'internal' | 'public';
type FeedRes = 'strategic' | 'detailed';
type FeedKindFilter = 'all' | 'internal' | 'external' | 'public';

export function GameScreen({ scenario, runId, onExit }: Props) {
  const [view, setView] = useState<ClientView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<Channel>('auto');
  const [feedRes, setFeedRes] = useState<FeedRes>('strategic');
  const [feedKind, setFeedKind] = useState<FeedKindFilter>('all');
  const [directorOpen, setDirectorOpen] = useState(false);
  const [directorText, setDirectorText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefTopic, setBriefTopic] = useState('gaza');
  const [briefing, setBriefing] = useState<Awaited<ReturnType<typeof api.briefing>> | null>(null);
  const [briefErr, setBriefErr] = useState(false);
  const [connLost, setConnLost] = useState(false);
  const lastViewTs = useRef(Date.now());
  const [deepPending, setDeepPending] = useState(false);
  const [inspect, setInspect] = useState<{ kind: 'region' | 'metric' | 'comm' | 'event'; id: string } | null>(null);
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  const typingSent = useRef(0);
  const commsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const mapSize = useContainerSize(mapRef);
  const viewport = useMemo(() => computeViewport(scenario.bounds, mapSize.w, mapSize.h), [scenario, mapSize]);
  const [mapWin, setMapWin] = useState<MapWindow | null>(null);
  const win = mapWin ?? israelWindow(viewport); // Israel-centered by default

  useEffect(() => {
    const off = connectWs(runId, (v) => { lastViewTs.current = Date.now(); setConnLost(false); setView(v); });
    api.state(runId).then(setView).catch(() => undefined);
    return off;
  }, [runId]);

  // connection watchdog: if the socket goes quiet (server restarted, run gone),
  // fall back to polling and surface the problem instead of freezing silently
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - lastViewTs.current < 5000) return;
      api.state(runId)
        .then((v) => {
          if ((v as unknown as { error?: string }).error) { setConnLost(true); return; }
          lastViewTs.current = Date.now(); setConnLost(false); setView(v);
        })
        .catch(() => setConnLost(true));
    }, 3000);
    return () => clearInterval(t);
  }, [runId]);

  useEffect(() => {
    commsRef.current?.scrollTo({ top: commsRef.current.scrollHeight });
  }, [view?.comms.length, feedRes, feedKind]);

  useEffect(() => {
    if (!briefingOpen) return;
    setBriefErr(false);
    api.briefing(runId, briefTopic)
      .then((b) => { if (Array.isArray(b.summaryHe)) setBriefing(b); else setBriefErr(true); })
      .catch(() => setBriefErr(true));
  }, [briefingOpen, briefTopic, runId, view?.simDay && Math.floor(view.simDay / 30)]);

  // three designed themes: flash-light (default) → dark → חמ״ל war-room
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'light');
  const toggleTheme = () => {
    const order = ['light', 'dark', 'hamal'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
    setDark(next !== 'light');
  };

  const toggleContext = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      api.context(runId, [...next]);
      return next;
    });
  };
  const addContext = (id: string) => {
    if (selected.has(id)) return;
    setSelected((prev) => { const next = new Set(prev).add(id); api.context(runId, [...next]); return next; });
  };

  const send = (eventId?: string, optionId?: string, overrideText?: string) => {
    const t = overrideText ?? text;
    if (!t.trim() && !optionId) return;
    api.message(runId, t, [...selected], eventId, optionId, overrideText ? 'auto' : channel);
    if (!overrideText) setText('');
    setSelected(new Set());
  };

  const onType = (v: string) => {
    setText(v);
    const now = Date.now();
    if (v && now - typingSent.current > 2000) {
      typingSent.current = now;
      api.typing(runId); // engagement grace; time never stops
    }
  };

  const sendDirector = () => {
    if (!directorText.trim()) return;
    api.director(runId, directorText);
    setDirectorText('');
  };

  const requestDeep = () => {
    setDeepPending(true);
    api.briefingDeep(runId, briefTopic).catch(() => undefined);
  };

  if (!view) return <div className="home"><h1>{scenario.meta.titleHe}</h1><p className="desc">מתחבר אל חדר המצב…</p></div>;

  const progress = Math.min(100, (view.simDay / 1190) * 100);
  const regions = view.regions as Record<string, RegionView>;
  const deep = view.briefingsDeep?.[briefTopic];

  // event card positions relative to the current map window
  const cards = view.events.map((ev, i) => {
    const anchorLonLat = ev.anchor ?? scenario.points[ev.regionId ?? ''] ?? scenario.regions.find((r) => r.id === ev.regionId)?.labelAt ?? [38, 33];
    const [ax, ay] = project(viewport, anchorLonLat[0], anchorLonLat[1]);
    const axPct = ((ax - win.x) / win.w) * 100;
    const ayPct = ((ay - win.y) / win.h) * 100;
    const onScreen = axPct > -5 && axPct < 105 && ayPct > -5 && ayPct < 105;
    const baseLeft = axPct > 55 ? Math.max(20, axPct - 50) : Math.min(58, Math.max(26, axPct + 10));
    const left = Math.min(74, Math.max(2, baseLeft + i * 11));
    const top = 2 + i * 31;
    return { ev, ax, ay, left, top, onScreen };
  });

  const feedItems = mergeFeed(view).filter((item) => {
    if (item.kind === 'player') return item.text.trim().length > 0;
    if (feedRes === 'strategic' && item.significance !== 'high' && !item.inReplyTo) return false;
    if (feedKind === 'internal') return item.commKind === 'internal' || item.commKind === 'intel' || item.commKind === 'outcome';
    if (feedKind === 'external') return item.commKind === 'diplomatic' || item.commKind === 'hostile';
    if (feedKind === 'public') return item.commKind === 'public' || item.commKind === 'media';
    return true;
  });

  return (
    <div className="game-grid">
      <header className="topbar panel">
        <span className="title">{scenario.meta.titleHe}</span>
        <span className="engine-badge" title="מנוע ה-AI של הריצה">{view.engineHe}</span>
        <span className="date" aria-live="polite">{hebDate(view.dateIso)}</span>
        <div className="progress" title="התקדמות התרחיש — נקודות זהב: אירועי מפתח שקרו">
          <div style={{ width: `${progress}%` }} />
          {view.ticks.map((t, i) => (
            <i key={i} className="tick" style={{ insetInlineStart: `${t.frac * 100}%` }} title={t.titleHe} />
          ))}
        </div>
        <button className={`iconbtn ${briefingOpen ? 'active' : ''}`} onClick={() => setBriefingOpen(!briefingOpen)}>🗂️ מרכז עדכונים</button>
        <button className="iconbtn" onClick={() => setHistoryOpen(!historyOpen)}>📜 היסטוריה</button>
        <button className="iconbtn" onClick={toggleTheme} aria-label="החלפת ערכת נושא" title="בהיר ← כהה ← חמ״ל">
          {theme === 'light' ? '🌙 כהה' : theme === 'dark' ? '📡 חמ״ל' : '☀️ בהיר'}
        </button>
        <button className="iconbtn" onClick={onExit}>יציאה</button>
      </header>

      <aside className="metrics-panel panel" aria-label="מדדי מצב">
        <h3>מדדי מצב</h3>
        {view.metrics.map((m) => (
          <div key={m.id}>
            <div
              className={`metric ${selected.has('metric:' + m.id) ? 'selected' : ''}`}
              onClick={() => setInspect({ kind: 'metric', id: m.id })}
              role="button" tabIndex={0} aria-label={m.nameHe}
              onKeyDown={(e) => e.key === 'Enter' && setInspect({ kind: 'metric', id: m.id })}
            >
              <span className="icon">{ICONS[m.icon] ?? '•'}</span>
              <span className="name">{m.nameHe}{m.dynamic ? ' ✧' : ''}</span>
              <span className="bar" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => <i key={i} className={i <= m.level ? `on-${m.level}` : ''} />)}
              </span>
              <span className="trend">{m.trend > 0 ? '▲' : m.trend < 0 ? '▼' : ''}</span>
            </div>
          </div>
        ))}
        <h3 style={{ marginTop: 12 }}>לחיצה על אלמנט = חלון סקירה. מתוכו אפשר להוסיף להקשר.</h3>
      </aside>

      <section className="front-strip" aria-label="סטטוס הזירות">
        {view.fronts.map((f) => (
          <button key={f.topic} className={`front-card l${f.level} ${briefingOpen && briefTopic === f.topic ? 'active' : ''}`}
            onClick={() => { setBriefTopic(f.topic); setBriefingOpen(true); setDeepPending(false); }}
            title="לחיצה: סקירה מלאה במרכז העדכונים">
            <div className="front-head">
              <span className="front-dot" aria-hidden />
              <span className="front-name">
                <span className="licon" style={{ ['--licon' as string]: `url('/vendor/icons/${FRONT_ICON[f.topic] ?? 'globe'}.svg')` }} aria-hidden /> {f.nameHe}
              </span>
            </div>
            <div className="front-line">{f.lineHe}</div>
            {f.consequenceHe && <div className="front-echo">↩ {f.consequenceHe}</div>}
          </button>
        ))}
      </section>

      <main className="map-area" aria-label="מפה" ref={mapRef}>
        <MapView scenario={scenario} viewport={viewport} window={win} onWindowChange={setMapWin}
          regions={regions} selected={selected} dark={dark}
          onSelectRegion={(id) => setInspect({ kind: 'region', id })}>
          {cards.filter((c) => c.onScreen).map(({ ev, ax, ay, left, top }) => (
            <g key={'anchor' + ev.id}>
              <circle className="event-anchor-pulse" cx={ax} cy={ay} r={6 * win.w / viewport.w} strokeWidth={2 * win.w / viewport.w} />
              <circle className="event-anchor-dot" cx={ax} cy={ay} r={4 * win.w / viewport.w} />
              <path className="event-connector" strokeWidth={1.6 * win.w / viewport.w}
                d={`M${ax},${ay} L${win.x + (left + 16) * win.w / 100},${win.y + (top + 5) * win.h / 100}`} />
            </g>
          ))}
        </MapView>
        <div className="map-controls">
          <button className="iconbtn" title="מבט ישראל" onClick={() => setMapWin(israelWindow(viewport))}>🎯</button>
          <button className="iconbtn" title="מבט אזורי" onClick={() => setMapWin(fullWindow(viewport))}>🌍</button>
          <button className="iconbtn" onClick={() => setMapWin(clampWindow(viewport, { x: win.x + win.w * 0.1, y: win.y + win.h * 0.1, w: win.w * 0.8, h: win.h * 0.8 }))}>＋</button>
          <button className="iconbtn" onClick={() => setMapWin(clampWindow(viewport, { x: win.x - win.w * 0.125, y: win.y - win.h * 0.125, w: win.w * 1.25, h: win.h * 1.25 }))}>－</button>
        </div>
        {!view.office.inOffice && <div className="observer-banner">מצב צופה — אינך מכהן כראש הממשלה. השפעתך ציבורית בלבד.</div>}
        {cards.map(({ ev, left, top }) => (
          <div key={ev.id} className={`event-card u-${ev.urgency} ${cardColor(ev.type)}`} style={{ left: `${left}%`, top: `${top}%`, opacity: 0.55 + ev.urgencyFraction * 0.45 }}>
            <div className="ribbon" />
            <div className="head-strip">
              <h4>
                <span className="urgency-tag">{URGENCY_HE[ev.urgency]}</span>
                <span onClick={() => toggleContext('event:' + ev.id)} style={{ cursor: 'pointer' }}>{ev.titleHe}</span>
              </h4>
            </div>
            <div className="body">
              <p>{ev.descHe}</p>
              <div className="source">המקור: {ev.sourceHe}</div>
              {ev.recommendationHe && (
                <div className="recommendation">
                  <span className="rec-by">🎖️ {ev.recommendedBy}</span> {ev.recommendationHe}
                </div>
              )}
              <div className="options">
                {ev.options.map((o) => (
                  <button key={o.id} className={o.recommended ? 'rec' : ''} onClick={() => send(ev.id, o.id)}
                    title={o.tradeoffHe ?? ''}>
                    <span className="opt-label">{o.recommended ? '★ ' : ''}{o.labelHe}</span>
                    {o.tradeoffHe && <span className="opt-tradeoff">{o.tradeoffHe}</span>}
                  </button>
                ))}
              </div>
              <div className="minor">
                {ev.allowFreeText && <button onClick={() => { toggleContext('event:' + ev.id); }}>✍️ הנחיה חופשית (הוסף להקשר)</button>}
                <button onClick={() => send(ev.id, undefined, `מהי ההערכה המקצועית לגבי: ${ev.titleHe}?`)}>❓ לשאול יועץ</button>
              </div>
            </div>
          </div>
        ))}
      </main>

      <aside className="comms-panel panel" aria-label="ערוץ תקשורת ועדכונים">
        <h3>
          תקשורת ועדכונים
          <span className="feed-controls">
            <button className={`minichip ${feedRes === 'strategic' ? 'on' : ''}`} onClick={() => setFeedRes('strategic')} title="רק התפתחויות ברמה אסטרטגית">אסטרטגי</button>
            <button className={`minichip ${feedRes === 'detailed' ? 'on' : ''}`} onClick={() => setFeedRes('detailed')} title="כל הפרטים השוטפים">מפורט</button>
          </span>
        </h3>
        <div className="feed-filters">
          {([['all', 'הכל'], ['internal', 'פנימי'], ['external', 'חוץ'], ['public', 'ציבורי']] as [FeedKindFilter, string][]).map(([k, l]) => (
            <button key={k} className={`minichip ${feedKind === k ? 'on' : ''}`} onClick={() => setFeedKind(k)}>{l}</button>
          ))}
        </div>
        <div className="comms-list" ref={commsRef}>
          {view.playerMessages.filter((m) => m.status === 'blocked').slice(-2).map((m) => (
            <div key={m.id} className="comm blocked">
              <div className="head"><span className="sender">המערכת</span></div>
              {m.blockedReasonHe}
            </div>
          ))}
          {feedItems.map((item) => item.kind === 'player' ? (
            <div key={item.id} className="comm mine">
              <div className="head"><span className="sender">אתה — ראש הממשלה</span><span className="when">{hebDate(dayToIso(scenario, item.simDay))}</span></div>
              {item.text}{item.late ? ' (הודעה מאוחרת)' : ''}
            </div>
          ) : (
            <div key={item.id} className={`comm k-${item.commKind} ${item.inReplyTo ? 'consequence' : ''} ${selected.has('comm:' + item.id) ? 'selected' : ''}`}
              onClick={() => setInspect({ kind: 'comm', id: item.id })}>
              <div className="head">
                <span className="sender">{item.senderHe} · {KIND_HE[item.commKind ?? ''] ?? ''}</span>
                <span className="when">{hebDate(dayToIso(scenario, item.simDay))}</span>
              </div>
              {item.inReplyTo && <div className="consequence-tag">↩ בעקבות החלטתך</div>}
              {item.text}
              {item.confidence && <div className="conf">{CONF_HE[item.confidence] ?? ''}</div>}
            </div>
          ))}
        </div>
      </aside>

      <section className="composer-area panel" aria-label="תיבת הפעולה">
        <div className="composer-toprow">
          <span className="channel-modes" role="radiogroup" aria-label="סוג הפנייה">
            {([['auto', 'אוטומטי'], ['internal', '🔒 הנחיה פנימית'], ['public', '📣 הצהרה פומבית']] as [Channel, string][]).map(([c, l]) => (
              <button key={c} className={`minichip ${channel === c ? 'on' : ''}`} onClick={() => setChannel(c)}>{l}</button>
            ))}
          </span>
          <span className="context-chips">
            {[...selected].map((id) => (
              <span key={id} className="chip">
                {chipLabel(id, scenario, view)}
                <button onClick={() => toggleContext(id)} aria-label="הסרה">✕</button>
              </span>
            ))}
            {selected.size > 0 && <span className="chip" style={{ borderStyle: 'dashed' }}><button onClick={() => { setSelected(new Set()); }}>נקה הכול</button></span>}
          </span>
        </div>
        <div className="composer-row">
          <textarea
            placeholder={channel === 'public' ? 'נוסח ההצהרה הפומבית שלך…' : channel === 'internal' ? 'הנחיה פנימית לדרג המקצועי…' : 'מה ברצונך לעשות? כתוב הנחיה, שאלה או הצהרה…'}
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            aria-label="תיבת פעולה ראשית"
          />
          <button className="send" onClick={() => send()}>שגר</button>
        </div>
        <div className="category-chips">
          {CATEGORIES.map((c) => (
            <button key={c.labelHe} className="minichip" onClick={() => { setText(c.prefixHe + text); }}>{c.labelHe}</button>
          ))}
        </div>
      </section>

      <button className="director-fab" onClick={() => setDirectorOpen(!directorOpen)} aria-label="ערוץ מנחה המשחק">🎭 מנחה המשחק</button>
      {directorOpen && (
        <div className="director-drawer" role="dialog" aria-label="שיחה עם מנחה המשחק">
          <h3>מנחה המשחק</h3>
          <div className="sub">ערוץ מטא — מחוץ לעולם המשחק. כאן מערערים על פרשנות, שואלים ״למה״, ומתווכחים על מדדים. העולם אינו שומע את השיחה הזו.</div>
          <div className="director-msgs">
            {view.directorChat.map((d) => (
              <div key={d.id} className={`dmsg ${d.from}`}>{d.textHe}</div>
            ))}
          </div>
          <div className="director-input">
            <input value={directorText} onChange={(e) => setDirectorText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendDirector()}
              placeholder="שאלה או ערעור למנחה…" aria-label="הודעה למנחה" />
            <button onClick={sendDirector}>שלח</button>
          </div>
          <button className="iconbtn" style={{ marginTop: 10 }} onClick={() => setDirectorOpen(false)}>סגירה</button>
        </div>
      )}

      {briefingOpen && (
        <div className="briefing-pane panel" role="dialog" aria-label="מרכז עדכונים">
          <div className="briefing-topics">
            <h3>🗂️ מרכז עדכונים</h3>
            {BRIEFING_TOPICS.map((t) => (
              <button key={t.id} className={`iconbtn ${briefTopic === t.id ? 'active' : ''}`} onClick={() => { setBriefTopic(t.id); setDeepPending(false); }}>{t.nameHe}</button>
            ))}
            <button className="iconbtn" style={{ marginTop: 'auto' }} onClick={() => setBriefingOpen(false)}>סגירה</button>
          </div>
          <div className="briefing-body">
            {briefing && briefing.topic === briefTopic ? (
              <>
                <h3>{briefing.nameHe} · {hebDate(view.dateIso)}</h3>
                <h4>תמונת מצב</h4>
                <ul>{briefing.summaryHe.map((l, i) => <li key={i}>{l}</li>)}</ul>
                {briefing.policyHe && (
                  <div className="policy-review">
                    <h4>המדיניות הקיימת מול המצב</h4>
                    <div className="pr-line"><b>הקו הנוכחי:</b> {briefing.policyHe.lineHe}</div>
                    {briefing.policyHe.tensionHe && <div className="pr-tension"><b>המתח:</b> {briefing.policyHe.tensionHe}</div>}
                    {briefing.policyHe.questionHe && <div className="pr-question">⚖️ {briefing.policyHe.questionHe}</div>}
                  </div>
                )}
                {briefing.significantHe.length > 0 && (<>
                  <h4>התפתחויות משמעותיות</h4>
                  <ul>{briefing.significantHe.map((l, i) => <li key={i}>{l}</li>)}</ul>
                </>)}
                <h4>החלטותיך והשתקפותן</h4>
                {briefing.decisionsHe.length === 0 && <p className="soft">טרם קיבלת החלטות בזירה זו. העולם ימשיך לנוע גם בלעדיך.</p>}
                {briefing.decisionsHe.map((d, i) => (
                  <div key={i} className="decision-echo">
                    <div className="d-text">🗣️ {d.textHe}</div>
                    {d.consequencesHe.length === 0
                      ? <div className="d-conseq soft">— טרם נצפתה השתקפות ברורה.</div>
                      : d.consequencesHe.map((c, j) => <div key={j} className="d-conseq">↩ {c}</div>)}
                  </div>
                ))}
                <h4>ניתוח עומק</h4>
                {deep ? <p className="deep-text">🎓 {deep.textHe}</p>
                  : deepPending ? <p className="soft">המועצה לביטחון לאומי מגבשת ניתוח… (מספר שניות)</p>
                    : <button className="iconbtn" onClick={requestDeep}>🎓 בקש ניתוח עומק מהמל״ל</button>}
              </>
            ) : briefErr ? (
              <p className="soft">הסקירה אינה זמינה — ככל הנראה הריצה הסתיימה או שהשרת אותחל מאז שנפתחה. חזור למסך הראשי והתחל כהונה חדשה.</p>
            ) : <p className="soft">טוען סקירה…</p>}
          </div>
        </div>
      )}
      {connLost && (
        <div className="observer-banner" style={{ top: 130, background: 'var(--danger)', color: '#fff' }}>
          החיבור לריצה אבד (ייתכן שהשרת אותחל). <button className="iconbtn" style={{ marginInlineStart: 8 }} onClick={onExit}>למסך הראשי</button>
        </div>
      )}

      {historyOpen && (
        <div className="history-pane" role="dialog" aria-label="היסטוריית הריצה">
          <h3>היסטוריית הריצה</h3>
          <button className="iconbtn" onClick={() => setHistoryOpen(false)}>סגירה</button>
          {mergeFeed(view, true).map((item) => (
            <div key={'h' + item.id} className="history-item">
              <span className="when">{hebDate(dayToIso(scenario, item.simDay))}</span>
              {item.kind === 'player' ? <b>אתה: </b> : <b>{item.senderHe}: </b>}
              {item.text}
            </div>
          ))}
        </div>
      )}

      {inspect && (
        <Inspector
          inspect={inspect} view={view} scenario={scenario}
          onClose={() => setInspect(null)}
          onContext={(id) => { addContext(id); }}
          selected={selected}
          onOpenBriefing={(t) => { setBriefTopic(t); setBriefingOpen(true); setInspect(null); }}
          dateIso={view.dateIso}
        />
      )}

      {view.phase === 'warmup' && (
        <div className="warmup-overlay" role="status">
          <div className="warmup-card">
            <div className="warmup-spinner" />
            <h2>{scenario.meta.titleHe}</h2>
            <p>חדר המצב מתכנס… הדרג המקצועי מציג את תמונת הפתיחה הלאומית.</p>
            <p className="soft">{scenario.provider === 'claude-cli' ? 'המנחה החי מתחמם. הזמן יתחיל לזוז מיד.' : 'הזמן יתחיל לזוז מיד.'}</p>
          </div>
        </div>
      )}

      {view.ended && view.score && <ScoreOverlay score={view.score} onExit={onExit} runId={runId} />}
    </div>
  );
}

const REGION_TOPIC: Record<string, string> = {
  gaza: 'gaza', lebanon: 'north', syria: 'north', iran: 'iran', west_bank: 'domestic',
  red_sea: 'region', persian_gulf: 'iran', egypt: 'region', jordan: 'region', saudi: 'region',
  uae: 'region', turkey: 'region', iraq: 'region', israel: 'domestic',
};

/** Status inspector — instant, from pre-warmed data (fronts + warmed briefings);
 *  context selection is a separate, explicit action inside it (either/or). */
function Inspector({ inspect, view, scenario, onClose, onContext, selected, onOpenBriefing, dateIso }: {
  inspect: { kind: string; id: string };
  view: ClientView; scenario: ScenarioInfo;
  onClose: () => void; onContext: (id: string) => void; selected: Set<string>;
  onOpenBriefing: (topic: string) => void; dateIso: string;
}) {
  let titleHe = ''; let body: React.ReactNode = null; let contextId = ''; let topic: string | null = null;

  if (inspect.kind === 'region') {
    const rdef = scenario.regions.find((r) => r.id === inspect.id);
    const rv = view.regions[inspect.id];
    topic = REGION_TOPIC[inspect.id] ?? null;
    const front = topic ? view.fronts.find((f) => f.topic === topic) : null;
    const deep = topic ? view.briefingsDeep?.[topic] : undefined;
    titleHe = rdef?.nameHe ?? inspect.id;
    contextId = 'region:' + inspect.id;
    body = (
      <>
        {front && <p className="ins-line">{front.lineHe}</p>}
        {rv && <p className="ins-meta">שליטה: {actorName(scenario, rv.controller)} · מצב: {statusHe(rv.status)}{rv.intensity > 0.35 ? ' · ⚔️ זירה חמה' : ''}</p>}
        {front?.consequenceHe && <p className="ins-echo">↩ {front.consequenceHe}</p>}
        {deep && <p className="ins-deep">🎓 {deep.textHe}</p>}
      </>
    );
  } else if (inspect.kind === 'metric') {
    const m = view.metrics.find((x) => x.id === inspect.id);
    titleHe = m?.nameHe ?? inspect.id;
    contextId = 'metric:' + inspect.id;
    body = <>
      <p className="ins-line">{m?.descHe}</p>
      <p className="ins-meta">מגמה: {m && m.trend > 0 ? 'עולה ▲' : m && m.trend < 0 ? 'יורדת ▼' : 'יציבה'} · רמה: {['נמוכה מאוד', 'נמוכה', 'בינונית', 'גבוהה', 'גבוהה מאוד'][m?.level ?? 2]}</p>
      <p className="soft">המדדים איכותיים ומכוונים — אינם מספר מדויק. הם משקפים מצב, לא ניקוד.</p>
    </>;
  } else if (inspect.kind === 'comm') {
    const c = view.comms.find((x) => x.id === inspect.id);
    titleHe = c ? `${c.senderHe}` : 'הודעה';
    contextId = 'comm:' + inspect.id;
    body = <>
      <p className="ins-line">{c?.textHe}</p>
      <p className="ins-meta">{c?.confidence ? `ודאות: ${c.confidence === 'high' ? 'גבוהה' : c.confidence === 'medium' ? 'בינונית' : 'נמוכה'}` : ''}{c?.inReplyTo ? ' · ↩ בעקבות החלטתך' : ''}</p>
      {c?.regionId && <button className="iconbtn" onClick={() => onOpenBriefing(REGION_TOPIC[c.regionId!] ?? 'gaza')}>🗂️ סקירת הזירה במרכז העדכונים</button>}
    </>;
  } else {
    const e = view.events.find((x) => x.id === inspect.id);
    titleHe = e?.titleHe ?? 'אירוע';
    contextId = 'event:' + inspect.id;
    body = <>
      <p className="ins-line">{e?.descHe}</p>
      {e?.detailHe && <p className="ins-meta">{e.detailHe}</p>}
      {e?.recommendationHe && <p className="ins-echo">🎖️ {e.recommendedBy}: {e.recommendationHe}</p>}
    </>;
  }

  return (
    <div className="inspector panel" role="dialog" aria-label={`סקירה: ${titleHe}`}>
      <div className="ins-head">
        <h3>{titleHe}</h3>
        <span className="ins-date">{hebDate(dateIso)}</span>
        <button className="iconbtn" onClick={onClose} aria-label="סגירה">✕</button>
      </div>
      <div className="ins-body">{body}</div>
      <div className="ins-actions">
        {selected.has(contextId)
          ? <span className="soft">✓ בהקשר ההודעה הבאה</span>
          : <button className="iconbtn" onClick={() => onContext(contextId)}>➕ הוסף להקשר ההודעה</button>}
        {topic && <button className="iconbtn" onClick={() => onOpenBriefing(topic!)}>🗂️ סקירה מלאה</button>}
      </div>
    </div>
  );
}

function statusHe(s: string): string {
  const map: Record<string, string> = { normal: 'רגיל', contested: 'מעורער', buffer: 'רצועת חיץ', occupied: 'כבוש', controlled: 'בשליטה', evacuated: 'מפונה', fragmented: 'מפורק', international: 'כוח בינלאומי', demilitarized: 'מפורז', collapsed: 'קרוס' };
  return map[s] ?? s;
}
function actorName(scenario: ScenarioInfo, id: string): string {
  return scenario.actors.find((a) => a.id === id)?.nameHe ?? id;
}

/** front-card Lucide icons (ISC, vendored) */
const FRONT_ICON: Record<string, string> = {
  gaza: 'target', north: 'radar', iran: 'rocket', usa: 'landmark', region: 'handshake', domestic: 'users',
};

/** flash-era type tint (ref 02): pastel family per event type. */
function cardColor(type: string): string {
  const map: Record<string, string> = {
    attack: 'card-c-red', retaliation_dilemma: 'card-c-red', north_dilemma: 'card-c-red',
    ground_op: 'card-c-red', rafah_decision: 'card-c-red', iran_campaign: 'card-c-red',
    resume_war: 'card-c-red', nuclear_decision: 'card-c-red', decapitation: 'card-c-red', security: 'card-c-red',
    hostage_deal: 'card-c-amber', hostage: 'card-c-amber', framework_decision: 'card-c-amber',
    war_aims: 'card-c-amber', readiness_posture: 'card-c-amber', ceasefire_offer: 'card-c-amber',
    diplomacy: 'card-c-blue', intl: 'card-c-blue',
    intel: 'card-c-purple', intel_opportunity: 'card-c-purple', covert_window: 'card-c-purple',
    domestic: 'card-c-green', public: 'card-c-green', military: 'card-c-green',
    governance: 'card-c-teal', humanitarian: 'card-c-teal', syria_opportunity: 'card-c-teal',
  };
  return map[type] ?? 'card-c-blue';
}

function dayToIso(scenario: ScenarioInfo, day: number): string {
  const d = new Date(Date.parse(scenario.clock.startDate + 'T00:00:00Z') + Math.floor(day) * 86400000);
  return d.toISOString().slice(0, 10);
}

interface FeedItem {
  id: string; simDay: number; kind: 'player' | 'comm'; text: string;
  senderHe?: string; commKind?: string; confidence?: string; late?: boolean;
  significance?: string; inReplyTo?: string;
}

function mergeFeed(view: ClientView, full = false): FeedItem[] {
  const comms: FeedItem[] = view.comms.map((c) => ({
    id: c.id, simDay: c.simDay, kind: 'comm', text: c.textHe, senderHe: c.senderHe,
    commKind: c.kind, confidence: c.confidence, significance: c.significance, inReplyTo: c.inReplyTo,
  }));
  const msgs: FeedItem[] = view.playerMessages.filter((m) => m.status !== 'blocked').map((m) => ({ id: m.id, simDay: m.simDay, kind: 'player', text: m.text, late: m.late }));
  const all = [...comms, ...msgs].sort((a, b) => a.simDay - b.simDay);
  return full ? all : all.slice(-80);
}

function chipLabel(id: string, scenario: ScenarioInfo, view: ClientView): string {
  const [type, key] = id.split(':');
  if (type === 'region') return scenario.regions.find((r) => r.id === key)?.nameHe ?? key;
  if (type === 'metric') return view.metrics.find((m) => m.id === key)?.nameHe ?? scenario.metrics.find((m) => m.id === key)?.nameHe ?? key;
  if (type === 'event') return 'אירוע: ' + (view.events.find((e) => e.id === key)?.titleHe ?? key);
  if (type === 'comm') {
    const c = view.comms.find((x) => x.id === key);
    return c ? `הודעה מ${c.senderHe}` : key;
  }
  return id;
}

export function ScoreOverlay({ score, onExit, runId }: { score: NonNullable<ClientView['score']>; onExit: () => void; runId: string }) {
  return (
    <div className="score-overlay" role="dialog" aria-label="דו״ח סיום">
      <div className="score-card">
        <h2>דו״ח מנחה המשחק — סוף התרחיש</h2>
        <div className="score-num">{score.composite}</div>
        <div className="score-dims">
          {score.dimensions.map((d) => (
            <div key={d.id} className="score-dim">
              <span style={{ minWidth: 150 }}>{d.nameHe}</span>
              <span className="db"><div style={{ width: `${d.score}%` }} /></span>
            </div>
          ))}
        </div>
        <div className="explain">{score.explanationHe}</div>
        {score.positivesHe.length > 0 && (<><h4>נקודות חוזק בתמונת הסיום</h4><ul>{score.positivesHe.map((p, i) => <li key={i}>{p}</li>)}</ul></>)}
        {score.negativesHe.length > 0 && (<><h4>נקודות שבר</h4><ul>{score.negativesHe.map((p, i) => <li key={i}>{p}</li>)}</ul></>)}
        {score.unresolvedHe.length > 0 && (<><h4>מלחמות וסוגיות פתוחות</h4><ul>{score.unresolvedHe.map((p, i) => <li key={i}>{p}</li>)}</ul></>)}
        {score.longTermWarningsHe.length > 0 && (<><h4>אזהרות ארוכות טווח</h4><ul>{score.longTermWarningsHe.map((p, i) => <li key={i}>{p}</li>)}</ul></>)}
        <h4>השוואה למהלך היסטורי</h4>
        <p style={{ fontSize: 12.5, lineHeight: 1.7 }}>{score.baselineComparisonHe}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="iconbtn" onClick={() => { location.hash = `#/replay/${runId}`; }}>🎞️ צפייה בשחזור</button>
          <button className="iconbtn" onClick={onExit}>חזרה למסך הראשי</button>
        </div>
      </div>
    </div>
  );
}
