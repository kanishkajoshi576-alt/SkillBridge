import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  CircleHelp, Compass, GraduationCap, Heart, Home, LogOut, Menu, MessageCircle,
  Plus, Search, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, clearToken, getToken, setToken } from './api';
import './calendar.css';
import './desktop.css';
import { ExchangeWorkspace, MessageWorkspace, SessionWorkspace } from './CoreWorkflows';
import { Community } from './Community';
import { LearnLibrary } from './LearnLibrary';

const links = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/learn', label: 'Study library', icon: BookOpen },
  { to: '/app/explore', label: 'Find a partner', icon: Compass },
  { to: '/app/exchanges', label: 'My exchanges', icon: Users },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/sessions', label: 'Sessions & progress', icon: CalendarDays },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
  { to: '/app/community', label: 'Community', icon: Users },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/doubts', label: 'AI doubt solver', icon: Sparkles },
];

const FirebaseExperience = lazy(() => import('./FirebaseExperience'));

function Brand({ light = false }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><BookOpen size={18} /></span><span>skillbridge<span className="brand-period">.</span></span></Link>;
}

function PolicyPage({ kind }) {
  const content = {
    terms: { title: 'Terms of use', intro: 'A clear, respectful agreement for learning together.', sections: [['Use SkillBridge thoughtfully', 'Create an account with accurate information, keep your sign-in details private and use the service lawfully. You are responsible for activity on your account.'], ['Peer learning is voluntary', 'SkillBridge connects people; it does not guarantee the quality, accuracy or outcome of any member’s teaching, advice or learning. Verify important information independently.'], ['Keep exchanges free', 'Core peer-to-peer skill exchange is free. Never send money to another member for an exchange. Any future paid service will be clearly optional and separately described before it is offered.'], ['Community safety', 'Do not harass, threaten, discriminate against, impersonate or defraud other members. Reports may be reviewed by an administrator and can lead to restrictions or suspension.']] },
    privacy: { title: 'Privacy', intro: 'Share what helps people learn with you — not more than you need to.', sections: [['Information you provide', 'SkillBridge stores the account details, profile, skills, exchange requests, session records, messages, learning progress, reviews, notifications and safety reports needed to operate the service.'], ['Use and visibility', 'Your name, bio, organization and listed skills are shown to other signed-in learners to support matching. Your email and phone number are private by default and only appear on public profiles when you choose to show them. Password hashes are never included in public profile responses.'], ['Account security', 'Passwords are stored as BCrypt hashes. Authentication uses signed tokens. Keep personal and financial details out of profiles, chat and AI questions.'], ['Your choices', 'Do not include sensitive data in your profile or messages. For an account data or deletion request, contact the project administrators. This student project does not yet provide self-service account deletion or data-export controls.']] },
    guidelines: { title: 'Community guidelines', intro: 'Be the kind of learning partner you would like to meet.', sections: [['Be generous and respectful', 'Communicate clearly, respect boundaries and make space for different backgrounds, skill levels and learning styles.'], ['Share honestly', 'Describe your experience accurately. SkillBridge does not verify member claims or certify advice.'], ['Keep people safe', 'Never ask for passwords, one-time codes, banking information or money for free peer exchanges. Use public places for in-person meetings and report suspicious behavior.'], ['Speak up', 'Use the Safety Center to report harassment, scams, inappropriate content or false claims. Blocking is available from a member profile.']] },
  }[kind];
  return <main className="policy-page"><Link to="/" className="back-link"><ArrowLeft size={14}/> Back to SkillBridge</Link><span className="section-kicker">A COMMUNITY BUILT ON TRUST</span><h1>{content.title}</h1><p className="policy-intro">{content.intro}</p>{content.sections.map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<div className="disclaimer-card"><CircleHelp size={18}/><p>SkillBridge is a peer-to-peer learning platform. We do not guarantee the accuracy, quality or outcome of content shared by members.</p></div></main>;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [restoreError, setRestoreError] = useState('');
  const restoreSession = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return false;
    }
    setLoading(true);
    setRestoreError('');
    try {
      setUser(await api('/auth/me'));
      return true;
    } catch (error) {
      if (error.status === 401) {
        clearToken();
        setUser(null);
      } else {
        setRestoreError(error.message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (getToken()) void restoreSession();
  }, [restoreSession]);
  const login = async (email, password) => {
    return api('/auth/login', { method: 'POST', body: { email: email.trim(), password } });
  };
  const verifyLogin = async (email, code) => {
    const result = await api('/auth/login/verify', { method: 'POST', body: { email: email.trim(), code } });
    setToken(result.token);
    setUser(result.user);
  };
  const demoLogin = async () => {
    const result = await api('/auth/demo-login', { method: 'POST' });
    setToken(result.token);
    setUser(result.user);
  };
  const register = async (form) => {
    const result = await api('/auth/register', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        college: form.college.trim(),
      },
    });
    if (result.verificationRequired) return { verificationRequired: true, email: form.email.trim() };
    setToken(result.token);
    setUser(result.user);
    return { verificationRequired: false };
  };
  const logout = () => { clearToken(); setUser(null); setRestoreError(''); };
  return children({ user, loading, restoreError, retrySession: restoreSession, login, register, demoLogin, logout, setUser });
}

function SessionRecovery({ auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const retry = async () => {
    if (await auth.retrySession()) navigate(location.pathname, { replace: true });
  };
  return <main className="app-error-shell">
    <section className="app-error-card">
      <span className="brand-mark">S</span>
      <h1>We couldn’t reconnect your learning space</h1>
      <p>Your saved sign-in is still on this device. Check your connection, then try again.</p>
      <div className="form-error" role="alert">{auth.restoreError}</div>
      <div className="session-recovery-actions">
        <button className="button button-primary" onClick={retry}>Try again</button>
        <button className="button button-outline" onClick={() => { auth.logout(); navigate('/login', { replace: true }); }}>Sign in instead</button>
      </div>
    </section>
  </main>;
}

function App() {
  if (!window.skillbridgeDesktop && import.meta.env.MODE !== 'demo' && import.meta.env.VITE_AUTH_MODE !== 'api') {
    return <Suspense fallback={<div className="page-loader"><span className="loader" />Starting SkillBridge…</div>}><FirebaseExperience /></Suspense>;
  }
  return <AuthProvider>{(auth) => <Application auth={auth} />}</AuthProvider>;
}

function Application({ auth }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [desktopStatus, setDesktopStatus] = useState(window.skillbridgeDesktop ? null : false);
  const isPrivate = path.startsWith('/app');
  useEffect(() => { setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [path]);
  useEffect(() => {
    if (!window.skillbridgeDesktop) return;
    window.skillbridgeDesktop.getStatus().then(setDesktopStatus).catch((error) => {
      setDesktopStatus({ error: error.message, emailSetupRequired: true });
    });
  }, []);

  if (desktopStatus === null) return <div className="page-loader"><span className="loader" />Starting SkillBridge…</div>;
  if (window.skillbridgeDesktop && desktopStatus.emailSetupRequired && path !== '/email-settings') {
    return <DesktopEmailSetup onSaved={setDesktopStatus} />;
  }
  if (auth.loading) return <div className="page-loader"><span className="loader" />Getting your learning space ready…</div>;
  if (auth.restoreError) return <SessionRecovery auth={auth} />;

  const submitAuth = async (values, kind) => {
    setBusy(true); setNotice('');
    try {
      if (kind === 'login') return await auth.login(values.email, values.password);
      if (kind === 'verify-login') { await auth.verifyLogin(values.email, values.code); navigate('/app'); }
      else if (kind === 'demo-login') { await auth.demoLogin(); navigate('/app'); }
      else if (kind === 'email-settings') return await window.skillbridgeDesktop.saveEmailSettings(values);
      else { const registration = await auth.register(values); navigate(registration?.verificationRequired ? '/verify-email' : '/app', { state: { email: registration?.email } }); }
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  };

  if (isPrivate && !auth.user) return <Navigate to="/login" replace state={{ from: path }} />;

  return <>
    {isPrivate && auth.user ? (
      <div className="app-frame">
        <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
          <div className="sidebar-top"><Brand /><button className="icon-button mobile-only" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={19} /></button></div>
          <div className="nav-caption">YOUR SPACE</div>
          <nav className="side-nav">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'AI doubt solver' && <span className="new-pill">FREE</span>}</NavLink>)}{auth.user.role === 'ADMIN' && <NavLink to="/app/admin" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><ShieldCheck size={18} /><span>Admin safety</span></NavLink>}</nav>
          <div className="sidebar-bottom">
            <div className="free-card"><div className="free-card-icon"><Heart size={16} /></div><strong>Learning is better shared.</strong><p>Your peer-to-peer skill exchanges are always free.</p><Link to="/app/safety">Read our safety guide <ArrowRight size={13} /></Link></div>
            <button className="profile-mini" onClick={() => navigate('/app/profile')}><ProfileAvatar name={auth.user.name} image={auth.user.profileImage} /><span className="profile-mini-copy"><strong>{auth.user.name}</strong><small>My profile</small></span><ChevronDown size={15} /></button>
            <button className="logout-button" onClick={() => { auth.logout(); navigate('/'); }}><LogOut size={15}/> Sign out</button>
          </div>
        </aside>
        {mobileMenu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
        <div className="workspace">
          <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-trigger" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={20} /></button><button className="back-button" onClick={() => location.key === 'default' ? navigate('/app') : navigate(-1)}><ArrowLeft size={16} /><span>Back</span></button><span className="topbar-divider" /><span className="breadcrumb">{pageTitle(path)}</span></div><div className="topbar-actions"><Link to="/app/explore" className="topbar-search"><Search size={16} /><span>Find a skill or person</span><kbd>⌘ K</kbd></Link><Link to="/app/notifications" className="topbar-bell" aria-label="Notifications"><Bell size={18} /></Link><ProfileAvatar name={auth.user.name} image={auth.user.profileImage} className="avatar-small" /></div></header>
          <main className="main-area"><Routes>
            <Route path="/app" element={<Dashboard user={auth.user} />} />
            <Route path="/app/learn" element={<LearnLibrary />} />
            <Route path="/app/explore" element={<Explore />} />
            <Route path="/app/exchanges" element={<ExchangeWorkspace />} />
            <Route path="/app/calendar" element={<CalendarView />} />
            <Route path="/app/sessions" element={<SessionWorkspace />} />
            <Route path="/app/messages" element={<MessageWorkspace />} />
            <Route path="/app/community" element={<Community />} />
            <Route path="/app/notifications" element={<Notifications />} />
            <Route path="/app/doubts" element={<DoubtSolver />} />
            <Route path="/app/profile" element={<Profile user={auth.user} onSave={auth.setUser} />} />
            <Route path="/app/users/:id" element={<PublicProfile />} />
            <Route path="/app/safety" element={<Safety user={auth.user} />} />
            <Route path="/app/admin" element={auth.user.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes></main>
          <MobileNav />
        </div>
      </div>
    ) : <>
      <PublicNav user={auth.user} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" onSubmit={submitAuth} busy={busy} notice={notice} />} />
        <Route path="/email-settings" element={window.skillbridgeDesktop ? <DesktopEmailSetup initialStatus={desktopStatus} onSaved={setDesktopStatus} onSubmit={submitAuth} busy={busy} notice={notice} /> : <Navigate to="/" replace />} />
        <Route path="/register" element={<AuthPage mode="register" onSubmit={submitAuth} busy={busy} notice={notice} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/safety" element={<Safety publicPage user={auth.user} />} />
        <Route path="/terms" element={<PolicyPage kind="terms" />} />
        <Route path="/privacy" element={<PolicyPage kind="privacy" />} />
        <Route path="/guidelines" element={<PolicyPage kind="guidelines" />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </>}
  </>;
}

function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function ProfileAvatar({ name, image, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return <span className={`avatar ${className}`} style={image && !failed ? { padding: 0, overflow: 'hidden' } : undefined}>
    {image && !failed ? <img src={image} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : initials(name)}
  </span>;
}
function pageTitle(path) { return links.find((link) => link.to === path)?.label || (path.endsWith('profile') ? 'My profile' : path.startsWith('/app/users/') ? 'Learner profile' : 'Your learning space'); }

function PublicNav({ user }) {
  return <header className="public-nav"><Brand /><nav className="public-links"><a href="#how-it-works">How it works</a><a href="#why-skillbridge">Why SkillBridge</a><Link to="/safety">Safety</Link></nav><div className="public-actions">{user ? <Link className="button button-primary button-sm" to="/app">My space <ArrowRight size={15} /></Link> : <><Link className="login-link" to="/login">Log in</Link><Link className="button button-primary button-sm" to="/register">Get started <ArrowRight size={15} /></Link></>}</div></header>;
}

function Landing() {
  return <div className="landing">
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" />A community built on sharing</div><h1>Know something.<br /><span>Learn something.</span><br />Pass it on.</h1><p className="hero-text">Trade what you know for what you want to learn. Meet your next learning partner — no course fees, just real people helping each other grow.</p><div className="hero-actions"><Link to="/register" className="button button-primary button-lg">Find your skill partner <ArrowRight size={17} /></Link><Link to="/register" className="button button-quiet button-lg"><GraduationCap size={17} /> Start teaching</Link></div><div className="hero-proof"><span className="proof-avatars"><i>K</i><i>A</i><i>R</i></span><span><strong>Everyone has something to teach.</strong><br />Everyone has something to learn.</span></div></div>
      <div className="hero-art" aria-label="Two learners sharing skills"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-doodle doodle-top">✳</div><div className="art-doodle doodle-bottom">✦</div><div className="skill-bubble bubble-top"><span className="bubble-emoji">⌘</span><span><strong>Python basics</strong><small>What I can teach</small></span><span className="bubble-check"><Check size={14} /></span></div><div className="people-art"><div className="person person-left"><div className="person-hair hair-left" /><div className="person-face face-left"><span className="eyes">••</span><span className="smile">⌣</span></div><div className="person-body body-left"><span className="shirt-detail">✦</span></div><span className="person-label">I can teach</span></div><div className="bridge-icon"><ArrowRight size={22} /><span>exchange</span></div><div className="person person-right"><div className="person-hair hair-right" /><div className="person-face face-right"><span className="eyes">••</span><span className="smile">⌣</span></div><div className="person-body body-right"><span className="shirt-detail">✿</span></div><span className="person-label">I want to learn</span></div></div><div className="skill-bubble bubble-bottom"><span className="bubble-emoji bubble-purple">✎</span><span><strong>UI / UX design</strong><small>What I want to learn</small></span><span className="bubble-check"><Check size={14} /></span></div></div>
    </section>
    <section className="trust-strip"><div><ShieldCheck size={18} /><span>Free peer-to-peer learning</span></div><i /><div><Users size={18} /><span>Learn and teach, together</span></div><i /><div><Heart size={18} /><span>Made for curious people</span></div></section>
    <section className="section how-section" id="how-it-works"><div className="section-heading"><span className="section-kicker">A simpler way to grow</span><h2>Learning goes both ways.</h2><p>Three little steps can open a whole new world of skills.</p></div><div className="steps-grid"><Step number="01" icon={Users} title="Bring what you know" text="Add the skills you can share and the things you're excited to learn next." color="lavender" /><Step number="02" icon={Compass} title="Meet your match" text="Find people whose learning goals and teaching skills fit yours." color="peach" /><Step number="03" icon={Sparkles} title="Grow, together" text="Plan a session, share what you know and celebrate progress on both sides." color="mint" /></div></section>
    <section className="exchange-feature" id="why-skillbridge"><div className="exchange-copy"><span className="section-kicker">A fairer kind of learning</span><h2>Your knowledge<br />is your currency.</h2><p>No subscriptions to learn the basics. Offer what you know, find what you need, and make learning a two-way street.</p><Link to="/register" className="text-link">Start your free profile <ArrowRight size={16} /></Link></div><div className="exchange-card"><div className="exchange-card-top"><span className="exchange-icon"><Heart size={17} /></span><span className="exchange-caption">A little give & take</span><span className="free-tag">FREE</span></div><div className="exchange-person"><span className="avatar avatar-pink">A</span><div><strong>Aarav teaches</strong><small>Python fundamentals</small></div></div><div className="exchange-arrow"><span /><span className="exchange-arrows">↕</span><span /></div><div className="exchange-person"><span className="avatar avatar-gold">M</span><div><strong>Mira teaches</strong><small>UI & visual design</small></div></div><div className="exchange-card-footer"><Check size={15} /><span>Two skills shared. No money exchanged.</span></div></div></section>
    <section className="section categories-section"><div className="section-heading"><span className="section-kicker">The world's full of things to learn</span><h2>What are you curious about?</h2></div><div className="category-grid">{[['⌘','Technology','lavender'],['✎','Design & art','peach'],['Aa','Languages','mint'],['♫','Music','butter'],['◈','Business','blue'],['✿','And so much more','rose']].map(([icon,label,tone])=><div className="category-chip" key={label}><span className={`category-icon ${tone}`}>{icon}</span><strong>{label}</strong><ArrowRight size={15} /></div>)}</div></section>
    <section className="cta-section"><div className="cta-spark spark-left">✳</div><span className="section-kicker">Your next great lesson is a person away</span><h2>Come for the skills.<br />Stay for the people.</h2><p>Creating your SkillBridge profile is free. Finding your people is the fun part.</p><Link to="/register" className="button button-light button-lg">Get started for free <ArrowRight size={17} /></Link><div className="cta-spark spark-right">✦</div></section>
    <Footer />
  </div>;
}

function Step({ number, icon: Icon, title, text, color }) {
  return <article className="step-card"><div className={`step-icon ${color}`}><Icon size={22} /></div><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>;
}

function Footer() {
  return <footer className="footer"><div className="footer-main"><div className="footer-about"><Brand /><p>Skill grows when it’s shared.<br />A little knowledge goes a long way.</p></div><div className="footer-col"><strong>Explore</strong><Link to="/register">Find a partner</Link><Link to="/register">Start teaching</Link><Link to="/register">Create a profile</Link></div><div className="footer-col"><strong>Good to know</strong><Link to="/safety">Safety Center</Link><Link to="/guidelines">Community guidelines</Link><Link to="/terms">Terms of use</Link><Link to="/privacy">Privacy</Link><span className="coming-soon">Optional extras · coming soon</span></div><div className="footer-note"><ShieldCheck size={19} /><p>Be thoughtful with personal information. Report anything that doesn't feel right.</p><Link to="/safety">Our safety promise <ArrowRight size={14} /></Link></div></div><div className="footer-bottom"><span>© 2026 SkillBridge · Made for learning together.</span><span>Free to learn. Free to teach.</span></div></footer>;
}

function DesktopEmailSetup({ initialStatus, onSaved }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    host: initialStatus?.smtp?.host || '',
    port: initialStatus?.smtp?.port || '587',
    username: initialStatus?.smtp?.username || '',
    password: '',
    from: initialStatus?.smtp?.from || '',
    auth: initialStatus?.smtp?.auth ?? true,
    demoOtpRecipient: initialStatus?.smtp?.demoOtpRecipient || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const status = await window.skillbridgeDesktop.saveEmailSettings({
        ...form,
        port: Number(form.port),
      });
      onSaved(status);
      navigate('/login');
    } catch (saveError) {
      setError(saveError.message || 'Could not save your email settings. Check the details and try again.');
    } finally {
      setBusy(false);
    }
  };
  return <main className="policy-page verify-page">
    <Brand />
    <span className="section-kicker">SET UP SECURE SIGN-IN</span>
    <h1>Connect your email</h1>
    <p className="policy-intro">SkillBridge sends a one-time sign-in code to your email each time you log in. Enter your email provider’s SMTP settings to enable secure delivery. Your password is encrypted on this computer and never saved in the app’s web storage.</p>
    <form className="verify-form" onSubmit={submit}>
      <label>SMTP server<input value={form.host} onChange={update('host')} required placeholder="smtp.gmail.com" autoComplete="url" /></label>
      <label>SMTP port<input type="number" value={form.port} onChange={update('port')} required min="1" max="65535" /></label>
      <label className="smtp-auth-toggle"><input type="checkbox" checked={form.auth} onChange={update('auth')} /> This email server requires a username and password</label>
      {form.auth && <>
        <label>SMTP username<input type="email" value={form.username} onChange={update('username')} required autoComplete="username" placeholder="you@example.com" /></label>
        <label>SMTP password or app password<input type="password" value={form.password} onChange={update('password')} required={!initialStatus?.smtp?.passwordConfigured} autoComplete="new-password" placeholder={initialStatus?.smtp?.passwordConfigured ? 'Leave blank to keep the saved password' : 'Use your provider’s app password'} /></label>
      </>}
      <label>Sender email address<input type="email" value={form.from} onChange={update('from')} required placeholder="you@example.com" /></label>
      <section className="surface-card demo-inbox-note">
        <strong>Using the included demo learners?</strong>
        <p>Demo accounts end in <code>@demo.skillbridge.local</code>, so they cannot receive mail directly. Add an inbox below to receive their demo sign-in codes. Codes for your own accounts still go to each account’s saved email address.</p>
        <label>Demo sign-in code inbox <span className="optional">(optional)</span><input type="email" value={form.demoOtpRecipient} onChange={update('demoOtpRecipient')} placeholder="you@example.com" /></label>
      </section>
      <div className="inline-notice" role="status">For Gmail, use <code>smtp.gmail.com</code>, port 587, and a Google App Password — not your regular Google password.</div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button-primary button-full" disabled={busy}>{busy ? 'Saving and starting SkillBridge…' : initialStatus?.smtp?.configured ? 'Update email settings' : 'Save and continue'} <ArrowRight size={15} /></button>
    </form>
    {initialStatus?.smtp?.configured && <Link to="/login" className="text-link">Back to sign in <ArrowRight size={14} /></Link>}
  </main>;
}

function AuthPage({ mode, onSubmit, busy, notice }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '' });
  const [error, setError] = useState('');
  const [otpPending, setOtpPending] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    if (otpPending) {
      if (!/^\d{6}$/.test(otpCode.trim())) { setError('Enter the six-digit code from your email.'); return; }
      setError('');
      await onSubmit({ email: otpEmail, code: otpCode.trim() }, 'verify-login');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return; }
    if (!isRegister && form.password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (!isRegister && form.password.length > 72) { setError('Use a password of 72 characters or fewer.'); return; }
    if (isRegister && form.password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (isRegister && form.password.length > 72) { setError('Use a password of 72 characters or fewer.'); return; }
    if (isRegister && !form.name.trim()) { setError('Add your name to get started.'); return; }
    setError('');
    const result = await onSubmit(form, isRegister ? 'register' : 'login');
    if (!isRegister && result?.otpRequired) {
      setOtpEmail(form.email.trim());
      setOtpCode('');
      setOtpMessage(result.message);
      setOtpPending(true);
    }
  };
  const existingAccount = isRegister && notice?.toLowerCase().includes('already exists');
  return <main className="auth-page"><div className="auth-panel"><div className="auth-brand"><Brand /></div><div className="auth-welcome-art"><span className="welcome-star">✳</span><div className="welcome-illustration"><span className="welcome-book"><BookOpen size={38} /></span><span className="welcome-person">☺</span><span className="welcome-spark">✦</span></div><span className="auth-art-caption">Good things grow when shared.</span></div><div className="auth-panel-copy"><h2>Skills are better<br />when they're shared.</h2><p>Find your people. Learn something new. Teach something useful.</p><div className="auth-free-note"><Heart size={15} /> Your peer-to-peer learning is always free.</div></div></div><section className="auth-form-wrap"><div className="auth-form-head"><span className="section-kicker">{isRegister ? 'Your next chapter starts here' : otpPending ? 'ONE QUICK SECURITY CHECK' : 'Welcome back'}</span><h1>{isRegister ? 'Create your account' : otpPending ? 'Check your email' : 'Good to see you again'}</h1><p>{isRegister ? 'Set up your free account. You can add skills once you’re in.' : otpPending ? 'Enter the six-digit sign-in code we sent to your email.' : 'Log in to pick up where your curiosity left off.'}</p></div><form className="auth-form" onSubmit={submit} noValidate>{isRegister && <label>Your name<input autoComplete="name" placeholder="e.g. Kanishka Joshi" value={form.name} onChange={update('name')} required /></label>}<label>Email address<input type="email" autoComplete="email" placeholder="you@example.com" value={otpPending ? otpEmail : form.email} onChange={otpPending ? undefined : update('email')} readOnly={otpPending} required /></label>{otpPending && <div className="inline-notice" role="status">{otpMessage}</div>}{isRegister && <label>College or organization <span className="optional">(optional)</span><input placeholder="Where you study or work" value={form.college} onChange={update('college')} /></label>}{otpPending ? <label>Six-digit email code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="123456" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))} required autoFocus /></label> : <><label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength="72" placeholder="At least 8 characters" value={form.password} onChange={update('password')} required /></label>{!isRegister && <div className="auth-forgot"><Link to="/forgot-password">Forgot your password?</Link><Link to="/verify-email">Verify your email</Link>{window.skillbridgeDesktop && <Link to="/email-settings">Email settings</Link>}</div>}</>}{(error || notice) && <div className="form-error" role="alert">{error || notice}{existingAccount && <> <Link to="/login" className="text-link">Log in instead</Link></>}</div>}<button className="button button-primary button-full button-lg" disabled={busy}>{busy ? <><span className="button-loader" />Just a moment…</> : isRegister ? <>Create my free account <ArrowRight size={16} /></> : otpPending ? <>Verify and sign in <ArrowRight size={16} /></> : <>Log in to SkillBridge <ArrowRight size={16} /></>}</button>{!isRegister && import.meta.env.VITE_DEMO_MODE === 'true' && <button className="button button-outline button-full button-lg" type="button" disabled={busy} onClick={() => onSubmit({}, 'demo-login')}>{busy ? 'Opening demo…' : 'Enter the demo as Maya Chen'}</button>}{otpPending && <button className="button button-quiet button-full" type="button" onClick={() => { setOtpPending(false); setOtpCode(''); setError(''); }}>Back to sign in</button>}</form><div className="auth-switch">{isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New to SkillBridge? <Link to="/register">Create a free account</Link></>}</div><p className="auth-disclaimer">By continuing, you agree to use SkillBridge respectfully and follow our <Link to="/guidelines">community guidelines</Link>.</p></section></main>;
}

function VerifyEmailPage() {
  const location = useLocation();
  const [token, setTokenValue] = useState(new URLSearchParams(location.hash.replace(/^#/, '')).get('token') || '');
  const [email, setEmail] = useState(location.state?.email || new URLSearchParams(location.search).get('email') || '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const verify = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const result = await api('/auth/verify-email', { method: 'POST', body: { token } }); setNotice(result.message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const resend = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const result = await api('/auth/verify-email/resend', { method: 'POST', body: { email } }); setNotice(result.message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <main className="policy-page verify-page"><Link to="/" className="back-link"><ArrowLeft size={14}/> Back to SkillBridge</Link><span className="section-kicker">ONE QUICK ACCOUNT CHECK</span><h1>Verify your email</h1><p className="policy-intro">Use the secure link we emailed you. Verification links expire after 24 hours and work once.</p><form className="verify-form" onSubmit={verify}><label>Verification token<input value={token} onChange={(e)=>setTokenValue(e.target.value)} maxLength={100} minLength={32} required placeholder="Paste the token from your email link" /></label>{error&&<div className="form-error" role="alert">{error}</div>}{notice&&<div className="inline-notice" role="status">{notice}</div>}<button className="button button-primary" disabled={busy||!token.trim()}>{busy?'Verifying…':'Verify email'} <ArrowRight size={15}/></button></form><div className="verify-resend"><h2>Need another link?</h2><p>If you registered recently, request a new email. For privacy, the response is the same whether or not an account exists.</p><form onSubmit={resend}><label>Email address<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" /></label><button className="button button-outline button-sm" disabled={busy||!email.trim()}>Resend verification email</button></form></div><Link to="/login" className="text-link">Return to sign in <ArrowRight size={14}/></Link></main>;
}

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [requested, setRequested] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const requestCode = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api('/auth/password-reset/request', { method: 'POST', body: { email: email.trim() } });
      setRequested(true); setNotice(result.message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (password.length < 8 || password.length > 72) { setError('Use a password between 8 and 72 characters.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api('/auth/password-reset/confirm', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim(), newPassword: password },
      });
      setDone(true); setNotice(result.message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <main className="policy-page">
    <Link to="/login" className="back-link"><ArrowLeft size={14} /> Back to login</Link>
    <span className="section-kicker">ACCOUNT SECURITY</span>
    <h1>Reset your password</h1>
    <p className="policy-intro">We’ll send a six-digit code to your inbox. It expires in 10 minutes and can be used once. Email delivery must be enabled by the server.</p>
    {done ? <section className="surface-card"><p role="status">{notice}</p><Link to="/login" className="button button-primary">Continue to login <ArrowRight size={15} /></Link></section> :
      !requested ? <form className="auth-form" onSubmit={requestCode}>
        <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-primary button-full" disabled={busy}>{busy ? 'Sending code…' : 'Email me a reset code'}</button>
      </form> : <form className="auth-form" onSubmit={resetPassword}>
        <div className="inline-notice" role="status">{notice}</div>
        <label>Six-digit email code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-primary button-full" disabled={busy}>{busy ? 'Updating password…' : 'Reset password'}</button>
        <button type="button" className="text-link" onClick={() => { setRequested(false); setNotice(''); setError(''); }}>Send a new code</button>
      </form>}
  </main>;
}

function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState([]);
  const load = async () => {
    setError('');
    try {
      const [overview, learningProgress] = await Promise.all([api('/dashboard'), api('/progress')]);
      setData(overview);
      setProgress(learningProgress);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => { load(); }, []);

  return <div className="content-page">
    <div className="welcome-row">
      <div>
        <span className="section-kicker">YOUR LEARNING SPACE</span>
        <h1>Welcome back, {user.name.split(' ')[0]} <span className="wave">✦</span></h1>
        <p>Pick up where you left off, discover a learning partner, or plan your next session.</p>
      </div>
      <Link to="/app/profile" className="button button-outline">Complete your profile <ArrowRight size={15} /></Link>
    </div>
    {error ? <ErrorCard message={error} retry={load} /> : !data ? <LoadingCard /> : <>
      <div className="stat-grid">
        {[['Teaching', data.teachingSkills, 'skills to share', 'teaching'],
          ['Learning', data.learningSkills, 'skills to explore', 'learning'],
          ['Exchanges', data.activeExchanges, 'active together', 'exchange'],
          ['Sessions', data.completedSessions, 'completed sessions', 'session'],
          ['On your calendar', data.plannedSessions, 'planned sessions', 'learning']].map(([title, value, sub, kind]) =>
          <div className="stat-card" key={title}>
            <span className={`stat-mark ${kind}`}>{kind === 'teaching' ? '↗' : kind === 'learning' ? '✦' : kind === 'exchange' ? '↔' : '✓'}</span>
            <span className="stat-title">{title}</span><strong>{value}</strong><small>{sub}</small>
          </div>)}
      </div>
      <div className="dashboard-skill-grid">
        <section className="surface-card dashboard-skill-card">
          <div className="card-heading"><div><span className="section-kicker">WHAT YOU CAN SHARE</span><h2>Skills I teach</h2></div><Link to="/app/profile" className="text-link">Edit <ArrowRight size={14} /></Link></div>
          <div className="dashboard-skill-list">{data.teachingSkillNames.length
            ? data.teachingSkillNames.map((skill) => <span className="dashboard-skill-tag" key={skill}>{skill}</span>)
            : <span className="dashboard-skill-empty">Add a skill you can teach to find a learning partner.</span>}</div>
        </section>
        <section className="surface-card dashboard-skill-card">
          <div className="card-heading"><div><span className="section-kicker">WHAT YOU WANT TO GROW</span><h2>Skills I’m learning</h2></div><Link to="/app/profile" className="text-link">Edit <ArrowRight size={14} /></Link></div>
          <div className="dashboard-skill-list">{data.learningSkillNames.length
            ? data.learningSkillNames.map((skill) => <span className="dashboard-skill-tag learning" key={skill}>{skill}</span>)
            : <span className="dashboard-skill-empty">Choose a skill you want to learn and track your progress.</span>}</div>
        </section>
      </div>
      <section className="surface-card learning-path-section">
        <div className="card-heading">
          <div><span className="section-kicker">YOUR LEARNING PATHS</span><h2>Continue learning</h2></div>
          <Link to="/app/sessions" className="text-link">Manage progress <ArrowRight size={14} /></Link>
        </div>
        {progress.length ? <div className="learning-path-grid">
          {progress.map((item) => <article className="learning-path-card" key={item.id}>
            <div className="learning-path-icon"><GraduationCap size={19} /></div>
            <div className="learning-path-copy">
              <strong>{item.skillName}</strong>
              <small>{item.currentTopic || 'Your personal learning path'}</small>
              <div className="progress-track" role="progressbar" aria-label={`${item.skillName} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={item.progressPercentage}>
                <span style={{ width: `${item.progressPercentage}%` }} />
              </div>
              <small>{item.progressPercentage}% complete</small>
            </div>
            <Link to="/app/sessions" className="button button-outline button-sm">Continue</Link>
          </article>)}
        </div> : <EmptyInline icon={BookOpen} title="Start your first learning path" text="Choose a skill to learn and track your progress as you grow." action="/app/sessions" actionText="Add a learning goal" />}
      </section>
      <div className="dashboard-grid">
        <section className="surface-card getting-started">
          <div className="card-heading"><div><span className="section-kicker">A SIMPLE PLACE TO START</span><h2>Your next steps</h2></div><span className="quiet-badge"><Sparkles size={13} /> Start here</span></div>
          <div className="checklist">
            <ChecklistItem done={Boolean(data.hasSkills)} number="01" title="Tell us what you know" text="Add a skill you’d love to teach." to="/app/profile" />
            <ChecklistItem done={Boolean(data.hasSkills)} number="02" title="Pick something to learn" text="Your interests help find a great fit." to="/app/profile" />
            <ChecklistItem done={Boolean(data.hasMatch)} number="03" title="Find your learning people" text="Explore partners who complement you." to="/app/explore" />
          </div>
          <Link to="/app/profile" className="text-link">Set up your profile <ArrowRight size={15} /></Link>
        </section>
        <section className="surface-card dashboard-shortcuts">
          <div className="card-heading"><div><span className="section-kicker">A LITTLE HELP GOES A LONG WAY</span><h2>What’s on your mind?</h2></div></div>
          <Link to="/app/explore" className="shortcut-row"><span className="shortcut-icon shortcut-lavender"><Compass size={18} /></span><span><strong>Find a skill partner</strong><small>Trade knowledge, not money</small></span><ArrowRight size={16} /></Link>
          <Link to="/app/learn" className="shortcut-row"><span className="shortcut-icon shortcut-mint"><BookOpen size={18} /></span><span><strong>Study with free videos</strong><small>Explore lessons and track your progress</small></span><ArrowRight size={16} /></Link>
          <Link to="/app/doubts" className="shortcut-row"><span className="shortcut-icon shortcut-peach"><Sparkles size={18} /></span><span><strong>Untangle a tricky topic</strong><small>Ask the free AI doubt solver</small></span><ArrowRight size={16} /></Link>
          <Link to="/app/calendar" className="shortcut-row"><span className="shortcut-icon shortcut-mint"><CalendarDays size={18} /></span><span><strong>Plan a learning session</strong><small>See your calendar and set a time</small></span><ArrowRight size={16} /></Link>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="surface-card upcoming-card">
          <div className="card-heading"><div><span className="section-kicker">A MOMENT TO LOOK FORWARD TO</span><h2>Upcoming sessions</h2></div><Link to="/app/calendar" className="text-link">Open calendar <ArrowRight size={14} /></Link></div>
          {data.upcomingSessions.length ? data.upcomingSessions.map((session) =>
            <div className="session-row" key={session.id}>
              <span className="session-date"><strong>{new Date(session.date).getDate()}</strong><small>{new Date(session.date).toLocaleString('en', { month: 'short' })}</small></span>
              <span><strong>{session.title}</strong><small>{session.partnerName} · {session.skillName} · {session.startTime}</small></span>
            </div>) :
            <EmptyInline icon={CalendarDays} title="Your calendar is clear" text="Once you’re connected with a learning partner, you can plan your first session here." action="/app/explore" actionText="Find a partner" />}
        </section>
        <section className="free-promise"><span className="promise-icon"><Heart size={19} /></span><div><strong>Good learning doesn't need a price tag.</strong><p>Skill exchange and the AI doubt solver are free. Paid expert sessions, verified certificates and profile extras are optional future additions — never a requirement to learn.</p><Link to="/app/safety">A few community guidelines <ArrowRight size={14} /></Link></div></section>
      </div>
    </>}
  </div>;
}

function ChecklistItem({ done, number, title, text, to }) {
  return <Link to={to} className="checklist-item"><span className={`checklist-number ${done ? 'is-done' : ''}`}>{done ? <Check size={14} /> : number}</span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15} /></Link>;
}

function LoadingCard() { return <div className="loading-surface"><span className="loader" /><span>Gathering your learning space…</span></div>; }
function ErrorCard({ message, retry }) { return <div className="error-card"><CircleHelp size={20} /><div><strong>We couldn’t load this just yet</strong><p>{message}</p></div><button className="button button-outline button-sm" onClick={retry}>Try again</button></div>; }
function EmptyInline({ icon: Icon, title, text, action, actionText }) { return <div className="empty-inline"><span className="empty-icon"><Icon size={19} /></span><div><strong>{title}</strong><p>{text}</p><Link to={action} className="text-link">{actionText} <ArrowRight size={14} /></Link></div></div>; }

function Explore() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [activeFilter, setActiveFilter] = useState('All interests');
  const [sort, setSort] = useState('match');
  const [teachFilter, setTeachFilter] = useState('');
  const [learnFilter, setLearnFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [consent, setConsent] = useState(localStorage.getItem('skillbridge.safetyAcknowledged') === 'true');
  const [target, setTarget] = useState(null);
  const filters = ['All interests','Technology','Design','Languages','Business'];
  const fetchMatches = (search = query, category = activeFilter, nextPage = 0, order = sort, extra = {}) => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('query', search);
    if (category !== 'All interests') params.set('category', category);
    const teach = extra.teaches ?? teachFilter, learn = extra.learns ?? learnFilter, day = extra.dayOfWeek ?? dayFilter;
    if (teach) params.set('teaches', teach);
    if (learn) params.set('learns', learn);
    if (day) params.set('dayOfWeek', day);
    params.set('page', String(nextPage)); params.set('size', '24'); params.set('sort', order);
    api(`/matches?${params}`).then((result) => { setMatches(result.items || []); setPage(result.page || 0); setTotalPages(result.totalPages || 0); setTotalMatches(result.totalItems || 0); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchMatches(''); }, []);
  const connect = async (match) => {
    try {
      await api('/exchange-requests', { method: 'POST', body: JSON.stringify({ receiverId: match.userId, message: 'Hi! I think we could learn a lot from each other.' }) });
      setNotice('Your request is on its way. You’ll hear back when they respond.');
      setTarget(null);
    } catch (e) { setNotice(e.message); setTarget(null); }
  };
  const beginConnect = (match) => {
    if (localStorage.getItem('skillbridge.safetyAcknowledged') === 'true') connect(match);
    else setTarget(match);
  };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">FIND YOUR PEOPLE</span><h1>Meet your next learning partner.</h1><p>Great learning is a two-way street. Let’s find the other half.</p></div><span className="free-tag free-tag-large"><Heart size={13} /> ALWAYS FREE</span></div><form className="search-panel" onSubmit={(e) => { e.preventDefault(); fetchMatches(); }}><div className="search-input-wrap"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “Python”, “drawing” or a name" aria-label="Search skills and partners" /><button type="submit" className="button button-primary button-sm">Search</button></div><div className="filter-row">{filters.map((filter) => <button type="button" key={filter} className={`filter-chip ${activeFilter === filter ? 'filter-selected' : ''}`} onClick={() => {setActiveFilter(filter); fetchMatches(query, filter, 0);}}>{filter}</button>)}<label className="match-sort">Sort <select value={sort} onChange={(e)=>{setSort(e.target.value);fetchMatches(query,activeFilter,0,e.target.value);}}><option value="match">Best match</option><option value="name">Name</option></select></label><label>Can teach<input aria-label="Filter by teaching skill" value={teachFilter} onChange={(e)=>{setTeachFilter(e.target.value);fetchMatches(query,activeFilter,0,sort,{teaches:e.target.value});}} placeholder="Teaching skill" /></label><label>Want to learn<input aria-label="Filter by learning skill" value={learnFilter} onChange={(e)=>{setLearnFilter(e.target.value);fetchMatches(query,activeFilter,0,sort,{learns:e.target.value});}} placeholder="Learning skill" /></label><label>Available day<select aria-label="Filter by availability day" value={dayFilter} onChange={(e)=>{setDayFilter(e.target.value);fetchMatches(query,activeFilter,0,sort,{dayOfWeek:e.target.value});}}><option value="">Any day</option>{["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d,i)=><option key={d} value={i+1}>{d}</option>)}</select></label><button type="button" className="button button-outline button-sm" onClick={()=>{setQuery("");setTeachFilter("");setLearnFilter("");setDayFilter("");setActiveFilter("All interests");fetchMatches("","All interests",0,sort,{teaches:"",learns:"",dayOfWeek:""});}}>Clear filters</button></div></form>{notice && <div className="inline-notice" role="status"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}{target && <div className="modal-overlay" role="presentation" onClick={() => setTarget(null)}><section className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-heading" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setTarget(null)} aria-label="Close"><X size={18} /></button><span className="modal-shield"><ShieldCheck size={22} /></span><span className="section-kicker">A QUICK SAFETY PAUSE</span><h2 id="consent-heading">Good connections start with care.</h2><p>Take a moment to read our safety guidelines before you reach out. Keep personal and financial details private, and let us know if anything feels off.</p><Link to="/app/safety" className="text-link">Read the Safety Center <ArrowRight size={14} /></Link><label className="consent-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I understand that SkillBridge connects me with other users and that I should follow the platform’s safety guidelines.</span></label><button className="button button-primary button-full" disabled={!consent} onClick={() => {localStorage.setItem('skillbridge.safetyAcknowledged','true'); connect(target);}}>I understand — send request <ArrowRight size={15} /></button></section></div>}{loading ? <LoadingCard /> : error ? <ErrorCard message={error} retry={() => fetchMatches()} /> : matches.length ? <><p className="muted-small" aria-live="polite">Showing {matches.length} of {totalMatches} learning partners</p><div className="match-grid">{matches.map((person) => <MatchCard key={person.userId} person={person} onConnect={() => beginConnect(person)} />)}</div><div className="match-pagination"><button className="button button-outline button-sm" disabled={page===0||loading} onClick={()=>fetchMatches(query,activeFilter,page-1)}>Previous</button><span>Page {page+1} of {Math.max(1,totalPages)}</span><button className="button button-outline button-sm" disabled={page+1>=totalPages||loading} onClick={()=>fetchMatches(query,activeFilter,page+1)}>Next</button></div></> : <div className="surface-card no-matches"><span className="empty-icon"><Users size={20} /></span><h3>No partners to show just yet</h3><p>New to SkillBridge? Add a few teaching and learning interests to your profile, and we’ll find people with complementary skills.</p><Link to="/app/profile" className="button button-primary">Add my skills <ArrowRight size={15} /></Link></div>}</div>;
}

function MatchCard({ person, onConnect }) {
  return <article className="match-card"><div className="match-card-top"><ProfileAvatar name={person.name} image={person.profileImage} className="match-avatar" /><span className="match-percent">{person.matchScore}% match</span></div><h3>{person.name}</h3><p className="match-bio">{person.bio || 'Ready to learn, teach and share skills.'}</p><div className="match-skill-section"><span className="mini-label">CAN TEACH YOU</span><div className="skill-tags">{person.teaches?.map((s) => <span className="skill-tag skill-teach" key={s}>{s}</span>) || <span className="muted-small">No teaching skills yet</span>}</div></div><div className="match-skill-section"><span className="mini-label">WANTS TO LEARN</span><div className="skill-tags">{person.learns?.map((s) => <span className="skill-tag skill-learn" key={s}>{s}</span>) || <span className="muted-small">No learning interests yet</span>}</div></div>{person.reasons?.length > 0 && <ul className="match-reasons">{person.reasons.slice(0,2).map((reason) => <li key={reason}><Check size={13} />{reason}</li>)}</ul>}<div className="match-card-actions"><Link to={`/app/users/${person.userId}`} className="button button-outline button-sm">View profile</Link><button className="button button-primary button-sm" onClick={onConnect}>Connect <ArrowRight size={14} /></button></div></article>;
}

function Exchanges() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api('/exchange-requests').then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const respond = async (item, action) => {
    setError('');
    try { await api(`/exchange-requests/${item.id}/${action}`, { method: 'PUT' }); load(); }
    catch (e) { setError(e.message); }
  };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">A LITTLE GIVE & TAKE</span><h1>Your exchanges</h1><p>Every great skill swap begins with a conversation.</p></div><Link to="/app/explore" className="button button-primary"><Plus size={16} /> Find a partner</Link></div>{error && <div className="form-error" role="alert">{error}</div>}{loading ? <LoadingCard /> : items.length ? <div className="exchange-list">{items.map((item) => <article className="exchange-list-card" key={item.id}><span className="avatar">{initials(item.otherUserName)}</span><div className="exchange-list-copy"><strong>{item.otherUserName}</strong><p>{item.message || 'Let’s learn together.'}</p><small>{item.status.toLowerCase()} · {new Date(item.createdAt).toLocaleDateString()}</small></div><span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>{item.status === 'PENDING' && item.isIncoming && <div className="exchange-actions"><button className="button button-primary button-sm" onClick={() => respond(item,'accept')}>Accept <Check size={14} /></button><button className="button button-outline button-sm" onClick={() => respond(item,'reject')}>Decline</button></div>}{item.status === 'PENDING' && !item.isIncoming && <button className="button button-outline button-sm" onClick={async()=>{try{await api(`/exchange-requests/${item.id}`,{method:'DELETE'});load();}catch(e){setError(e.message);}}}>Cancel request</button>}{item.status === 'ACCEPTED' && <Link to="/app/messages" className="button button-outline button-sm">Message <MessageCircle size={14} /></Link>}</article>)}</div> : <div className="surface-card no-matches"><span className="empty-icon"><Users size={20} /></span><h3>Your learning journey starts with a hello.</h3><p>Find someone whose skills complement yours. Send a request to start a free exchange.</p><Link to="/app/explore" className="button button-primary">Explore partners <ArrowRight size={15} /></Link></div>}</div>;
}

function Sessions() {
  const [data, setData] = useState({ sessions: [], progress: [] });
  const [connections, setConnections] = useState([]);
  const [schedule, setSchedule] = useState({ connectionId: '', title: '', skillName: '', date: '', startTime: '', endTime: '', overrideAvailability: false });
  const [rescheduling, setRescheduling] = useState(null);
  const [progressForm, setProgressForm] = useState({ skillName: '', progressPercentage: 0, currentTopic: '' });
  const [showSchedule, setShowSchedule] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError('');
    try { const [sessions, progress, partners] = await Promise.all([api('/sessions'), api('/progress'), api('/conversations')]); setData({ sessions, progress }); setConnections(partners); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const createSession = async (event) => {
    event.preventDefault(); setError('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (rescheduling) await api(`/sessions/${rescheduling}`, { method: 'PATCH', body: { date: schedule.date, startTime: schedule.startTime, endTime: schedule.endTime, timeZone, overrideAvailability: schedule.overrideAvailability } });
      else await api('/sessions', { method: 'POST', body: { ...schedule, connectionId: Number(schedule.connectionId), timeZone } });
      setShowSchedule(false); setRescheduling(null); setSchedule({ connectionId: '', title: '', skillName: '', date: '', startTime: '', endTime: '', overrideAvailability: false }); load();
    }
    catch (e) { setError(e.message); }
  };
  const saveProgress = async (event) => {
    event.preventDefault(); setError('');
    try { await api('/progress', { method: 'POST', body: JSON.stringify({ ...progressForm, progressPercentage: Number(progressForm.progressPercentage) }) }); setShowProgress(false); setProgressForm({ skillName: '', progressPercentage: 0, currentTopic: '' }); load(); }
    catch (e) { setError(e.message); }
  };
  const updateSession = async (session, status) => {
    try { await api(`/sessions/${session.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setError(e.message); }
  };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">SMALL STEPS, BIG GROWTH</span><h1>Sessions & progress</h1><p>Make a little room for learning — then notice how far you've come.</p></div><span className="quiet-badge"><Heart size={13} /> Learning is free</span></div>{error && <div className="form-error" role="alert">{error}</div>}{loading ? <LoadingCard /> : <><section className="surface-card session-section"><div className="card-heading"><div><span className="section-kicker">LEARN TOGETHER</span><h2>Your sessions</h2></div><button className="button button-outline button-sm" disabled={!connections.length} onClick={()=>{setRescheduling(null);setShowSchedule(!showSchedule);}}><Plus size={14}/> Schedule session</button></div>{showSchedule && <form className="inline-form" onSubmit={createSession}><label>Learning partner<select required value={schedule.connectionId} onChange={(e)=>setSchedule({...schedule,connectionId:e.target.value})}><option value="">Choose a connection</option>{connections.map((item)=><option key={item.id} value={item.id}>{item.otherUserName}</option>)}</select></label><label>Session title<input required maxLength="120" value={schedule.title} onChange={(e)=>setSchedule({...schedule,title:e.target.value})} placeholder="e.g. Getting started with Python"/></label><label>Skill<input required maxLength="100" value={schedule.skillName} onChange={(e)=>setSchedule({...schedule,skillName:e.target.value})} placeholder="What will you work on?"/></label><label>Date<input required type="date" min={new Date().toISOString().slice(0,10)} value={schedule.date} onChange={(e)=>setSchedule({...schedule,date:e.target.value})}/></label><label>Starts<input required type="time" value={schedule.startTime} onChange={(e)=>setSchedule({...schedule,startTime:e.target.value})}/></label><label>Ends<input required type="time" value={schedule.endTime} onChange={(e)=>setSchedule({...schedule,endTime:e.target.value})}/></label><label className="check-label"><input type="checkbox" checked={schedule.overrideAvailability} onChange={(e)=>setSchedule({...schedule,overrideAvailability:e.target.checked})}/> Override declared availability for this request</label><button className="button button-primary button-sm">{rescheduling?'Save reschedule':'Schedule session'}</button></form>}{data.sessions.length ? data.sessions.map((session)=><div className="session-row" key={session.id}><span className="session-date"><strong>{new Date(session.date).getDate()}</strong><small>{new Date(session.date).toLocaleString('en',{month:'short'})}</small></span><span><strong>{session.title}</strong><small>{session.skillName} · {session.startTime}–{session.endTime}</small></span><span className="status-pill">{session.status}</span>{session.status==='PENDING_CONFIRMATION'&&!session.createdByMe&&<button className="button button-primary button-sm" onClick={()=>updateSession(session,'ACCEPTED')}>Accept</button>}{['PENDING_CONFIRMATION','UPCOMING'].includes(session.status)&&<button className="button button-outline button-sm" onClick={()=>{setRescheduling(session.id);setSchedule({connectionId:String(session.connectionId),title:session.title,skillName:session.skillName,date:session.date,startTime:session.startTime,endTime:session.endTime,overrideAvailability:false});setShowSchedule(true);}}>Reschedule</button>}{(['PENDING_CONFIRMATION','UPCOMING','IN_PROGRESS'].includes(session.status)&&<button className="button button-outline button-sm" onClick={()=>updateSession(session,'CANCELLED')}>Cancel</button>)}{(['UPCOMING','IN_PROGRESS','COMPLETION_PENDING'].includes(session.status)&&new Date(`${session.date}T${session.endTime}:00`)<=new Date()&&!session.completionConfirmedByMe&&<button className="button button-primary button-sm" onClick={()=>updateSession(session,'COMPLETED')}>Confirm completion</button>)}{session.status==='COMPLETED'&&!session.reviewedByMe&&<ReviewForm connectionId={session.connectionId} onSubmitted={load}/>}</div>) : <EmptyInline icon={CalendarDays} title="A little space on your calendar" text="When you connect with a partner, plan your first session here." action="/app/explore" actionText="Meet a partner" />}</section><section className="surface-card session-section"><div className="card-heading"><div><span className="section-kicker">KEEP TRACK OF THE LITTLE WINS</span><h2>What you're learning</h2></div><button className="button button-outline button-sm" onClick={()=>setShowProgress(!showProgress)}><Plus size={14}/> Track a skill</button></div>{showProgress&&<form className="inline-form" onSubmit={saveProgress}><label>Skill<input required maxLength="100" value={progressForm.skillName} onChange={(e)=>setProgressForm({...progressForm,skillName:e.target.value})} placeholder="e.g. Python"/></label><label>Progress (%)<input required type="number" min="0" max="100" value={progressForm.progressPercentage} onChange={(e)=>setProgressForm({...progressForm,progressPercentage:e.target.value})}/></label><label>Current topic<input maxLength="120" value={progressForm.currentTopic} onChange={(e)=>setProgressForm({...progressForm,currentTopic:e.target.value})} placeholder="What are you exploring now?"/></label><button className="button button-primary button-sm">Save progress</button></form>}{data.progress.length ? data.progress.map((entry)=><div className="progress-item" key={entry.id}><div className="progress-item-heading"><span><strong>{entry.skillName}</strong><small>{entry.currentTopic || 'Keep building your skills'}</small></span><b>{entry.progressPercentage}%</b></div><div className="progress-track"><span style={{width:`${entry.progressPercentage}%`}} /></div></div>) : <EmptyInline icon={GraduationCap} title="Your learning, your pace" text="Connect with a partner and track the topics and milestones you explore together." action="/app/explore" actionText="Find a learning partner" />}</section></>}</div>;
}

function Messages() {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setError(''); return Promise.all([api('/messages'),api('/conversations')]).then(([items,threads])=>{setMessages(items);setConversations(threads);setSelected((current)=>current ?? threads[0]?.id ?? null);}).catch((e)=>setError(e.message)).finally(()=>setLoading(false)); };
  useEffect(() => {
    load();
    const refresh = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 5000);
    return () => window.clearInterval(refresh);
  }, []);
  useEffect(() => { if (selected) api(`/conversations/${selected}/read`, { method: 'PUT' }).then(load).catch((e) => setError(e.message)); }, [selected]);
  const active = conversations.find((item)=>item.id===selected);
  const visible = messages.filter((item)=>item.connectionId===selected);
  const send = async(e)=>{e.preventDefault();if(!draft.trim()||!selected)return;setError('');try{await api('/messages',{method:'POST',body:JSON.stringify({connectionId:selected,message:draft.trim()})});setDraft('');await load();}catch(e){setError(e.message);}};
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">CONVERSATIONS THAT HELP YOU GROW</span><h1>Your messages</h1><p>Once an exchange request is accepted, your conversation starts here.</p></div></div>{loading ? <LoadingCard /> : error && !conversations.length ? <ErrorCard message={error} retry={load} /> : conversations.length ? <section className="surface-card chat-layout"><aside className="conversation-list"><strong>Your connections</strong>{conversations.map((item)=><button key={item.id} onClick={()=>setSelected(item.id)} className={`conversation-option ${selected===item.id?'conversation-option-active':''}`}><span className="avatar">{initials(item.otherUserName)}</span><span><b>{item.otherUserName}</b><small>{item.lastMessage || 'Your new learning connection'}</small></span>{item.unreadCount > 0 && <span className="unread-count" aria-label={`${item.unreadCount} unread messages`}>{item.unreadCount}</span>}</button>)}</aside><div className="active-chat"><div className="active-chat-heading"><span className="avatar">{initials(active?.otherUserName)}</span><div><strong>{active?.otherUserName}</strong><small>SkillBridge connection</small></div></div><div className="active-chat-messages">{visible.map((message)=><div key={message.id} className={`chat-message ${message.mine?'chat-user':''}`}><p>{message.message}<small>{new Date(message.createdAt).toLocaleString()}{message.mine ? (message.read ? ' · Read' : ' · Sent') : ''}</small></p></div>)}</div><form className="send-message-form" onSubmit={send}><input value={draft} onChange={(e)=>setDraft(e.target.value)} maxLength="4000" placeholder="Share a thought or ask a question…" aria-label="Write a message" /><button className="button button-primary button-sm" disabled={!draft.trim()}>Send <ArrowRight size={14} /></button></form>{error&&<div className="form-error">{error}</div>}</div></section> : <div className="surface-card no-matches"><span className="empty-icon"><MessageCircle size={20} /></span><h3>No conversations yet</h3><p>Messages open up once an exchange request is accepted. Start by finding a learning partner.</p><Link to="/app/explore" className="button button-primary">Find a partner <ArrowRight size={15} /></Link></div>}</div>;
}

function DoubtSolver() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api('/ai/conversations').then(setConversations).catch((e) => setError(e.message)); }, []);
  const startNewChat = () => { setConversationId(null); setMessages([]); setQuestion(''); setError(''); };
  const openConversation = async (id) => {
    setError('');
    try {
      const result = await api(`/ai/conversations/${id}`);
      setConversationId(result.id);
      setMessages(result.messages);
    } catch (e) { setError(e.message); }
  };
  const renameConversation = async () => {
    const active = conversations.find((item) => item.id === conversationId);
    if (!active) return;
    const title = window.prompt('Name this learning chat', active.title);
    if (!title?.trim()) return;
    try {
      await api(`/ai/conversations/${conversationId}`, { method: 'PUT', body: JSON.stringify({ title: title.trim() }) });
      setConversations(conversations.map((item) => item.id === conversationId ? { ...item, title: title.trim() } : item));
    } catch (e) { setError(e.message); }
  };
  const deleteConversation = async () => {
    if (!conversationId) return;
    try {
      await api(`/ai/conversations/${conversationId}`, { method: 'DELETE' });
      setConversations(conversations.filter((item) => item.id !== conversationId));
      startNewChat();
    } catch (e) { setError(e.message); }
  };
  const ask = async (text = question) => {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: 'user', content: text.trim() }];
    setMessages(next); setQuestion(''); setBusy(true); setError('');
    try {
      const result = await api('/ai/doubt', { method: 'POST', body: JSON.stringify({ question: text.trim(), conversationId }) });
      setConversationId(result.conversationId);
      setMessages([...next, { role: 'assistant', content: result.answer }]);
      api('/ai/conversations').then(setConversations).catch((e) => setError(e.message));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="content-page doubt-page"><div className="page-intro"><div><span className="section-kicker">A FRIENDLY NUDGE WHEN YOU’RE STUCK</span><h1>Your free doubt solver.</h1><p>A quick explanation can help something click. And a real person can help you go further.</p></div><span className="free-tag free-tag-large"><Sparkles size={13} /> FREE TO USE</span></div><div className="doubt-history-bar"><button className="button button-outline button-sm" onClick={startNewChat}><Plus size={14}/> New chat</button><div>{conversations.map((item)=><button key={item.id} className={`history-chip ${conversationId===item.id?'history-chip-active':''}`} onClick={()=>openConversation(item.id)}>{item.title}</button>)}</div>{conversationId&&<div className="history-actions"><button className="button button-outline button-sm" onClick={renameConversation}>Rename</button><button className="button button-outline button-sm" onClick={deleteConversation}>Delete</button></div>}</div><section className="surface-card doubt-chat"><div className="doubt-chat-head"><span className="ai-avatar"><Sparkles size={19} /></span><div><strong>SkillBridge learning helper</strong><small>Answers from the configured AI service</small></div><span className="ai-online"><i /> Ready</span></div><div className="doubt-conversation">{messages.length === 0 ? <div className="doubt-empty"><span className="doubt-sun">✳</span><h2>Have a doubt?<br /><span>Let’s untangle it.</span></h2><p>Ask a question, paste a tricky error or request a gentle step-by-step explanation.</p><div className="prompt-suggestions">{['Explain a concept simply','Help me understand this code','Give me an example','Quiz me on a topic'].map((prompt)=><button key={prompt} onClick={()=>{setQuestion(prompt);}}>{prompt}<ArrowRight size={13} /></button>)}</div></div> : <div className="chat-messages">{messages.map((message,index)=><div key={index} className={`chat-message ${message.role === 'user' ? 'chat-user' : ''}`}><span className={message.role === 'user' ? 'chat-avatar chat-avatar-user' : 'chat-avatar'}>{message.role === 'user' ? 'You' : <Sparkles size={13} />}</span><p>{message.content}</p></div>)}{busy && <div className="typing"><i /><i /><i /> Thinking it through…</div>}</div>}{error && <div className="form-error" role="alert">{error}</div>}</div><form className="doubt-input" onSubmit={(e)=>{e.preventDefault();ask();}}><textarea rows="2" value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="What would you like to understand?" aria-label="Ask your learning question" /><div className="doubt-input-bottom"><span><CircleHelp size={13} /> Keep private details out of your question.</span><button className="button button-primary button-sm" disabled={busy || !question.trim()}>{busy ? 'Thinking…' : 'Ask away'} <ArrowRight size={14} /></button></div></form></section><div className="ai-disclaimer"><ShieldCheck size={16} /><span>AI-generated answers can be wrong. Verify important information with reliable sources or a qualified instructor.</span><Link to="/app/explore">Want a real person? Find a skill partner <ArrowRight size={14} /></Link></div></div>;
}

function Profile({ user, onSave }) {
  const [form, setForm] = useState({ name: user.name || '', college: user.college || '', bio: user.bio || '', phone: user.phone || '', certifications: user.certifications || '', teachingSkills: user.teachingSkills || '', learningSkills: user.learningSkills || '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key) => (e) => setForm({...form,[key]:e.target.value});
  const save = async (e) => {
    e.preventDefault(); setBusy(true);setError('');setNotice('');
    try { const result=await api('/profile',{method:'PUT',body:JSON.stringify({...form,teachingSkills:form.teachingSkills.split(',').map(s=>s.trim()).filter(Boolean),learningSkills:form.learningSkills.split(',').map(s=>s.trim()).filter(Boolean)})});onSave(result);setNotice('Your profile is saved.'); }
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">THE HUMAN BEHIND THE SKILLS</span><h1>Your profile</h1><p>Share a little about yourself. Your skills help us find a thoughtful match.</p></div></div><form className="surface-card profile-form" onSubmit={save}><div className="profile-heading"><ProfileAvatar name={form.name} image={user.profileImage} className="profile-avatar" /><div><strong>{form.name || 'Your name'}</strong><small>{user.email} · Member since {user.memberSince || '—'}</small></div></div><div className="profile-fields"><label>Your name<input value={form.name} onChange={update('name')} required /></label><label>College or organization<input value={form.college} onChange={update('college')} placeholder="Optional" /></label><label>Contact number<input type="tel" maxLength="40" value={form.phone} onChange={update('phone')} placeholder="Optional" /></label><label>Certificates <span className="optional">Self-reported; separate with semicolons</span><input maxLength="1000" value={form.certifications} onChange={update('certifications')} placeholder="e.g. Python Foundations" /></label><label className="field-full">A little about you<textarea rows="3" maxLength="500" value={form.bio} onChange={update('bio')} placeholder="What are you curious about?" /></label><label className="field-full">Skills I can teach <span className="optional">Separate with commas</span><input value={form.teachingSkills} onChange={update('teachingSkills')} placeholder="e.g. Python, creative writing" /></label><label className="field-full">Skills I’d like to learn <span className="optional">Separate with commas</span><input value={form.learningSkills} onChange={update('learningSkills')} placeholder="e.g. UI design, Spanish" /></label></div>{error && <div className="form-error">{error}</div>}{notice && <div className="inline-notice"><Check size={15} />{notice}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save my profile'} <ArrowRight size={15} /></button></form><PrivacyControls /><AvailabilityControls /><section className="free-promise profile-promise"><span className="promise-icon"><ShieldCheck size={19} /></span><div><strong>Your privacy matters.</strong><p>Only share what you’re comfortable making visible to other learners. Skill claims are user-provided and aren’t independently verified.</p><Link to="/app/safety">Read the Safety Center <ArrowRight size={14} /></Link></div></section></div>;
}

function AvailabilityControls() {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/availability').then(setSlots).catch((e) => setError(e.message)); }, []);
  const update = (index, key, value) => setSlots((current) => current.map((slot, i) => i === index ? { ...slot, [key]: value } : slot));
  const add = () => setSlots((current) => [...current, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', timeZone: zone, mode: 'ONLINE', preferredDurationMinutes: 60 }]);
  const save = async (event) => { event.preventDefault(); setBusy(true); setError(''); setNotice(''); try { setSlots(await api('/availability', { method: 'PUT', body: { slots } })); setNotice('Availability saved.'); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <section className="surface-card session-section"><div className="card-heading"><div><span className="section-kicker">MAKE SCHEDULING EASIER</span><h2>Your weekly availability</h2></div><button type="button" className="button button-outline button-sm" onClick={add}><Plus size={14}/> Add a time</button></div><p>Times use your local zone ({zone}). Availability is enforced during session scheduling when you have saved slots.</p><form className="inline-form" onSubmit={save}>{slots.map((slot,index)=><div className="availability-row" key={`${index}-${slot.dayOfWeek}`}><label>Day<select value={slot.dayOfWeek} onChange={(e)=>update(index,'dayOfWeek',Number(e.target.value))}>{weekdays.map((day,i)=><option key={day} value={i+1}>{day}</option>)}</select></label><label>From<input type="time" value={slot.startTime} onChange={(e)=>update(index,'startTime',e.target.value)} required /></label><label>Until<input type="time" value={slot.endTime} onChange={(e)=>update(index,'endTime',e.target.value)} required /></label><label>Mode<select value={slot.mode} onChange={(e)=>update(index,'mode',e.target.value)}><option value="ONLINE">Online</option><option value="OFFLINE">In person</option><option value="BOTH">Either</option></select></label><label>Preferred minutes<input type="number" min="15" max="240" step="15" value={slot.preferredDurationMinutes} onChange={(e)=>update(index,'preferredDurationMinutes',Number(e.target.value))} /></label><button type="button" className="button button-outline button-sm" aria-label={`Remove ${weekdays[slot.dayOfWeek-1]} availability`} onClick={()=>setSlots((current)=>current.filter((_,i)=>i!==index))}>Remove</button></div>)}{!slots.length && <p>No availability set. Add slots to help partners find suitable times.</p>}{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status">{notice}</div>}<button className="button button-primary button-sm" disabled={busy}>{busy ? 'Saving…' : 'Save availability'}</button></form></section>;
}

function PrivacyControls() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/privacy').then(setSettings).catch((e) => setError(e.message)); }, []);
  const toggle = (field) => (event) => setSettings((current) => ({ ...current, [field]: event.target.checked }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { setSettings(await api('/privacy', { method: 'PUT', body: settings })); setNotice('Your privacy settings are saved.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const options = [
    ['profileVisible', 'Show my profile in discovery', 'Hidden profiles won’t appear in search or recommendations.'],
    ['emailVisible', 'Show my email on my public profile', 'Email stays private unless you explicitly enable this.'],
    ['phoneVisible', 'Show my phone number on my public profile', 'Phone numbers stay private unless you explicitly enable this.'],
    ['locationVisible', 'Show my college or organization', 'This broad affiliation is shown on your profile.'],
    ['skillsVisible', 'Show my teaching and learning skills', 'Required for partner matching when enabled.'],
    ['availabilityVisible', 'Show my availability', 'Share weekly time slots with other learners.'],
    ['allowExchangeRequests', 'Accept exchange requests', 'People can send you a new skill exchange request.'],
    ['allowMessages', 'Accept messages from existing connections', 'Turn this off to stop messages even from accepted connections.'],
  ];
  return <section className="surface-card privacy-controls"><div className="card-heading"><div><span className="section-kicker">YOUR PROFILE, YOUR CHOICE</span><h2>Privacy settings</h2></div></div>{!settings ? error ? <div className="form-error" role="alert">{error}</div> : <LoadingCard /> : <form onSubmit={save}><div className="privacy-option-list">{options.map(([field, title, detail]) => <label className="privacy-option" key={field}><input type="checkbox" checked={Boolean(settings[field])} onChange={toggle(field)} /><span><strong>{title}</strong><small>{detail}</small></span></label>)}</div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status"><Check size={15} />{notice}</div>}<button className="button button-primary button-sm" disabled={busy}>{busy ? 'Saving…' : 'Save privacy settings'}</button></form>}</section>;
}

function Safety({ publicPage = false, user }) {
  return <div className={`content-page safety-page ${publicPage ? 'safety-public' : ''}`}><div className="safety-hero"><span className="safety-shield"><ShieldCheck size={24} /></span><span className="section-kicker">LOOK OUT FOR EACH OTHER</span><h1>Stay safe on SkillBridge.</h1><p>Good learning starts with a little care. Trust your judgment, take things at your pace and tell us when something doesn't feel right.</p></div><div className="safety-grid"><section className="surface-card safety-card"><h2>A few things to keep close.</h2>{['Never share passwords, one-time codes, banking details or private financial information.','Keep personal details private unless you genuinely feel comfortable sharing them.','Be respectful and professional. Abusive, threatening or discriminatory behavior is not okay.','Check important advice independently — we cannot guarantee another member’s skills or claims.','Never send money to another member. SkillBridge does not collect payments for peer-to-peer exchanges.','Meet in a public place if you ever choose to meet offline, and let someone you trust know.'].map((text,i)=><div className="safety-rule" key={text}><span>{String(i+1).padStart(2,'0')}</span><p>{text}</p></div>)}</section><section className="surface-card report-card"><span className="report-icon"><ShieldCheck size={20} /></span><h2>Something doesn't feel right?</h2><p>Report suspicious, abusive or inappropriate behavior. Our safety team can review what you send.</p><ReportForm canSubmit={Boolean(user)} /><hr /><h3>Need to block someone?</h3><p className="report-small">Open their profile and use the block control to prevent future contact.</p></section></div>{!publicPage && <BlockedUsers />}<div className="disclaimer-card"><CircleHelp size={18} /><p>SkillBridge is a platform for peer-to-peer learning and connection. Verify information shared by others independently. We do not guarantee the accuracy, quality or outcome of user-provided learning content.</p></div>{!publicPage && <Link className="back-link" to="/app"> <ArrowLeft size={14} /> Back to your learning space</Link>}</div>;
}

function ReportForm({ targetType = 'PLATFORM', targetId = null, canSubmit = true }) {
  const [reason, setReason] = useState('SCAM_OR_FRAUD');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const submit=async(e)=>{e.preventDefault();setBusy(true);setStatus('');try{await api('/reports',{method:'POST',body:JSON.stringify({category:reason,description,targetType,targetId})});setStatus('Thank you. Your report was securely submitted for review.');setDescription('');}catch(e){setStatus(e.message);}finally{setBusy(false);}};
  if (!canSubmit) {
    return <p className="report-small">Please <Link to="/login">log in</Link> to submit a safety report.</p>;
  }
  return <form className="report-form" onSubmit={submit}><label>What are you reporting?<select value={reason} onChange={(e)=>setReason(e.target.value)}><option value="SCAM_OR_FRAUD">Scam or fraud</option><option value="HARASSMENT">Harassment</option><option value="INAPPROPRIATE_CONTENT">Inappropriate content</option><option value="FAKE_INFORMATION">Fake information</option><option value="OTHER">Other safety concern</option></select></label><label>Anything you’d like us to know? <span className="optional">(optional)</span><textarea rows="3" value={description} onChange={(e)=>setDescription(e.target.value)} maxLength="1000" placeholder="Please don't include passwords or sensitive personal details." /></label>{status && <div className={status.startsWith('Thank you')?'inline-notice':'form-error'} role="status">{status}</div>}<button className="button button-primary button-full" disabled={busy}>{busy?'Submitting…':'Submit a report'} <ArrowRight size={14} /></button></form>;
}

function ReviewForm({ connectionId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/reviews', { method: 'POST', body: JSON.stringify({ connectionId, rating, reviewText }) });
      setDone(true); onSubmitted();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  if (done) return <span className="review-saved"><Check size={13}/> Review saved</span>;
  return <form className="review-inline" onSubmit={submit}><label>Rate this exchange<select value={rating} onChange={(e)=>setRating(Number(e.target.value))}><option value="5">5 — Great</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Needs work</option><option value="1">1 — Poor</option></select></label><input value={reviewText} onChange={(e)=>setReviewText(e.target.value)} maxLength="1200" placeholder="Share a kind, constructive note (optional)"/><button className="button button-outline button-sm" disabled={busy}>{busy?'Saving…':'Leave review'}</button>{error&&<small className="form-error">{error}</small>}</form>;
}

function BlockedUsers() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const load = () => api('/blocks').then(setItems).catch((e)=>setError(e.message));
  useEffect(()=>{load();},[]);
  const unblock=async(id)=>{try{await api(`/users/${id}/block`,{method:'DELETE'});load();}catch(e){setError(e.message);}};
  return <section className="surface-card blocked-users"><h2>Blocked profiles</h2><p>Blocked members can’t send you new exchange requests or messages.</p>{error&&<div className="form-error">{error}</div>}{items.length?items.map((item)=><div className="blocked-user" key={item.userId}><span className="avatar">{initials(item.name)}</span><strong>{item.name}</strong><button className="button button-outline button-sm" onClick={()=>unblock(item.userId)}>Unblock</button></div>):<small>You haven’t blocked anyone.</small>}</section>;
}

function CalendarView() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [calendarMode, setCalendarMode] = useState('month');

  useEffect(() => {
    api('/sessions').then(setSessions).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedDay = new Date(`${selectedDate}T00:00:00`);
  const weekStart = new Date(selectedDay);
  weekStart.setDate(selectedDay.getDate() - selectedDay.getDay());
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  });
  const sessionsOn = (date) => sessions.filter((session) => session.date === date && session.status !== 'CANCELLED');
  const selectedSessions = sessionsOn(selectedDate);
  const dateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const changeMonth = (offset) => {
    if (calendarMode === 'week') {
      const next = new Date(selectedDay);
      next.setDate(next.getDate() + 7 * offset);
      setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      return;
    }
    const nextMonth = new Date(year, monthIndex + offset, 1);
    setMonth(nextMonth);
    setSelectedDate(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`);
  };

  return <div className="content-page">
    <div className="page-intro">
      <div><span className="section-kicker">MAKE SPACE TO LEARN</span><h1>Your calendar</h1><p>See your scheduled learning sessions at a glance.</p></div>
      <Link to="/app/sessions" className="button button-primary"><Plus size={15} /> Schedule a session</Link>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <LoadingCard /> : <section className="surface-card session-section">
      <div className="calendar-heading">
        <button type="button" className="button button-outline button-sm" aria-label={calendarMode === 'week' ? 'Previous week' : 'Previous month'} onClick={() => changeMonth(-1)}><ArrowLeft size={15} /></button>
        <h2 aria-live="polite">{calendarMode === 'week' ? `${new Date(`${weekDates[0]}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${weekDates[6]}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button type="button" className="button button-outline button-sm" aria-label={calendarMode === 'week' ? 'Next week' : 'Next month'} onClick={() => changeMonth(1)}><ArrowRight size={15} /></button>
        <button type="button" className="button button-outline button-sm" aria-pressed={calendarMode === 'month'} onClick={() => setCalendarMode('month')}>Month</button>
        <button type="button" className="button button-outline button-sm" aria-pressed={calendarMode === 'week'} onClick={() => setCalendarMode('week')}>Week</button>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) =>
          <strong className="calendar-weekday" key={day}>{day}</strong>)}
        {(calendarMode === 'week' ? weekDates.map((date) => Number(date.slice(-2))) : cells).map((day, index) => {
          if (!day) return <span className="calendar-empty" key={`empty-${index}`} aria-hidden="true" />;
          const date = calendarMode === 'week' ? weekDates[index] : `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daySessions = sessionsOn(date);
          const selected = date === selectedDate;
          return <button key={date} type="button" onClick={() => setSelectedDate(date)}
            aria-label={`${new Date(`${date}T00:00:00`).toLocaleDateString()}, ${daySessions.length} sessions`}
            aria-pressed={selected}
            className={`calendar-day ${selected ? 'calendar-day-selected' : ''}`}>
            <span className="calendar-day-number">{day}</span>
            {daySessions.length > 0 && <span className="calendar-day-count">{daySessions.length} session{daySessions.length === 1 ? '' : 's'}</span>}
          </button>;
        })}
      </div>
      <div className="calendar-agenda">
        <h3>{dateLabel}</h3>
        {selectedSessions.length ? selectedSessions.map((session) =>
          <article className="session-row" key={session.id}>
            <span className="session-date"><strong>{session.startTime}</strong><small>{session.status}</small></span>
            <span><strong>{session.title}</strong><small>{session.skillName} · {session.startTime}–{session.endTime}</small></span>
            <Link to="/app/sessions" className="button button-outline button-sm">Session details</Link>
          </article>) :
          <p>No sessions on this day. When you schedule a session, it will appear here.</p>}
      </div>
    </section>}
  </div>;
}

function MobileNav() {
  return <nav className="mobile-bottom-nav" aria-label="Main navigation">{links.filter(({to})=>['/app','/app/explore','/app/exchanges','/app/calendar','/app/messages'].includes(to)).map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`mobile-nav-item ${isActive?'mobile-nav-active':''}`}><Icon size={18} /><span>{label==='Find a partner'?'Explore':label==='My exchanges'?'Exchanges':label==='Messages'?'Inbox':label}</span></NavLink>)}</nav>;
}

function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api('/notifications').then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const markRead = async (item) => {
    if (item.isRead) return;
    try {
      await api(`/notifications/${item.id}/read`, { method: 'PUT' });
      setItems(items.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
    } catch (e) { setError(e.message); }
  };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">LITTLE UPDATES FROM YOUR COMMUNITY</span><h1>Notifications</h1><p>Requests, messages and session changes — all in one place.</p></div></div>{error && <div className="form-error">{error}</div>}{loading ? <LoadingCard /> : items.length ? <div className="notification-list">{items.map((item) => <button key={item.id} className={`notification-item ${item.isRead ? '' : 'notification-unread'}`} onClick={() => markRead(item)}><span className="notification-icon"><Bell size={16} /></span><span><strong>{item.title}</strong><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString()}</time></span>{!item.isRead && <i />}</button>)}</div> : <div className="surface-card no-matches"><span className="empty-icon"><Bell size={19} /></span><h3>Nothing new for now</h3><p>When someone reaches out or a session changes, you’ll see the update here.</p></div>}</div>;
}

function PublicProfile() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [notice, setNotice] = useState('');
  const load = () => api(`/users/${id}`).then(setPerson).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);
  const connect = async () => {
    try {
      await api('/exchange-requests', { method: 'POST', body: JSON.stringify({ receiverId: Number(id), message: 'Hi! I think we could learn a lot from each other.' }) });
      setNotice('Your request is on its way.');
      setShowConsent(false);
    } catch (e) { setError(e.message); setShowConsent(false); }
  };
  const block = async () => {
    try { await api(`/users/${id}/block`, { method: 'POST' }); setBlocked(true); setNotice('This profile is blocked. You can manage blocked profiles in Safety.'); }
    catch (e) { setError(e.message); }
  };
  if (error && !person) return <div className="content-page"><ErrorCard message={error} retry={load} /></div>;
  if (!person) return <LoadingCard />;
  const teaching = person.teachingSkills ? person.teachingSkills.split(',').map((skill) => skill.trim()).filter(Boolean) : [];
  const learning = person.learningSkills ? person.learningSkills.split(',').map((skill) => skill.trim()).filter(Boolean) : [];
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">A FELLOW LEARNER</span><h1>Meet {person.name.split(' ')[0]}.</h1><p>Take a look at the skills they’re ready to share.</p></div><Link className="back-link" to="/app/explore"><ArrowLeft size={14} /> Back to exploring</Link></div>{notice && <div className="inline-notice"><Check size={15} />{notice}</div>}{error && <div className="form-error">{error}</div>}<section className="surface-card public-profile-card"><div className="public-profile-heading"><ProfileAvatar name={person.name} image={person.profileImage} className="profile-avatar" /><div><h2>{person.name}</h2><p>{person.college || 'SkillBridge community member'} · Member since {person.memberSince || '—'}</p></div><div className="public-profile-actions"><button className="button button-primary" onClick={() => localStorage.getItem('skillbridge.safetyAcknowledged') === 'true' ? connect() : setShowConsent(true)} disabled={blocked}>Connect <ArrowRight size={15} /></button><button className="button button-outline" onClick={block} disabled={blocked}>{blocked ? 'Blocked' : 'Block profile'}</button></div></div><p className="public-bio">{person.bio || 'This learner has not added a bio yet.'}</p><div className="public-profile-skills"><div><span className="mini-label">CAN TEACH</span><div className="skill-tags">{teaching.length ? teaching.map((skill) => <span className="skill-tag skill-teach" key={skill}>{skill}</span>) : <span className="muted-small">No skills listed yet</span>}</div></div><div><span className="mini-label">WANTS TO LEARN</span><div className="skill-tags">{learning.length ? learning.map((skill) => <span className="skill-tag skill-learn" key={skill}>{skill}</span>) : <span className="muted-small">No interests listed yet</span>}</div></div></div><div className="public-profile-details"><span>★ {person.averageRating ?? 'New'} rating · {person.reviewCount || 0} reviews</span>{person.phone && <span>Contact: {person.phone}</span>}{person.certifications && <span>Sample certificates: {person.certifications}</span>}</div><p className="profile-safety-note"><ShieldCheck size={15} /> Profile details and certificates are demo sample data; skill and certificate claims are not independently verified.</p></section><section className="surface-card report-profile"><h2>Report a safety concern</h2><p>If something about this profile concerns you, report it to the safety team for review.</p><ReportForm targetType="USER" targetId={Number(id)} /></section>{showConsent && <div className="modal-overlay"><section className="consent-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setShowConsent(false)} aria-label="Close"><X size={18} /></button><span className="modal-shield"><ShieldCheck size={22} /></span><span className="section-kicker">A QUICK SAFETY PAUSE</span><h2>Connect with care.</h2><p>Keep personal and financial details private. Read the Safety Center before connecting.</p><Link to="/app/safety" className="text-link">Read Safety Center <ArrowRight size={14} /></Link><label className="consent-check"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /><span>I understand that SkillBridge connects me with other users and that I should follow the platform’s safety guidelines.</span></label><button className="button button-primary button-full" disabled={!acknowledged} onClick={() => { localStorage.setItem('skillbridge.safetyAcknowledged','true'); connect(); }}>I understand — send request <ArrowRight size={14} /></button></section></div>}</div>;
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    Promise.all([api('/admin/dashboard'), api('/admin/reports')])
      .then(([stats, items]) => { setData(stats); setReports(items); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const moderate = async (id, action) => {
    try { await api(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }); load(); }
    catch (e) { setError(e.message); }
  };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">PRIVATE MODERATION WORKSPACE</span><h1>Safety administration</h1><p>Review real platform records and take auditable moderation actions.</p></div></div>{error && <div className="form-error">{error}</div>}{loading ? <LoadingCard /> : data && <><div className="admin-metrics">{[['Members', data.totalUsers], ['Active', data.activeUsers], ['Skills', data.skills], ['Requests', data.exchangeRequests], ['Sessions', data.sessions], ['Reviews', data.reviews], ['Reports', data.reports], ['Pending reports', data.pendingReports]].map(([label, value]) => <div className="stat-card" key={label}><span className="stat-title">{label}</span><strong>{value}</strong></div>)}</div><section className="surface-card admin-reports"><div className="card-heading"><div><span className="section-kicker">SAFETY INBOX</span><h2>Community reports</h2></div></div>{reports.length ? reports.map((report) => <article className="admin-report" key={report.id}><div><strong>{report.category.replaceAll('_', ' ')}</strong><p>{report.description || 'No additional description'}</p><small>Reported by {report.reporter} · {report.targetType}: {report.target} · {new Date(report.createdAt).toLocaleString()}</small></div><span className={`status-pill status-${report.status.toLowerCase()}`}>{report.status}</span>{report.status === 'PENDING' && <div className="admin-report-actions"><button className="button button-outline button-sm" onClick={() => moderate(report.id, 'DISMISS')}>Dismiss</button>{report.targetType === 'USER' && <><button className="button button-outline button-sm" onClick={() => moderate(report.id, 'RESTRICT')}>Restrict</button><button className="button button-outline button-sm" onClick={() => moderate(report.id, 'SUSPEND')}>Suspend</button></>}{['POST','COMMENT'].includes(report.targetType) && <button className="button button-outline button-sm" onClick={() => moderate(report.id, 'REMOVE_CONTENT')}>Remove content</button>}<button className="button button-primary button-sm" onClick={() => moderate(report.id, 'RESOLVE')}>Resolve</button></div>}</article>) : <EmptyInline icon={ShieldCheck} title="No reports to review" text="New community reports will appear here." action="/app/safety" actionText="Safety Center" />}</section></>}</div>;
}

export default App;
