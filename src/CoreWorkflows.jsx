import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Check, Heart, MessageCircle, Plus, RefreshCw, Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from './api';

const dateAtLocalMidnight = (value) => new Date(`${value}T00:00:00`);

function EmptyState({ icon: Icon, title, text, action, actionText }) {
  return <div className="empty-inline">
    <span className="empty-icon"><Icon size={19} /></span>
    <div><strong>{title}</strong><p>{text}</p><Link to={action} className="text-link">{actionText} <ArrowRight size={14} /></Link></div>
  </div>;
}

function ErrorState({ message, retry }) {
  return <div className="form-error" role="alert">{message} <button type="button" className="button button-outline button-sm" onClick={retry}>Try again</button></div>;
}

export function ExchangeWorkspace() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api('/exchange-requests'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (url, method, body) => {
    setError('');
    try {
      await api(url, { method, ...(body ? { body } : {}) });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <div className="content-page">
    <div className="page-intro">
      <div><span className="section-kicker">A LITTLE GIVE & TAKE</span><h1>Your exchanges</h1><p>Every great skill swap begins with a conversation.</p></div>
      <Link to="/app/explore" className="button button-primary"><Plus size={16} /> Find a partner</Link>
    </div>
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <div className="loading-surface">Loading your exchanges…</div> : items.length ? <div className="exchange-list">
      {items.map((item) => <article className="exchange-list-card" key={item.id}>
        <span className="avatar">{item.otherUserName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
        <div className="exchange-list-copy">
          <strong>{item.otherUserName}</strong>
          {item.otherUserBio && <p>{item.otherUserBio}</p>}
          <p>{item.message || 'Let’s learn together.'}</p>
          {(item.otherUserTeaches?.length > 0 || item.otherUserLearns?.length > 0) && <div className="exchange-skill-summary">
            {item.otherUserTeaches?.length > 0 && <span><b>Can teach</b> {item.otherUserTeaches.join(' · ')}</span>}
            {item.otherUserLearns?.length > 0 && <span><b>Wants to learn</b> {item.otherUserLearns.join(' · ')}</span>}
          </div>}
          <small>{item.status.toLowerCase()} · {new Date(item.createdAt).toLocaleDateString()}</small>
          {item.connectionStatus && <small>Learning connection: {item.connectionStatus.toLowerCase()}</small>}
        </div>
        <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
        {item.status === 'PENDING' && item.isIncoming && <div className="exchange-actions">
          <button className="button button-primary button-sm" onClick={() => run(`/exchange-requests/${item.id}/accept`, 'PUT')}>Accept <Check size={14} /></button>
          <button className="button button-outline button-sm" onClick={() => run(`/exchange-requests/${item.id}/reject`, 'PUT')}>Decline</button>
        </div>}
        {item.status === 'PENDING' && !item.isIncoming && <button className="button button-outline button-sm" onClick={() => run(`/exchange-requests/${item.id}`, 'DELETE')}>Cancel request</button>}
        {item.otherUserProfileVisible && <Link to={`/app/users/${item.otherUserId}`} className="button button-outline button-sm">View profile</Link>}
        {item.status === 'ACCEPTED' && item.connectionId && <div className="exchange-actions">
          {item.connectionStatus === 'ACTIVE' && <>
            <Link to="/app/messages" className="button button-outline button-sm">Message <MessageCircle size={14} /></Link>
            <button className="button button-outline button-sm" onClick={() => run(`/connections/${item.connectionId}`, 'PATCH', { status: 'PAUSED' })}>Pause</button>
            <button className="button button-outline button-sm" onClick={() => run(`/connections/${item.connectionId}`, 'PATCH', { status: 'COMPLETED' })}>Complete exchange</button>
          </>}
          {item.connectionStatus === 'PAUSED' && <button className="button button-primary button-sm" onClick={() => run(`/connections/${item.connectionId}`, 'PATCH', { status: 'ACTIVE' })}>Resume exchange</button>}
          {item.connectionStatus === 'COMPLETED' && <span className="muted-small">This exchange is complete.</span>}
        </div>}
      </article>)}
    </div> : <div className="surface-card no-matches">
      <span className="empty-icon"><Users size={20} /></span><h3>Your learning journey starts with a hello.</h3>
      <p>Find someone whose skills complement yours. Send a request to start a free exchange.</p>
      <Link to="/app/explore" className="button button-primary">Explore partners <ArrowRight size={15} /></Link>
    </div>}
  </div>;
}

function ReviewForm({ connectionId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/reviews', { method: 'POST', body: { connectionId, rating, reviewText } });
      setDone(true);
      onSubmitted();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  if (done) return <span className="review-saved"><Check size={13} /> Review saved</span>;
  return <form className="review-inline" onSubmit={submit}>
    <label>Rate this exchange<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
      <option value="5">5 — Great</option><option value="4">4 — Good</option><option value="3">3 — Okay</option>
      <option value="2">2 — Needs work</option><option value="1">1 — Poor</option>
    </select></label>
    <input value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength="1200" placeholder="Share a kind, constructive note (optional)" />
    <button className="button button-outline button-sm" disabled={busy}>{busy ? 'Saving…' : 'Leave review'}</button>
    {error && <small className="form-error" role="alert">{error}</small>}
  </form>;
}

export function SessionWorkspace() {
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState([]);
  const [connections, setConnections] = useState([]);
  const [schedule, setSchedule] = useState({ connectionId: '', title: '', skillName: '', date: '', startTime: '', endTime: '', overrideAvailability: false });
  const [rescheduling, setRescheduling] = useState(null);
  const [progressForm, setProgressForm] = useState({ skillName: '', progressPercentage: 0, currentTopic: '' });
  const [showSchedule, setShowSchedule] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [sessionItems, progressItems, partners] = await Promise.all([
        api('/sessions'), api('/progress'), api('/conversations'),
      ]);
      setSessions(sessionItems);
      setProgress(progressItems);
      setConnections(partners.filter((partner) => partner.status === 'ACTIVE'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const createSession = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (rescheduling) await api(`/sessions/${rescheduling}`, { method: 'PATCH', body: { date: schedule.date, startTime: schedule.startTime, endTime: schedule.endTime, timeZone, overrideAvailability: schedule.overrideAvailability } });
      else await api('/sessions', { method: 'POST', body: { ...schedule, connectionId: Number(schedule.connectionId), timeZone } });
      setShowSchedule(false);
      setRescheduling(null);
      setSchedule({ connectionId: '', title: '', skillName: '', date: '', startTime: '', endTime: '', overrideAvailability: false });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveProgress = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api('/progress', { method: 'POST', body: { ...progressForm, progressPercentage: Number(progressForm.progressPercentage) } });
      setShowProgress(false);
      setProgressForm({ skillName: '', progressPercentage: 0, currentTopic: '' });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateSession = async (session, status) => {
    setError('');
    try {
      await api(`/sessions/${session.id}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const isSessionPast = (session) => new Date(`${session.date}T${session.endTime}:00`) <= new Date();

  return <div className="content-page">
    <div className="page-intro">
      <div><span className="section-kicker">SMALL STEPS, BIG GROWTH</span><h1>Sessions & progress</h1><p>Make a little room for learning — then notice how far you've come.</p></div>
      <span className="quiet-badge"><Heart size={13} /> Learning is free</span>
    </div>
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <div className="loading-surface">Loading your learning activity…</div> : <>
      <section className="surface-card session-section">
        <div className="card-heading">
          <div><span className="section-kicker">LEARN TOGETHER</span><h2>Your sessions</h2></div>
          <button className="button button-outline button-sm" disabled={!connections.length} onClick={() => { setRescheduling(null); setShowSchedule(!showSchedule); }}><Plus size={14} /> Schedule session</button>
        </div>
        {showSchedule && <form className="inline-form" onSubmit={createSession}>
          <label>Learning partner<select required disabled={Boolean(rescheduling)} value={schedule.connectionId} onChange={(event) => setSchedule({ ...schedule, connectionId: event.target.value })}>
            <option value="">Choose a connection</option>{connections.map((item) => <option key={item.id} value={item.id}>{item.otherUserName}</option>)}
          </select></label>
          <label>Session title<input disabled={Boolean(rescheduling)} required maxLength="120" value={schedule.title} onChange={(event) => setSchedule({ ...schedule, title: event.target.value })} placeholder="e.g. Getting started with Python" /></label>
          <label>Skill<input disabled={Boolean(rescheduling)} required maxLength="100" value={schedule.skillName} onChange={(event) => setSchedule({ ...schedule, skillName: event.target.value })} placeholder="What will you work on?" /></label>
          <label>Date<input required type="date" min={localDate} value={schedule.date} onChange={(event) => setSchedule({ ...schedule, date: event.target.value })} /></label>
          <label>Starts<input required type="time" value={schedule.startTime} onChange={(event) => setSchedule({ ...schedule, startTime: event.target.value })} /></label>
          <label>Ends<input required type="time" value={schedule.endTime} onChange={(event) => setSchedule({ ...schedule, endTime: event.target.value })} /></label>
          <label className="check-label"><input type="checkbox" checked={schedule.overrideAvailability} onChange={(event) => setSchedule({ ...schedule, overrideAvailability: event.target.checked })} /> Override declared availability for this request</label>
          <button className="button button-primary button-sm">{rescheduling ? 'Save reschedule' : 'Propose session'}</button>
        </form>}
        {sessions.length ? sessions.map((session) => <div className="session-row" key={session.id}>
          <span className="session-date"><strong>{dateAtLocalMidnight(session.date).getDate()}</strong><small>{dateAtLocalMidnight(session.date).toLocaleString(undefined, { month: 'short' })}</small></span>
          <span><strong>{session.title}</strong><small>{session.skillName} · {session.startTime}–{session.endTime} · with {session.partnerName}</small></span>
          <span className="status-pill">{session.status.replaceAll('_', ' ')}</span>
          {session.status === 'PENDING_CONFIRMATION' && !session.createdByMe && <button className="button button-primary button-sm" onClick={() => updateSession(session, 'ACCEPTED')}>Accept</button>}
          {session.status === 'PENDING_CONFIRMATION' && session.createdByMe && <small>Waiting for your partner to confirm</small>}
          {['PENDING_CONFIRMATION', 'UPCOMING'].includes(session.status) && <button className="button button-outline button-sm" onClick={() => { setRescheduling(session.id); setSchedule({ connectionId: String(session.connectionId), title: session.title, skillName: session.skillName, date: session.date, startTime: session.startTime, endTime: session.endTime, overrideAvailability: false }); setShowSchedule(true); }}>Reschedule</button>}
          {['PENDING_CONFIRMATION', 'UPCOMING'].includes(session.status) && <button className="button button-outline button-sm" onClick={() => updateSession(session, 'CANCELLED')}>Cancel</button>}
          {session.status === 'UPCOMING' && !isSessionPast(session) && dateAtLocalMidnight(session.date).toDateString() === new Date().toDateString()
            && new Date(`${session.date}T${session.startTime}:00`) <= new Date()
            && <button className="button button-outline button-sm" onClick={() => updateSession(session, 'IN_PROGRESS')}>Start</button>}
          {['UPCOMING', 'IN_PROGRESS', 'COMPLETION_PENDING'].includes(session.status) && isSessionPast(session) && !session.completionConfirmedByMe
            && <button className="button button-primary button-sm" onClick={() => updateSession(session, 'COMPLETED')}>Confirm complete</button>}
          {session.status === 'COMPLETION_PENDING' && session.completionConfirmedByMe && <small>Waiting for your partner to confirm</small>}
          {session.status === 'COMPLETED' && !session.reviewedByMe && <ReviewForm connectionId={session.connectionId} onSubmitted={load} />}
        </div>) : <EmptyState icon={CalendarDays} title="A little space on your calendar" text="When you connect with a partner, plan your first session here." action="/app/explore" actionText="Meet a partner" />}
      </section>
      <section className="surface-card session-section">
        <div className="card-heading">
          <div><span className="section-kicker">KEEP TRACK OF THE LITTLE WINS</span><h2>What you're learning</h2></div>
          <button className="button button-outline button-sm" onClick={() => setShowProgress(!showProgress)}><Plus size={14} /> Track a skill</button>
        </div>
        {showProgress && <form className="inline-form" onSubmit={saveProgress}>
          <label>Skill<input disabled={Boolean(rescheduling)} required maxLength="100" value={progressForm.skillName} onChange={(event) => setProgressForm({ ...progressForm, skillName: event.target.value })} placeholder="e.g. Python" /></label>
          <label>Progress (%)<input required type="number" min="0" max="100" value={progressForm.progressPercentage} onChange={(event) => setProgressForm({ ...progressForm, progressPercentage: event.target.value })} /></label>
          <label>Current topic<input maxLength="120" value={progressForm.currentTopic} onChange={(event) => setProgressForm({ ...progressForm, currentTopic: event.target.value })} placeholder="What are you exploring now?" /></label>
          <button className="button button-primary button-sm">Save progress</button>
        </form>}
        {progress.length ? progress.map((entry) => <div className="progress-item" key={entry.id}>
          <div className="progress-item-heading"><span><strong>{entry.skillName}</strong><small>{entry.currentTopic || 'Keep building your skills'}</small></span><b>{entry.progressPercentage}%</b></div>
          <div className="progress-track"><span style={{ width: `${entry.progressPercentage}%` }} /></div>
        </div>) : <EmptyState icon={CalendarDays} title="Your learning, your pace" text="Track the topics and milestones you explore with your partner." action="/app/explore" actionText="Find a learning partner" />}
        <small className="muted-small">Progress is self-tracked; only sessions confirmed by both participants count as completed.</small>
      </section>
    </>}
  </div>;
}

export function MessageWorkspace() {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [items, threads] = await Promise.all([api('/messages'), api('/conversations')]);
      setMessages(items);
      setConversations(threads);
      setSelected((current) => current ?? threads[0]?.id ?? null);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = window.setInterval(() => load(), 10_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const active = conversations.find((item) => item.id === selected);
  const visible = useMemo(() => messages.filter((item) => item.connectionId === selected), [messages, selected]);

  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selected || active?.status !== 'ACTIVE') return;
    setError('');
    try {
      await api('/messages', { method: 'POST', body: { connectionId: selected, message: draft.trim() } });
      setDraft('');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <div className="content-page">
    <div className="page-intro"><div><span className="section-kicker">CONVERSATIONS THAT HELP YOU GROW</span><h1>Your messages</h1><p>Messages refresh automatically. Paused and completed exchanges are read-only.</p></div><button className="button button-outline button-sm" onClick={() => load(true)}><RefreshCw size={14} /> Refresh</button></div>
    {error && <ErrorState message={error} retry={() => load(true)} />}
    {loading ? <div className="loading-surface">Loading your conversations…</div> : conversations.length ? <section className="surface-card chat-layout">
      <aside className="conversation-list"><strong>Your connections</strong>{conversations.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`conversation-option ${selected === item.id ? 'conversation-option-active' : ''}`}>
        <span className="avatar">{item.otherUserName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
        <span><b>{item.otherUserName}</b><small>{item.status === 'ACTIVE' ? item.lastMessage || 'Your learning connection' : item.status.toLowerCase()}</small></span>
      </button>)}</aside>
      <div className="active-chat">
        <div className="active-chat-header"><strong>{active?.otherUserName}</strong><span className="status-pill">{active?.status}</span></div>
        <div className="chat-history" aria-live="polite">{visible.map((item) => <div key={item.id} className={`chat-message ${item.mine ? 'chat-message-mine' : ''}`}><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}</div>
        {active?.status === 'ACTIVE' ? <form className="chat-compose" onSubmit={send}><label className="sr-only" htmlFor="chat-message">Message</label><input id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="4000" placeholder="Write a thoughtful message…" /><button className="button button-primary" disabled={!draft.trim()}>Send <ArrowRight size={14} /></button></form>
          : <p className="chat-readonly">Messaging is unavailable while this exchange is {active?.status.toLowerCase()}.</p>}
      </div>
    </section> : <div className="surface-card no-matches"><span className="empty-icon"><MessageCircle size={20} /></span><h3>Your conversations start with a connection</h3><p>Once a partner accepts your exchange request, you can plan and message here.</p><Link to="/app/explore" className="button button-primary">Find a partner</Link></div>}
  </div>;
}
