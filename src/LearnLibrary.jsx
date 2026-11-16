import { useEffect, useState } from 'react';
import {
  ArrowRight, BadgeCheck, BookOpen, Check, CirclePlay, ExternalLink,
  GraduationCap, Search, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from './api';
import './learn.css';

const topics = [
  { name: 'Python', category: 'Technology', description: 'Start with the basics, then practice with small projects.' },
  { name: 'UI Design', category: 'Design', description: 'Explore layout, color, typography, and interface patterns.' },
  { name: 'Excel', category: 'Business', description: 'Learn formulas, useful shortcuts, and spreadsheet cleanup.' },
  { name: 'UX Research', category: 'Design', description: 'Practice interviews, research plans, and synthesis.' },
  { name: 'Public speaking', category: 'Communication', description: 'Build confidence with practical speaking exercises.' },
  { name: 'Digital illustration', category: 'Creative', description: 'Find drawing fundamentals and guided practice sessions.' },
];

function videoSearchUrl(skill) {
  const search = `${skill.trim()} beginner tutorial free lesson`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(search)}`;
}

export function LearnLibrary() {
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState([]);
  const [skillName, setSkillName] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [progressPercentage, setProgressPercentage] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProgress = async () => {
    setError('');
    try {
      setProgress(await api('/progress'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProgress(); }, []);

  const searchVideos = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    window.open(videoSearchUrl(query), '_blank', 'noopener,noreferrer');
  };

  const saveProgress = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const matchingProgress = progress.find((item) => item.skillName.toLowerCase() === skillName.trim().toLowerCase());
    const body = {
      skillName: skillName.trim(),
      currentTopic: currentTopic.trim(),
      progressPercentage: Number(progressPercentage),
    };
    try {
      if (matchingProgress) {
        await api(`/progress/${matchingProgress.id}`, { method: 'PUT', body });
        setNotice(`Your ${body.skillName} learning progress is updated.`);
      } else {
        await api('/progress', { method: 'POST', body });
        setNotice(`Your ${body.skillName} learning path is saved.`);
      }
      await loadProgress();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="content-page learn-library">
    <section className="learn-hero">
      <span className="section-kicker">YOUR FREE STUDY SPACE</span>
      <h1>Learn a little every day.</h1>
      <p>Find free video lessons, learn with your community, and keep track of your progress — all in one place.</p>
      <form className="learn-search" onSubmit={searchVideos}>
        <Search size={19} aria-hidden="true" />
        <label className="visually-hidden" htmlFor="learn-video-search">Search for a skill or video topic</label>
        <input id="learn-video-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like to learn?" required maxLength={100} />
        <button className="button button-primary" type="submit"><CirclePlay size={16} /> Find free videos</button>
      </form>
      <small>Opens YouTube results in a new tab. Review each creator's video details and terms.</small>
    </section>

    <section className="learn-section">
      <div className="learn-section-heading">
        <div><span className="section-kicker">PICK A PLACE TO BEGIN</span><h2>Popular learning paths</h2></div>
        <span className="quiet-badge"><BookOpen size={14} /> Free to explore</span>
      </div>
      <div className="study-topic-grid">
        {topics.map((topic) => <article className="study-topic-card" key={topic.name}>
          <span className="study-topic-icon"><GraduationCap size={19} /></span>
          <small>{topic.category}</small>
          <h3>{topic.name}</h3>
          <p>{topic.description}</p>
          <a className="text-link" href={videoSearchUrl(topic.name)} target="_blank" rel="noreferrer">
            Find free videos <ExternalLink size={14} />
          </a>
        </article>)}
      </div>
      <p className="video-disclaimer">Videos are provided by independent creators on YouTube. SkillBridge does not host, endorse, or verify individual videos; availability and terms can change.</p>
    </section>

    <section className="learn-section learn-progress-section">
      <div className="learn-section-heading">
        <div><span className="section-kicker">YOUR PACE, YOUR PROGRESS</span><h2>Keep your learning on track</h2></div>
        <Link to="/app/sessions" className="text-link">Sessions & progress <ArrowRight size={14} /></Link>
      </div>
      <div className="study-progress-layout">
        <form className="surface-card study-progress-form" onSubmit={saveProgress}>
          <h3>Update a learning path</h3>
          <label>Skill<input value={skillName} onChange={(event) => setSkillName(event.target.value)} placeholder="e.g. Python" required maxLength={100} /></label>
          <label>What are you studying?<input value={currentTopic} onChange={(event) => setCurrentTopic(event.target.value)} placeholder="e.g. Functions and loops" maxLength={120} /></label>
          <label>Progress<input type="number" min="0" max="100" value={progressPercentage} onChange={(event) => setProgressPercentage(event.target.value)} required /></label>
          {error && <div className="form-error" role="alert">{error} <button type="button" className="text-link" onClick={loadProgress}>Try again</button></div>}
          {notice && <div className="inline-notice" role="status"><Check size={15} /> {notice}</div>}
          <button className="button button-primary button-sm" disabled={saving}>{saving ? 'Saving…' : 'Save learning progress'}</button>
        </form>
        <div className="surface-card study-progress-list">
          <h3>Your learning paths</h3>
          {loading ? <p className="muted-small">Loading your progress…</p>
            : progress.length ? progress.map((item) => <article className="study-progress-item" key={item.id}>
              <div><strong>{item.skillName}</strong><span>{item.currentTopic || 'Ready for your next topic'}</span></div>
              <span className="study-progress-value">{item.progressPercentage}%</span>
              <div className="progress-track" role="progressbar" aria-label={`${item.skillName} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={item.progressPercentage}>
                <span style={{ width: `${item.progressPercentage}%` }} />
              </div>
            </article>)
              : <div className="study-empty"><BookOpen size={20} /><p>Your learning paths will appear here after you save your first skill.</p></div>}
        </div>
      </div>
    </section>

    <section className="optional-revenue-card">
      <div className="optional-revenue-icon"><ShieldCheck size={21} /></div>
      <div className="optional-revenue-copy">
        <span className="section-kicker">A SUSTAINABLE, LEARNER-FIRST MODEL</span>
        <h2>Core learning stays free.</h2>
        <p>SkillBridge can support itself through optional verified-profile reviews and assessed completion certificates. These are planned services, not available to buy yet; they will never be required to use free lessons or find a learning partner.</p>
      </div>
      <div className="optional-revenue-options">
        <span><BadgeCheck size={16} /> Optional profile verification <small>Planned</small></span>
        <span><GraduationCap size={16} /> Assessed certificates <small>Planned</small></span>
      </div>
    </section>
  </div>;
}
