import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, ArrowLeft, ArrowRight, Ban, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, CirclePlay, Compass, ExternalLink, GraduationCap,
  Heart, Home, Languages, Lightbulb, LogOut, Menu, MessageCircle, Music2,
  Palette, Search, Send, Settings as SettingsIcon, ShieldCheck, Sparkles, Users, Video, X,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signInWithPopup,
  signOut, updateProfile,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams,
} from 'react-router-dom';
import { auth } from './firebase';
import { readLocalPreference, writeLocalPreference } from './localPreferences';
import {
  archiveConversation, blockUser, createExchangeRequest, createSession,
  createSessionCallRoom, createTeachingVerificationRequest, getProfile, getUserSettings, listArchivedConversations,
  listBlockedUsers, listConversations,
  listExchangeRequests, listLearningGoals, listProfiles, listSessions,
  listTeachingVerificationRequests, listenToMessages, markMessagesRead, profileFromUser, respondToExchangeRequest,
  restoreConversation, setReadReceiptsEnabled, unblockUser,
  saveLearningGoal, saveProfile, sendMessage, updateSessionStatus,
} from './firebaseData';

function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState('');
  const publishAuthState = useCallback((
    currentUser,
    nextProfile = currentUser ? profileFromUser(currentUser) : null,
    isProfileLoading = Boolean(currentUser),
  ) => {
    setUser(currentUser);
    setProfile(nextProfile);
    setProfileLoading(isProfileLoading);
    setFirestoreError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    let profileLoadId = 0;
    const syncUser = (currentUser) => {
      const currentLoadId = ++profileLoadId;
      if (!active) return;
      publishAuthState(currentUser);
      if (!currentUser) return;

      void (async () => {
        try {
          let nextProfile = await getProfile(currentUser.uid);
          if (!nextProfile && currentUser.providerData.some(({ providerId }) => providerId === 'google.com')) {
            nextProfile = await saveProfile(currentUser.uid, {
              name: currentUser.displayName?.trim() || currentUser.email?.split('@')[0] || 'SkillBridge learner',
              college: '',
              bio: '',
              teachingSkills: [],
              learningSkills: [],
            });
          }
          if (active && currentLoadId === profileLoadId) {
            setProfile(nextProfile || profileFromUser(currentUser));
            setProfileLoading(false);
          }
        } catch (error) {
          if (active && currentLoadId === profileLoadId) {
            setFirestoreError(error.message);
            setProfileLoading(false);
          }
        }
      })();
    };
    const unsubscribe = onAuthStateChanged(auth, syncUser, (error) => {
      if (active) {
        setFirestoreError(error.message);
        setProfileLoading(false);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [publishAuthState]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let active = true;
    let appStateListener;
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && auth.currentUser) {
        auth.currentUser.getIdToken().catch((error) => {
          console.error('SkillBridge could not refresh the signed-in session after resume.', error);
        });
      }
    }).then((listener) => {
      if (active) appStateListener = listener;
      else listener.remove();
    }).catch((error) => {
      console.error('SkillBridge could not observe Android app resume events.', error);
    });
    return () => {
      active = false;
      appStateListener?.remove();
    };
  }, []);

  const register = async (form) => {
    const result = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
    await updateProfile(result.user, { displayName: form.name.trim() });
    const nextProfile = await saveProfile(result.user.uid, {
      uid: result.user.uid,
      name: form.name,
      college: form.college,
      bio: '',
      teachingSkills: [],
      learningSkills: [],
    });
    publishAuthState(result.user, nextProfile, false);
  };

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    publishAuthState(result.user);
  };

  const loginWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const credential = result.credential;
      if (!credential?.idToken) {
        throw new Error('Google sign-in did not return an ID token. Check the Android Firebase app and Google sign-in configuration.');
      }
      const signedIn = await signInWithCredential(
        auth,
        GoogleAuthProvider.credential(credential.idToken, credential.accessToken),
      );
      publishAuthState(signedIn.user);
      return;
    }
    const signedIn = await signInWithPopup(auth, new GoogleAuthProvider());
    publishAuthState(signedIn.user);
  };

  const logout = async () => {
    await signOut(auth);
    publishAuthState(null);
    if (Capacitor.isNativePlatform()) {
      FirebaseAuthentication.signOut().catch((error) => {
        console.error('SkillBridge could not clear the native Google session.', error);
      });
    }
  };
  return children({ user, profile, loading, profileLoading, firestoreError, register, login, loginWithGoogle, logout, setProfile });
}

function Brand() {
  return <Link to="/" className="brand"><span className="brand-mark"><BookOpen size={18} /></span><span>skillbridge<span className="brand-period">.</span></span></Link>;
}

const workspaceLinks = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/learn', label: 'Study library', icon: BookOpen },
  { to: '/app/explore', label: 'Find a partner', icon: Compass },
  { to: '/app/exchanges', label: 'My exchanges', icon: Users },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/sessions', label: 'Sessions & progress', icon: GraduationCap },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
  { to: '/app/safety', label: 'Safety center', icon: ShieldCheck },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
];

function messageFor(error) {
  const messages = {
    'auth/email-already-in-use': 'There is already an account for this email. Try signing in.',
    'auth/invalid-credential': 'That email and password combination was not recognized.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your internet connection.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled for this Firebase project. Enable the Google provider in Firebase Authentication settings.',
    'auth/unauthorized-domain': 'This site is not authorized for Firebase sign-in. Add its domain in Firebase Authentication settings.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before sign-in finished.',
    'auth/account-exists-with-different-credential': 'An account with this email already uses another sign-in method. Sign in with that method instead.',
    'permission-denied': 'Firestore denied this action. Deploy the project security rules from firestore.rules in the Firebase console.',
  };
  if (Capacitor.isNativePlatform() && /default_web_client_id|google-services\.json|no matching client|developer error/i.test(error.message || '')) {
    return 'Google sign-in needs Android Firebase setup. Register com.skillbridge.app in Firebase, add this app’s signing certificate fingerprints, and include its google-services.json in the Android app before rebuilding.';
  }
  return messages[error.code] || error.message || 'Something went wrong. Please try again.';
}

function PublicNav() {
  return <header className="public-nav"><Brand /><nav className="public-links"><Link to="/#how-it-works">How it works</Link><Link to="/#why-skillbridge">Why SkillBridge</Link><Link to="/safety">Safety</Link></nav><div className="public-actions"><Link className="login-link" to="/login">Log in</Link><Link className="button button-primary button-sm" to="/register">Get started <ArrowRight size={15} /></Link></div></header>;
}

function Landing() {
  return <div className="landing">
    <PublicNav />
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" />A community built on sharing</div><h1>Know something.<br /><span>Learn something.</span><br />Pass it on.</h1><p className="hero-text">Trade what you know for what you want to learn. Meet your next learning partner — no course fees, just real people helping each other grow.</p><div className="hero-actions"><Link to="/register" className="button button-primary button-lg">Find your skill partner <ArrowRight size={17} /></Link><Link to="/register" className="button button-quiet button-lg"><GraduationCap size={17} /> Start teaching</Link></div><div className="hero-proof"><span className="proof-avatars"><i>K</i><i>A</i><i>R</i></span><span><strong>Everyone has something to teach.</strong><br />Everyone has something to learn.</span></div></div>
      <div className="hero-art" aria-label="Two learners sharing skills"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-doodle doodle-top">✳</div><div className="art-doodle doodle-bottom">✦</div><div className="skill-bubble bubble-top"><span className="bubble-emoji">⌘</span><span><strong>Python basics</strong><small>What I can teach</small></span><span className="bubble-check"><Check size={14} /></span></div><div className="people-art"><div className="person person-left"><div className="person-hair hair-left" /><div className="person-face face-left"><span className="eyes">••</span><span className="smile">⌣</span></div><div className="person-body body-left"><span className="shirt-detail">✦</span></div><span className="person-label">I can teach</span></div><div className="bridge-icon"><ArrowRight size={22} /><span>exchange</span></div><div className="person person-right"><div className="person-hair hair-right" /><div className="person-face face-right"><span className="eyes">••</span><span className="smile">⌣</span></div><div className="person-body body-right"><span className="shirt-detail">✿</span></div><span className="person-label">I want to learn</span></div></div><div className="skill-bubble bubble-bottom"><span className="bubble-emoji bubble-purple">✎</span><span><strong>UI / UX design</strong><small>What I want to learn</small></span><span className="bubble-check"><Check size={14} /></span></div></div>
    </section>
    <section className="trust-strip"><div><ShieldCheck size={18} /><span>Free peer-to-peer learning</span></div><i /><div><Users size={18} /><span>Learn and teach, together</span></div><i /><div><Heart size={18} /><span>Made for curious people</span></div></section>
    <section className="section how-section" id="how-it-works"><div className="section-heading"><span className="section-kicker">A simpler way to grow</span><h2>Learning goes both ways.</h2><p>Three little steps can open a whole new world of skills.</p></div><div className="steps-grid"><LandingStep number="01" icon={Users} title="Bring what you know" text="Add the skills you can share and the things you're excited to learn next." color="lavender" /><LandingStep number="02" icon={Compass} title="Meet your match" text="Find people whose learning goals and teaching skills fit yours." color="peach" /><LandingStep number="03" icon={Sparkles} title="Grow, together" text="Plan a session, share what you know and celebrate progress on both sides." color="mint" /></div></section>
    <section className="exchange-feature" id="why-skillbridge"><div className="exchange-copy"><span className="section-kicker">A fairer kind of learning</span><h2>Your knowledge<br />is your currency.</h2><p>No subscriptions to learn the basics. Offer what you know, find what you need, and make learning a two-way street.</p><Link to="/register" className="text-link">Start your free profile <ArrowRight size={16} /></Link></div><div className="exchange-card"><div className="exchange-card-top"><span className="exchange-icon"><Heart size={17} /></span><span className="exchange-caption">A little give & take</span><span className="free-tag">FREE</span></div><div className="exchange-person"><span className="avatar avatar-pink">A</span><div><strong>Aarav teaches</strong><small>Python fundamentals</small></div></div><div className="exchange-arrow"><span /><span className="exchange-arrows">↕</span><span /></div><div className="exchange-person"><span className="avatar avatar-gold">M</span><div><strong>Mira teaches</strong><small>UI & visual design</small></div></div><div className="exchange-card-footer"><Check size={15} /><span>Two skills shared. No money exchanged.</span></div></div></section>
    <section className="section categories-section"><div className="section-heading"><span className="section-kicker">The world's full of things to learn</span><h2>What are you curious about?</h2></div><div className="category-grid">{[[BookOpen, 'Technology', 'lavender'], [Palette, 'Design & art', 'peach'], [Languages, 'Languages', 'mint'], [Music2, 'Music', 'butter'], [Lightbulb, 'Business', 'blue'], [Sparkles, 'And so much more', 'rose']].map(([Icon, label, tone]) => <Link className="category-chip" to="/register" key={label}><span className={`category-icon ${tone}`}><Icon size={17} /></span><strong>{label}</strong><ArrowRight size={15} /></Link>)}</div></section>
    <section className="cta-section" id="safety-promise"><div className="cta-spark spark-left">✳</div><span className="section-kicker">Your next great lesson is a person away</span><h2>Come for the skills.<br />Stay for the people.</h2><p>Creating your SkillBridge profile is free. Finding your people is the fun part.</p><Link to="/register" className="button button-light button-lg">Get started for free <ArrowRight size={17} /></Link><div className="cta-spark spark-right">✦</div></section>
    <footer className="footer"><div className="footer-main"><div className="footer-about"><Brand /><p>Skill grows when it’s shared.<br />A little knowledge goes a long way.</p></div><div className="footer-col"><strong>Explore</strong><Link to="/register">Find a partner</Link><Link to="/register">Start teaching</Link><Link to="/register">Create a profile</Link></div>    <div className="footer-col"><strong>Good to know</strong><Link to="/safety">Safety Center</Link><Link to="/guidelines">Community guidelines</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><span className="coming-soon">Optional extras · coming soon</span></div><div className="footer-note"><ShieldCheck size={19} /><p>Be thoughtful with personal information. Reach out if something doesn't feel right.</p><Link to="/safety">Our safety promise <ArrowRight size={14} /></Link></div></div><div className="footer-bottom"><span>© 2026 SkillBridge · Made for learning together.</span><span>Free to learn. Free to teach.</span></div></footer>
  </div>;
}

function LandingStep({ number, icon: Icon, title, text, color }) {
  return <article className="step-card"><div className={`step-icon ${color}`}><Icon size={22} /></div><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>;
}

function PublicInfoPage({ type }) {
  const content = {
    safety: {
      eyebrow: 'A COMMUNITY BUILT ON TRUST',
      title: 'Learn together, safely.',
      intro: 'A few thoughtful habits help make every SkillBridge connection a better one.',
      sections: [
        ['Protect your account', 'Never share your password, sign-in code, or account recovery link with another member.'],
        ['Keep personal details private', 'Share only what you are comfortable making visible to signed-in learners. Keep financial information, home addresses, and sensitive documents out of your profile and messages.'],
        ['Set clear expectations', 'Agree on a learning goal, duration, and format before a session. Peer exchanges are voluntary and free; do not send money for an exchange.'],
        ['Meet thoughtfully', 'For in-person sessions, choose a public place and let someone you trust know your plans. You can always end a conversation that no longer feels right.'],
        ['Trust your instincts', 'You can decline a request or stop replying at any time. If you have a safety concern, contact the project administrator.'],
        ['Share honestly', 'Describe your experience fairly and approach teaching as peer-to-peer learning. SkillBridge does not verify claims or certify advice.'],
      ],
    },
    privacy: {
      eyebrow: 'YOUR INFORMATION',
      title: 'Privacy at SkillBridge.',
      intro: 'Here is how information is used in this version of SkillBridge.',
      sections: [
        ['Account details', 'Firebase Authentication handles sign-in credentials. Your email address is not included in your public learner profile.'],
        ['Learner profile', 'Your name, organization, bio, and teaching and learning skills are stored in Firestore and visible to signed-in members so they can discover learning partners.'],
        ['Learning activity', 'Exchange requests, accepted conversations, session proposals, and your learning goals are stored in Firestore to provide those features. Firestore security rules control access when the included rules are published to the Firebase project.'],
        ['Your choices', 'Share only information you are comfortable showing to other learners. For help with account or data removal, contact the project administrator.'],
      ],
    },
    guidelines: {
      eyebrow: 'COMMUNITY GUIDELINES',
      title: 'Make learning welcoming.',
      intro: 'SkillBridge works best when everyone can share knowledge with respect and care.',
      sections: [
        ['Be kind and respectful', 'Welcome different backgrounds and experience levels. Give feedback constructively and respect each person’s time and boundaries.'],
        ['Be honest about skills', 'Describe your experience accurately. Set clear expectations about what you can teach and what you hope to learn.'],
        ['Keep it learning-focused', 'Use messages and sessions to arrange skill exchanges. Do not send spam, harass members, or pressure anyone to continue a conversation.'],
        ['Put safety first', 'Do not share another person’s private information. End an interaction that feels uncomfortable and contact the project administrator about concerns.'],
      ],
    },
    terms: {
      eyebrow: 'COMMUNITY EXPECTATIONS',
      title: 'Using SkillBridge.',
      intro: 'SkillBridge helps people arrange voluntary, peer-to-peer learning exchanges.',
      sections: [
        ['Be respectful', 'Treat other members with respect, communicate clearly, and honor the learning plan you agree together.'],
        ['Keep exchanges free', 'Skill exchanges on this service are voluntary and free. Do not request or send payment for a peer exchange.'],
        ['Use good judgment', 'Members share their own experience. SkillBridge does not verify member qualifications or guarantee the accuracy of lessons, advice, or profile claims.'],
        ['Stay safe', 'Protect your account and personal information. Stop an interaction if it makes you uncomfortable and contact the project administrator about concerns.'],
      ],
    },
  }[type];
  return <div className="public-info-shell"><PublicNav /><main className="public-info"><Link to="/" className="text-link"><ArrowLeft size={15} /> Back to SkillBridge</Link><span className="section-kicker">{content.eyebrow}</span><h1>{content.title}</h1><p className="public-info-intro">{content.intro}</p><div className="public-info-grid">{content.sections.map(([title, text], index) => <section className="surface-card fb-safety-card" key={title}><span className={`fb-safety-number fb-safety-number-${index}`}>0{index + 1}</span><ShieldCheck size={18} /><h2>{title}</h2><p>{text}</p></section>)}</div><p className="public-info-disclaimer">These notes describe the current SkillBridge web experience and are not legal advice.</p></main><footer className="footer-bottom public-info-footer"><span>© 2026 SkillBridge · Made for learning together.</span><Link to="/register">Join SkillBridge <ArrowRight size={14} /></Link></footer></div>;
}

function AuthPage({ mode, authState }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', college: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setError('Use a password with at least 6 characters.');
      return;
    }
    if (isRegister && !form.name.trim()) {
      setError('Add your name to get started.');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) await authState.register(form);
      else await authState.login(form.email, form.password);
      navigate('/app', { replace: true });
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    setError('');
    setNotice('');
    setGoogleBusy(true);
    try {
      await authState.loginWithGoogle();
      navigate('/app', { replace: true });
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setGoogleBusy(false);
    }
  };

  return <main className="fb-auth-shell">
    <Link to="/" className="fb-auth-back"><ArrowLeft size={15} /> Back to SkillBridge</Link>
    <section className="fb-auth-card">
      <Brand />
      <span className="section-kicker">{isRegister ? 'YOUR NEXT CHAPTER STARTS HERE' : 'WELCOME BACK'}</span>
      <h1>{isRegister ? 'Create your account' : 'Good to see you again'}</h1>
      <p>{isRegister ? 'Set up your free account and tell the community a little about yourself.' : 'Sign in to pick up where your curiosity left off.'}</p>
      <form className="fb-form" onSubmit={submit}>
        {isRegister && <>
          <label>Your name<input autoComplete="name" maxLength="80" placeholder="e.g. Alex Morgan" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>College or organization <span className="optional">(optional)</span><input maxLength="120" placeholder="Where you study or work" value={form.college} onChange={(event) => setForm({ ...form, college: event.target.value })} /></label>
        </>}
        <label>Email address<input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength="6" maxLength="72" placeholder={isRegister ? 'At least 6 characters' : 'Your password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        {!isRegister && <Link className="fb-forgot-link" to="/forgot-password">Forgot your password?</Link>}
        {(error || authState.firestoreError) && <div className="form-error" role="alert">{error || `Could not read your profile from Firestore. ${messageFor({ message: authState.firestoreError })}`}</div>}
        {notice && <div className="inline-notice" role="status">{notice}</div>}
        <button className="button button-primary button-full button-lg" disabled={busy || googleBusy}>{busy ? 'Just a moment…' : isRegister ? <>Create my free account <ArrowRight size={16} /></> : <>Sign in <ArrowRight size={16} /></>}</button>
      </form>
      <div className="fb-auth-divider"><span>or</span></div>
      <button className="fb-google-button" type="button" onClick={continueWithGoogle} disabled={busy || googleBusy}>
        <GoogleMark />
        {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
      </button>
      <div className="fb-auth-switch">{isRegister ? 'Already a member?' : 'New to SkillBridge?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></div>
    </section>
  </main>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="fb-google-mark"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.73 5.99c4.51-4.16 7.11-10.29 7.11-17.7Z" /><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-5.99c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" /></svg>;
}

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage('If an account exists for this address, Firebase has sent a password reset link.');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };
  return <main className="fb-auth-shell"><Link to="/login" className="fb-auth-back"><ArrowLeft size={15} /> Back to sign in</Link><section className="fb-auth-card"><Brand /><span className="section-kicker">ACCOUNT RECOVERY</span><h1>Reset your password</h1><p>We’ll email you a secure link to choose a new password.</p><form className="fb-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="inline-notice" role="status">{message}</div>}<button className="button button-primary button-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'} <ArrowRight size={15} /></button></form></section></main>;
}

function Workspace({ authState }) {
  const { user } = authState;
  const profile = authState.profile || profileFromUser(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [logoutError, setLogoutError] = useState('');
  const [logoutBusy, setLogoutBusy] = useState(false);
  useEffect(() => { setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    listExchangeRequests(user.uid)
      .then((items) => setPendingCount(items.filter((item) => item.toId === user.uid && item.status === 'pending').length))
      .catch(() => setPendingCount(0));
  }, [location.pathname, user.uid]);
  const logout = async () => {
    setLogoutError('');
    setLogoutBusy(true);
    try { await authState.logout(); }
    catch (error) {
      setLogoutError(messageFor(error));
      setLogoutBusy(false);
      return;
    }
    navigate('/login', { replace: true });
  };
  const title = workspaceLinks.find((item) => item.to === location.pathname)?.label
    || (location.pathname.startsWith('/app/people/') ? 'Learner profile' : 'Your learning space');
  return <div className="app-frame fb-app-frame">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Brand /><button className="icon-button mobile-only" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={19} /></button></div>
      <div className="nav-caption">YOUR SPACE</div>
      <nav className="side-nav">{workspaceLinks.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Study library' && <span className="new-pill">FREE</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="free-card"><div className="free-card-icon"><Heart size={16} /></div><strong>Learning is better shared.</strong><p>Your peer-to-peer skill exchanges are always free.</p><Link to="/app/safety">Read our safety guide <ArrowRight size={13} /></Link></div>
        <button className="profile-mini" onClick={() => navigate('/app/profile')}>
          <span className="avatar">{(profile?.name || user?.email || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
          <span className="profile-mini-copy"><strong>{profile?.name || 'Your profile'}</strong><small>My profile</small></span><ChevronDown size={15} />
        </button>
        {logoutError && <div className="form-error" role="alert">{logoutError}</div>}
        <button className="logout-button" onClick={logout} disabled={logoutBusy}><LogOut size={15} /> {logoutBusy ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </aside>
    {mobileMenu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <div className="workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-trigger" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={20} /></button><button className="back-button" onClick={() => location.key === 'default' ? navigate('/app') : navigate(-1)}><ArrowLeft size={16} /><span>Back</span></button><span className="topbar-divider" /><span className="breadcrumb">{title}</span></div><div className="topbar-actions"><Link to="/app/explore" className="topbar-search"><Search size={16} /><span>Find a skill or person</span><kbd>⌘ K</kbd></Link><Link to="/app/exchanges" className="topbar-bell" aria-label={`${pendingCount} pending exchange requests`}><Bell size={18} />{pendingCount > 0 && <span className="fb-notification-count">{pendingCount}</span>}</Link><Link to="/app/profile" aria-label="Open my profile"><span className="avatar avatar-small">{(profile?.name || user?.email || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span></Link></div></header>
      <main className="main-area">
        {authState.firestoreError && <div className="form-error fb-global-error" role="alert">Firestore access failed: {messageFor({ message: authState.firestoreError })}</div>}
        <Routes>
          <Route path="/app" element={<Dashboard authState={authState} />} />
          <Route path="/app/learn" element={<StudyLibrary authState={authState} />} />
          <Route path="/app/explore" element={<Explore authState={authState} />} />
          <Route path="/app/exchanges" element={<Requests authState={authState} />} />
          <Route path="/app/requests" element={<Requests authState={authState} />} />
          <Route path="/app/calendar" element={<SessionsPage authState={authState} mode="calendar" />} />
          <Route path="/app/sessions" element={<SessionsPage authState={authState} mode="sessions" />} />
          <Route path="/app/messages" element={<Messages authState={authState} />} />
          <Route path="/app/profile" element={authState.profileLoading || authState.firestoreError
            ? <ProfileLoadState error={authState.firestoreError} />
            : <ProfileEditor authState={authState} />} />
          <Route path="/app/settings" element={<SettingsPage authState={authState} />} />
          <Route path="/app/people/:uid" element={<PersonProfile authState={authState} />} />
          <Route path="/app/safety" element={<SafetyCenter />} />
          <Route path="/app/notifications" element={<Navigate to="/app/exchanges" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{[
        ...workspaceLinks.filter((item) => ['/app', '/app/explore', '/app/exchanges', '/app/messages', '/app/settings'].includes(item.to)),
        { to: '/app/profile', label: 'Profile', icon: GraduationCap },
      ].map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-nav-item ${isActive ? 'mobile-nav-active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>
    </div>
  </div>;
}

function Dashboard({ authState }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const profile = authState.profile;
  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [people, requests, conversations, goals, sessions] = await Promise.all([
        listProfiles(),
        listExchangeRequests(authState.user.uid),
        listConversations(authState.user.uid),
        listLearningGoals(authState.user.uid),
        listSessions(authState.user.uid),
      ]);
      setData({ people, requests, conversations, goals, sessions });
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [authState.user.uid]);
  const teaching = profile?.teachingSkills || [];
  const learning = profile?.learningSkills || [];
  const profileCompletion = [
    Boolean(profile?.name),
    Boolean(profile?.college),
    Boolean(profile?.bio),
    teaching.length > 0,
    learning.length > 0,
  ].filter(Boolean).length * 20;
  const pendingRequests = data?.requests.filter((item) => item.toId === authState.user.uid && item.status === 'pending') || [];
  const activeExchanges = data?.requests.filter((item) => item.status === 'accepted') || [];
  const upcomingSessions = data?.sessions.filter((item) => item.status === 'accepted' && item.date >= new Date().toISOString().slice(0, 10)).slice(0, 3) || [];
  const suggested = data?.people
    .filter((person) => person.uid !== authState.user.uid)
    .map((person) => ({ ...person, ...matchScore(profile, person) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2) || [];
  return <div className="content-page">
    <div className="welcome-row">
      <div><span className="section-kicker">YOUR LEARNING SPACE</span><h1>Welcome back, {profile?.name?.split(' ')[0] || 'learner'} <span className="wave">✦</span></h1><p>Pick up where you left off, discover a learning partner, or plan your next session.</p></div>
      <Link to="/app/profile" className="button button-outline">{profileCompletion === 100 ? 'Edit your profile' : 'Complete your profile'} <ArrowRight size={15} /></Link>
    </div>
    {error && <div className="form-error" role="alert">{error} <button type="button" className="text-link" onClick={load}>Try again</button></div>}
    {loading && !data ? <div className="page-loader"><span className="loader" />Loading your learning activity…</div> : data && <>
      {profileCompletion < 100 && <section className="surface-card fb-profile-progress"><div><span className="section-kicker">YOUR PROFILE</span><strong>{profileCompletion}% complete</strong><small>More details help learners find the right exchange with you.</small></div><div className="progress-track" role="progressbar" aria-label="Profile completeness" aria-valuemin="0" aria-valuemax="100" aria-valuenow={profileCompletion}><span style={{ width: `${profileCompletion}%` }} /></div><Link className="text-link" to="/app/profile">Finish profile <ArrowRight size={14} /></Link></section>}
      <div className="stat-grid">
        {[
          ['Teaching', teaching.length, 'skills to share', 'teaching'],
          ['Learning', learning.length, 'skills to explore', 'learning'],
          ['Exchanges', activeExchanges.length, 'active together', 'exchange'],
          ['Sessions', data.sessions.filter((item) => item.status === 'completed').length, 'completed sessions', 'session'],
          ['On your calendar', upcomingSessions.length, 'planned sessions', 'learning'],
        ].map(([label, count, detail, kind]) => <div className="stat-card" key={label}><span className={`stat-mark ${kind}`}>{kind === 'teaching' ? '↗' : kind === 'learning' ? '✦' : kind === 'exchange' ? '↔' : '✓'}</span><span className="stat-title">{label}</span><strong>{count}</strong><small>{detail}</small></div>)}
      </div>
      <div className="dashboard-skill-grid">
        <section className="surface-card dashboard-skill-card"><div className="card-heading"><div><span className="section-kicker">WHAT YOU CAN SHARE</span><h2>Skills I teach</h2></div><Link to="/app/profile" className="text-link">Edit <ArrowRight size={14} /></Link></div><div className="dashboard-skill-list">{teaching.length ? teaching.map((skill) => <span className="dashboard-skill-tag" key={skill}>{skill}</span>) : <span className="dashboard-skill-empty">Add a skill you can teach to find a learning partner.</span>}</div></section>
        <section className="surface-card dashboard-skill-card"><div className="card-heading"><div><span className="section-kicker">WHAT YOU WANT TO GROW</span><h2>Skills I’m learning</h2></div><Link to="/app/profile" className="text-link">Edit <ArrowRight size={14} /></Link></div><div className="dashboard-skill-list">{learning.length ? learning.map((skill) => <span className="dashboard-skill-tag learning" key={skill}>{skill}</span>) : <span className="dashboard-skill-empty">Choose a skill you want to learn and track your progress.</span>}</div></section>
      </div>
      <section className="surface-card learning-path-section"><div className="card-heading"><div><span className="section-kicker">YOUR LEARNING PATHS</span><h2>Continue learning</h2></div><Link to="/app/sessions" className="text-link">Manage progress <ArrowRight size={14} /></Link></div>{data.goals.length ? <div className="learning-path-grid">{data.goals.slice(0, 3).map((goal) => <article className="learning-path-card" key={goal.id}><div className="learning-path-icon"><GraduationCap size={19} /></div><div className="learning-path-copy"><strong>{goal.skillName}</strong><small>{goal.currentTopic || 'Your personal learning path'}</small><div className="progress-track" role="progressbar" aria-label={`${goal.skillName} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={goal.progressPercentage}><span style={{ width: `${goal.progressPercentage}%` }} /></div><small>{goal.progressPercentage}% complete</small></div><Link to="/app/sessions" className="button button-outline button-sm">Continue</Link></article>)}</div> : <div className="dashboard-empty-inline"><BookOpen size={19} /><span><strong>Start your first learning path</strong><small>Choose a skill to learn and track your progress as you grow.</small></span><Link className="text-link" to="/app/learn">Explore lessons <ArrowRight size={14} /></Link></div>}</section>
      <div className="dashboard-grid">
        <section className="surface-card getting-started"><div className="card-heading"><div><span className="section-kicker">A SIMPLE PLACE TO START</span><h2>Your next steps</h2></div><span className="quiet-badge"><Sparkles size={13} /> Start here</span></div><div className="checklist"><DashboardStep done={Boolean(teaching.length)} number="01" title="Tell us what you know" text="Add a skill you’d love to teach." to="/app/profile" /><DashboardStep done={Boolean(learning.length)} number="02" title="Pick something to learn" text="Your interests help find a great fit." to="/app/profile" /><DashboardStep done={suggested.some((person) => person.score > 0)} number="03" title="Find your learning people" text="Explore partners who complement you." to="/app/explore" /></div><Link to="/app/profile" className="text-link">Set up your profile <ArrowRight size={15} /></Link></section>
        <section className="surface-card dashboard-shortcuts"><div className="card-heading"><div><span className="section-kicker">A LITTLE HELP GOES A LONG WAY</span><h2>What’s on your mind?</h2></div></div><Link to="/app/explore" className="shortcut-row"><span className="shortcut-icon shortcut-lavender"><Compass size={18} /></span><span><strong>Find a skill partner</strong><small>Trade knowledge, not money</small></span><ArrowRight size={16} /></Link><Link to="/app/learn" className="shortcut-row"><span className="shortcut-icon shortcut-mint"><BookOpen size={18} /></span><span><strong>Study with free videos</strong><small>Explore lessons and track your progress</small></span><ArrowRight size={16} /></Link><Link to="/app/calendar" className="shortcut-row"><span className="shortcut-icon shortcut-peach"><CalendarDays size={18} /></span><span><strong>Plan a learning session</strong><small>Make time for a skill exchange</small></span><ArrowRight size={16} /></Link><Link to="/app/messages" className="shortcut-row"><span className="shortcut-icon shortcut-mint"><MessageCircle size={18} /></span><span><strong>Continue a conversation</strong><small>Keep your exchange moving</small></span><ArrowRight size={16} /></Link></section>
      </div>
      {pendingRequests.length > 0 && <section className="inline-notice fb-request-reminder"><Bell size={16} /><span>You have {pendingRequests.length} exchange request{pendingRequests.length === 1 ? '' : 's'} waiting.</span><Link to="/app/exchanges" className="text-link">Review <ArrowRight size={14} /></Link></section>}
      {upcomingSessions.length > 0 && <section className="surface-card fb-upcoming"><div className="card-heading"><div><span className="section-kicker">COMING UP</span><h2>Your next learning sessions</h2></div><Link to="/app/calendar" className="text-link">Open calendar <ArrowRight size={14} /></Link></div>{upcomingSessions.map((session) => <SessionSummary key={session.id} session={session} user={authState.user} people={data.people} />)}</section>}
      {suggested.length > 0 && <section className="fb-suggested-section"><div className="card-heading"><div><span className="section-kicker">GOOD THINGS GROW WHEN SHARED</span><h2>People you might learn with</h2></div><Link to="/app/explore" className="text-link">See everyone <ArrowRight size={14} /></Link></div><div className="match-grid">{suggested.map((person) => <PersonCard key={person.uid} person={person} currentProfile={profile} relationship={relationshipFor(data.requests, authState.user.uid, person.uid)} busy={false} onRequest={() => navigate('/app/explore')} />)}</div></section>}
    </>}
  </div>;
}

function DashboardStep({ done, number, title, text, to }) {
  return <Link to={to} className="fb-dashboard-step"><span className={`fb-step-check ${done ? 'fb-step-done' : ''}`}>{done ? <Check size={13} /> : number}</span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15} /></Link>;
}

function matchScore(profile, candidate) {
  const normalize = (skills) => listSkills(skills).map((skill) => skill.toLowerCase());
  const teach = new Set(normalize(profile?.teachingSkills));
  const learn = new Set(normalize(profile?.learningSkills));
  const teachMatch = normalize(candidate.teachingSkills).some((skill) => learn.has(skill));
  const learnMatch = normalize(candidate.learningSkills).some((skill) => teach.has(skill));
  return { teachMatch, learnMatch, score: Number(teachMatch) + Number(learnMatch) };
}

function listSkills(skills) {
  return (Array.isArray(skills) ? skills : []).filter((skill) => typeof skill === 'string');
}

function relationshipFor(requests, currentUid, otherUid) {
  const pair = requests.filter((item) => (item.fromId === otherUid && item.toId === currentUid)
    || (item.toId === otherUid && item.fromId === currentUid));
  if (pair.some((item) => item.status === 'accepted')) return 'accepted';
  if (pair.some((item) => item.toId === currentUid && item.status === 'pending')) return 'incoming';
  if (pair.some((item) => item.fromId === currentUid && item.status === 'pending')) return 'outgoing';
  return '';
}

function Explore({ authState }) {
  const [people, setPeople] = useState([]);
  const [relationships, setRelationships] = useState({});
  const [search, setSearch] = useState('');
  const [teachFilter, setTeachFilter] = useState('');
  const [learnFilter, setLearnFilter] = useState('');
  const [sort, setSort] = useState('match');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([listProfiles(), listExchangeRequests(authState.user.uid)])
      .then(([profiles, requests]) => {
        if (!active) return;
        setPeople(profiles);
        setRelationships(Object.fromEntries(profiles.map((person) => [person.uid, relationshipFor(requests, authState.user.uid, person.uid)])));
      })
      .catch((reason) => { if (active) setError(messageFor(reason)); });
    return () => { active = false; };
  }, [authState.user.uid]);
  const matches = useMemo(() => people
    .filter((person) => person.uid !== authState.user.uid)
    .map((person) => ({ ...person, ...matchScore(authState.profile, person) }))
    .filter((person) => !search.trim() || `${person.name} ${person.college} ${person.bio} ${listSkills(person.teachingSkills).join(' ')} ${listSkills(person.learningSkills).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((person) => !teachFilter.trim() || listSkills(person.teachingSkills).some((skill) => skill.toLowerCase().includes(teachFilter.trim().toLowerCase())))
    .filter((person) => !learnFilter.trim() || listSkills(person.learningSkills).some((skill) => skill.toLowerCase().includes(learnFilter.trim().toLowerCase())))
    .sort((a, b) => sort === 'name' ? (a.name || '').localeCompare(b.name || '') : b.score - a.score), [people, authState.profile, authState.user.uid, search, teachFilter, learnFilter, sort]);
  const request = async (person) => {
    setBusyId(person.uid);
    setError('');
    setNotice('');
    try {
      await createExchangeRequest(authState.profile, person, `Hi ${person.name}, I'd love to connect and exchange skills with you.`);
      setRelationships((current) => ({ ...current, [person.uid]: 'outgoing' }));
      setNotice(`Your request to ${person.name} has been sent.`);
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusyId('');
    }
  };
  const clearFilters = () => { setSearch(''); setTeachFilter(''); setLearnFilter(''); setSort('match'); };
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">FIND YOUR PEOPLE</span><h1>Meet your next learning partner.</h1><p>Great learning is a two-way street. Let’s find the other half.</p></div><span className="free-tag free-tag-large"><Heart size={13} /> ALWAYS FREE</span></div>
    <form className="search-panel" onSubmit={(event) => event.preventDefault()}><div className="search-input-wrap"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try “Python”, “drawing” or a name" aria-label="Search skills and partners" /><button type="submit" className="button button-primary button-sm">Search</button></div><div className="filter-row"><label>Can teach<input value={teachFilter} onChange={(event) => setTeachFilter(event.target.value)} placeholder="Teaching skill" /></label><label>Want to learn<input value={learnFilter} onChange={(event) => setLearnFilter(event.target.value)} placeholder="Learning skill" /></label><label className="match-sort">Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="match">Best match</option><option value="name">Name</option></select></label><button type="button" className="button button-outline button-sm" onClick={clearFilters}>Clear filters</button></div></form>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status"><Check size={16} /> {notice}</div>}
    {matches.length ? <><p className="muted-small" aria-live="polite">Showing {matches.length} learning partner{matches.length === 1 ? '' : 's'}, ranked by skill match</p><div className="match-grid">{matches.map((person) => <PersonCard key={person.uid} person={person} currentProfile={authState.profile} profileReady={!authState.profileLoading && !authState.firestoreError} relationship={relationships[person.uid]} busy={busyId === person.uid} onRequest={() => request(person)} />)}</div></> : !error && <div className="surface-card no-matches"><span className="empty-icon"><Users size={20} /></span><h3>No partners to show just yet</h3><p>Try a different search or add a few teaching and learning interests to your profile.</p><Link to="/app/profile" className="button button-primary">Add my skills <ArrowRight size={15} /></Link></div>}
  </div>;
}

function PersonCard({ person, currentProfile, profileReady = true, relationship = '', busy, onRequest }) {
  const score = matchScore(currentProfile, person);
  const teachingSkills = listSkills(person.teachingSkills);
  const learningSkills = listSkills(person.learningSkills);
  return <article className="match-card">
    <div className="match-card-top"><span className="avatar match-avatar">{(person.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span className="match-percent">{score.score === 2 ? 'Great fit' : score.score === 1 ? 'Good fit' : 'Meet a learner'}</span></div>
    <h3>{person.name || 'SkillBridge learner'}</h3>
    <span className="muted-small">{person.college || 'Community member'}</span>
    <p className="match-bio">{person.bio || 'Ready to learn, teach and share skills.'}</p>
    <div className="match-skill-section"><span className="mini-label">CAN TEACH</span><div className="skill-tags">{teachingSkills.length ? teachingSkills.map((skill) => <span className="skill-tag skill-teach" key={skill}>{skill}</span>) : <span className="muted-small">No teaching skills yet</span>}</div></div>
    <div className="match-skill-section"><span className="mini-label">WANTS TO LEARN</span><div className="skill-tags">{learningSkills.length ? learningSkills.map((skill) => <span className="skill-tag skill-learn" key={skill}>{skill}</span>) : <span className="muted-small">No learning interests yet</span>}</div></div>
    <div className="fb-person-actions"><Link className="button button-outline button-sm" to={`/app/people/${person.uid}`}>View profile</Link>{relationship === 'accepted' ? <Link className="button button-primary button-sm" to="/app/messages">Message <MessageCircle size={13} /></Link> : relationship === 'incoming' ? <Link className="button button-primary button-sm" to="/app/exchanges">Review request <ArrowRight size={13} /></Link> : <button className="button button-primary button-sm" onClick={onRequest} disabled={!profileReady || busy || relationship === 'outgoing'}>{!profileReady ? 'Loading profile…' : busy ? 'Sending…' : relationship === 'outgoing' ? 'Request sent' : 'Connect'} {profileReady && !relationship && <ArrowRight size={13} />}</button>}</div>
  </article>;
}

function Requests({ authState }) {
  const [requests, setRequests] = useState([]);
  const [people, setPeople] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = async () => {
    const [items, profiles] = await Promise.all([listExchangeRequests(authState.user.uid), listProfiles()]);
    setRequests(items);
    setPeople(Object.fromEntries(profiles.map((item) => [item.uid, item])));
  };
  useEffect(() => {
    load().catch((reason) => setError(messageFor(reason)));
  }, [authState.user.uid]);
  const respond = async (request, status) => {
    setBusyId(request.id);
    setError('');
    setNotice('');
    try {
      await respondToExchangeRequest(request, status);
      await load();
      setNotice(status === 'accepted' ? 'Exchange accepted. Your conversation is ready.' : 'Request declined.');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusyId('');
    }
  };
  const incoming = requests.filter((item) => item.toId === authState.user.uid);
  const outgoing = requests.filter((item) => item.fromId === authState.user.uid);
  return <div className="fb-page"><span className="section-kicker">MAKE THE FIRST CONNECTION</span><h1>Exchange requests.</h1><p className="fb-page-subtitle">A good exchange starts with a simple hello.</p>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status">{notice}</div>}<RequestGroup title="For you" items={incoming} people={people} incoming busyId={busyId} onRespond={respond} /><RequestGroup title="Sent by you" items={outgoing} people={people} busyId={busyId} onRespond={respond} /></div>;
}

function RequestGroup({ title, items, people, incoming = false, busyId, onRespond }) {
  return <section className="fb-request-section"><h2>{title}</h2>{!items.length && <div className="fb-empty fb-empty-small">No requests here yet.</div>}{items.map((item) => {
    const otherId = incoming ? item.fromId : item.toId;
    const person = people[otherId] || {};
    return <article className="fb-request-card" key={item.id}><div className="fb-person-avatar">{(person.name || '?').slice(0, 1).toUpperCase()}</div><div className="fb-request-copy"><strong>{person.name || 'SkillBridge learner'} <small>{person.college || 'Community member'}</small></strong><p>{item.message || 'I would love to connect and exchange skills.'}</p><span className={`fb-status fb-status-${item.status}`}>{item.status}</span></div>{incoming && item.status === 'pending' && <div className="fb-request-actions"><button className="button button-outline button-sm" onClick={() => onRespond(item, 'rejected')} disabled={busyId === item.id}>Decline</button><button className="button button-primary button-sm" onClick={() => onRespond(item, 'accepted')} disabled={busyId === item.id}>{busyId === item.id ? 'Saving…' : 'Accept'} <Check size={13} /></button></div>}</article>;
  })}</section>;
}

const studyTopics = [
  { name: 'Python', category: 'Technology', description: 'Start with the basics, then practice with small projects.' },
  { name: 'UI Design', category: 'Design', description: 'Explore layout, color, typography, and interface patterns.' },
  { name: 'Excel', category: 'Business', description: 'Learn formulas, useful shortcuts, and spreadsheet cleanup.' },
  { name: 'UX Research', category: 'Design', description: 'Practice interviews, research plans, and synthesis.' },
  { name: 'Public speaking', category: 'Communication', description: 'Build confidence with practical speaking exercises.' },
  { name: 'Digital illustration', category: 'Creative', description: 'Find drawing fundamentals and guided practice sessions.' },
];

function StudyLibrary({ authState }) {
  const [query, setQuery] = useState('');
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ skillName: '', currentTopic: '', progressPercentage: '0' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    setError('');
    try { setGoals(await listLearningGoals(authState.user.uid)); }
    catch (reason) { setError(messageFor(reason)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [authState.user.uid]);
  const videoUrl = (skill) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill.trim()} beginner tutorial free lesson`)}`;
  const findVideos = (event) => {
    event.preventDefault();
    if (query.trim()) window.open(videoUrl(query), '_blank', 'noopener,noreferrer');
  };
  const saveGoal = async (event) => {
    event.preventDefault();
    const skillName = form.skillName.trim();
    if (!skillName) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const current = goals.find((goal) => goal.skillName.toLowerCase() === skillName.toLowerCase());
      await saveLearningGoal(authState.user.uid, {
        ...form,
        id: current?.id,
        skillName,
        progressPercentage: Math.max(0, Math.min(100, Number(form.progressPercentage))),
      });
      setNotice(`${skillName} learning path saved.`);
      await load();
    } catch (reason) {
      setError(messageFor(reason));
    } finally { setSaving(false); }
  };
  const advanceGoal = async (goal) => {
    setSavingGoalId(goal.id);
    setError('');
    try {
      await saveLearningGoal(authState.user.uid, { ...goal, progressPercentage: Math.min(100, Number(goal.progressPercentage) + 10) });
      await load();
      setNotice(`${goal.skillName} progress updated.`);
    } catch (reason) { setError(messageFor(reason)); }
    finally { setSavingGoalId(''); }
  };
  return <div className="content-page learn-library">
    <section className="learn-hero"><span className="section-kicker">YOUR FREE STUDY SPACE</span><h1>Learn a little every day.</h1><p>Find free video lessons, learn with your community, and keep track of your progress — all in one place.</p><form className="learn-search" onSubmit={findVideos}><Search size={19} /><label className="visually-hidden" htmlFor="fb-learn-search">Search for a skill or video topic</label><input id="fb-learn-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like to learn?" required maxLength={100} /><button className="button button-primary" type="submit"><CirclePlay size={16} /> Find free videos</button></form><small>Opens YouTube results in a new tab. Review each creator's video details and terms.</small></section>
    <section className="learn-section"><div className="learn-section-heading"><div><span className="section-kicker">PICK A PLACE TO BEGIN</span><h2>Popular learning paths</h2></div><span className="quiet-badge"><BookOpen size={14} /> Free to explore</span></div><div className="study-topic-grid">{studyTopics.map((topic) => <article className="study-topic-card" key={topic.name}><span className="study-topic-icon"><GraduationCap size={19} /></span><small>{topic.category}</small><h3>{topic.name}</h3><p>{topic.description}</p><button className="text-link fb-topic-action" onClick={() => { setForm((current) => ({ ...current, skillName: topic.name })); window.open(videoUrl(topic.name), '_blank', 'noopener,noreferrer'); }} type="button">Find free videos <ExternalLink size={14} /></button></article>)}</div><p className="video-disclaimer">Videos are provided by independent creators on YouTube. SkillBridge does not host, endorse, or verify individual videos; availability and terms can change.</p></section>
    <section className="learn-section learn-progress-section"><div className="learn-section-heading"><div><span className="section-kicker">YOUR PACE, YOUR PROGRESS</span><h2>Keep your learning on track</h2></div><Link to="/app/sessions" className="text-link">Sessions & progress <ArrowRight size={14} /></Link></div><div className="study-progress-layout">
      <form className="surface-card study-progress-form" onSubmit={saveGoal}><h3>Update a learning path</h3><label>Skill<input value={form.skillName} onChange={(event) => setForm({ ...form, skillName: event.target.value })} placeholder="e.g. Python" required maxLength={100} /></label><label>What are you studying?<input value={form.currentTopic} onChange={(event) => setForm({ ...form, currentTopic: event.target.value })} placeholder="e.g. Functions and loops" maxLength={120} /></label><label>Progress<input type="number" min="0" max="100" step="1" value={form.progressPercentage} onChange={(event) => setForm({ ...form, progressPercentage: event.target.value })} required /></label>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status"><Check size={15} /> {notice}</div>}<button className="button button-primary button-sm" disabled={saving}>{saving ? 'Saving…' : 'Save learning progress'}</button></form>
      <div className="surface-card study-progress-list"><h3>Your learning paths</h3>{loading ? <p className="muted-small">Loading your progress…</p> : goals.length ? goals.map((goal) => <article className="study-progress-item" key={goal.id}><div><strong>{goal.skillName}</strong><span>{goal.currentTopic || 'Ready for your next topic'}</span></div><span className="study-progress-value">{goal.progressPercentage}%</span><div className="progress-track" role="progressbar" aria-label={`${goal.skillName} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={goal.progressPercentage}><span style={{ width: `${goal.progressPercentage}%` }} /></div><button className="text-link fb-progress-action" type="button" disabled={savingGoalId === goal.id || Number(goal.progressPercentage) >= 100} onClick={() => advanceGoal(goal)}>{Number(goal.progressPercentage) >= 100 ? 'Completed' : savingGoalId === goal.id ? 'Saving…' : '+ Add 10%'}</button></article>) : <div className="study-empty"><BookOpen size={20} /><p>Your learning paths will appear here after you save your first skill.</p></div>}</div>
    </div></section>
  </div>;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

let jitsiScriptPromise;

function loadJitsiApi() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (!jitsiScriptPromise) {
    jitsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        jitsiScriptPromise = null;
        script.remove();
        reject(new Error('Could not load Jitsi. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return jitsiScriptPromise;
}

function JitsiCall({ session, displayName, onClose }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [browserError, setBrowserError] = useState('');
  const [browserOpening, setBrowserOpening] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const roomUrl = `https://meet.jit.si/${encodeURIComponent(session.callRoom)}`;

  useEffect(() => {
    let active = true;
    let api;
    setLoading(true);
    setError('');
    loadJitsiApi().then(() => {
      if (!active || !mountRef.current) return;
      api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: session.callRoom,
        parentNode: mountRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        onload: () => {
          if (active) setLoading(false);
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
        },
      });
      api.addEventListener('videoConferenceJoined', () => {
        if (active) setLoading(false);
      });
      api.addEventListener('readyToClose', onClose);
    }).catch((reason) => {
      if (active) {
        setError(messageFor(reason));
        setLoading(false);
      }
    });
    return () => {
      active = false;
      api?.dispose();
    };
  }, [session.callRoom, displayName, attempt, onClose]);

  const openInBrowser = async () => {
    setBrowserError('');
    setBrowserOpening(true);
    try {
      await Browser.open({ url: roomUrl });
      onClose();
    } catch (reason) {
      setBrowserError(messageFor(reason));
      setBrowserOpening(false);
    }
  };

  return <div className="fb-call-overlay" role="dialog" aria-modal="true" aria-label={`Call for ${session.title}`}>
    <section className="fb-call-window">
      <header className="fb-call-heading">
        <div><span className="section-kicker">SKILLBRIDGE SESSION</span><h2>{session.title}</h2><p>{session.skillName} · {session.date} · {session.startTime}</p></div>
        <button type="button" className="icon-button" aria-label="Leave call" onClick={onClose}><X size={20} /></button>
      </header>
      {loading && !error && <div className="fb-call-loading"><span className="loader" />Connecting to the call…</div>}
      {error ? <div className="fb-call-error" role="alert"><p>{error}</p><button type="button" className="button button-outline button-sm" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : <div className="fb-jitsi-frame" ref={mountRef} />}
      <footer className="fb-call-footer">
        <p className="fb-call-privacy">Calls start muted. If Jitsi requires moderator sign-in, open this room in your browser and keep that browser call open. Anyone with the room link may be able to join, so share it privately.</p>
        <div className="fb-call-browser-action">
          {Capacitor.isNativePlatform()
            ? <button type="button" className="button button-outline button-sm" onClick={openInBrowser} disabled={browserOpening}>
              <ExternalLink size={14} /> {browserOpening ? 'Opening browser…' : 'Open in browser'}
            </button>
            : <a className="button button-outline button-sm" href={roomUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Open in browser
            </a>}
          <small>Use this if sign-in is blocked inside the app.</small>
        </div>
        {browserError && <div className="form-error fb-call-browser-error" role="alert">{browserError}</div>}
      </footer>
    </section>
  </div>;
}

function SessionsPage({ authState, mode }) {
  const isCalendar = mode === 'calendar';
  const [sessions, setSessions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState({});
  const [form, setForm] = useState({ conversationId: '', title: '', skillName: '', date: '', startTime: '', endTime: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [callBusyId, setCallBusyId] = useState('');
  const [callSession, setCallSession] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const load = async () => {
    setError('');
    try {
      const [sessionItems, connections, profiles] = await Promise.all([
        listSessions(authState.user.uid),
        listConversations(authState.user.uid),
        listProfiles(),
      ]);
      setSessions(sessionItems);
      setConversations(connections);
      setPeople(Object.fromEntries(profiles.map((person) => [person.uid, person])));
    } catch (reason) { setError(messageFor(reason)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [authState.user.uid]);
  const schedule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const connection = conversations.find((item) => item.id === form.conversationId);
    if (!connection) {
      setError('Choose an accepted exchange before scheduling a session.');
      setSaving(false);
      return;
    }
    if (form.date < dateKey(new Date()) || form.endTime <= form.startTime) {
      setError('Choose a future date and an end time after the start time.');
      setSaving(false);
      return;
    }
    try {
      await createSession(connection, authState.user, form);
      setForm({ conversationId: '', title: '', skillName: '', date: '', startTime: '', endTime: '' });
      setNotice('Your session proposal was sent to your learning partner.');
      await load();
    } catch (reason) { setError(messageFor(reason)); }
    finally { setSaving(false); }
  };
  const changeStatus = async (session, status) => {
    setError('');
    setNotice('');
    try {
      await updateSessionStatus(session.id, status);
      setNotice(status === 'accepted' ? 'Session confirmed.' : status === 'rejected' ? 'Session proposal declined.' : status === 'completed' ? 'Session marked complete.' : 'Session cancelled.');
      await load();
    } catch (reason) { setError(messageFor(reason)); }
  };
  const openCall = async (session) => {
    if (session.status !== 'accepted') return;
    setCallBusyId(session.id);
    setError('');
    try {
      const callRoom = session.callRoom || await createSessionCallRoom(session.id);
      setSessions((current) => current.map((item) => item.id === session.id ? { ...item, callRoom } : item));
      setCallSession({ ...session, callRoom });
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setCallBusyId('');
    }
  };
  const closeCall = useCallback(() => setCallSession(null), []);
  const today = dateKey(new Date());
  const futureSessions = sessions.filter((session) => session.date >= today && ['pending', 'accepted'].includes(session.status));
  const sortedSessions = [...sessions].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const leadingDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const monthName = visibleMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const activeForDate = sessions.filter((session) => session.date === selectedDate && session.status !== 'cancelled' && session.status !== 'rejected');
  const moveMonth = (delta) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  return <>
  <div className="content-page">
    <div className="page-intro"><div><span className="section-kicker">{isCalendar ? 'MAKE TIME TO LEARN' : 'SMALL STEPS, BIG GROWTH'}</span><h1>{isCalendar ? 'Your learning calendar' : 'Sessions & progress'}</h1><p>{isCalendar ? 'See what is coming up and make time for your next exchange.' : 'Make a little room for learning — then notice how far you have come.'}</p></div><span className="quiet-badge"><Heart size={13} /> Learning is free</span></div>
    {error && <div className="form-error" role="alert">{error} <button type="button" className="text-link" onClick={load}>Try again</button></div>}
    {notice && <div className="inline-notice" role="status"><Check size={15} /> {notice}</div>}
    {loading ? <div className="page-loader"><span className="loader" />Loading your sessions…</div> : isCalendar ? <section className="surface-card fb-calendar">
      <div className="calendar-heading"><button className="icon-button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><h2>{monthName}</h2><button className="icon-button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div>
      <div className="calendar-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <strong className="calendar-weekday" key={day}>{day}</strong>)}{Array.from({ length: leadingDays }, (_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const dayDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1); const key = dateKey(dayDate); const count = sessions.filter((session) => session.date === key && !['cancelled', 'rejected'].includes(session.status)).length; return <button className={`calendar-day ${selectedDate === key ? 'calendar-day-selected' : ''}`} key={key} onClick={() => setSelectedDate(key)}><span className="calendar-day-number">{index + 1}</span>{count > 0 && <span className="calendar-day-count">{count} session{count > 1 ? 's' : ''}</span>}</button>; })}</div>
      <div className="calendar-agenda"><div className="card-heading"><div><span className="section-kicker">YOUR DAY</span><h2>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div><Link to="/app/sessions" className="text-link">Schedule a session <ArrowRight size={14} /></Link></div>{activeForDate.length ? activeForDate.map((session) => <SessionSummary key={session.id} session={session} user={authState.user} people={Object.values(people)} onCall={openCall} callBusy={callBusyId === session.id} />) : <div className="fb-agenda-empty">Nothing planned for this day yet. A little time set aside can make a big difference.</div>}</div>
    </section> : <>
      <section className="surface-card session-section"><div className="card-heading"><div><span className="section-kicker">LEARN TOGETHER</span><h2>Schedule a session</h2></div><span className="quiet-badge"><CalendarDays size={13} /> {conversations.length} connection{conversations.length === 1 ? '' : 's'}</span></div>{conversations.length ? <form className="inline-form fb-session-form" onSubmit={schedule}>
        <label>Learning partner<select required value={form.conversationId} onChange={(event) => setForm({ ...form, conversationId: event.target.value })}><option value="">Choose an accepted exchange</option>{conversations.map((conversation) => { const partnerId = conversation.participants.find((uid) => uid !== authState.user.uid); return <option key={conversation.id} value={conversation.id}>{people[partnerId]?.name || 'SkillBridge learner'}</option>; })}</select></label>
        <label>Session title<input required maxLength="120" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. A friendly Python practice" /></label>
        <label>Skill<input required maxLength="100" value={form.skillName} onChange={(event) => setForm({ ...form, skillName: event.target.value })} placeholder="What will you work on?" /></label>
        <label>Date<input required type="date" min={today} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Starts<input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
        <label>Ends<input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
        <button className="button button-primary button-sm" disabled={saving}>{saving ? 'Sending…' : 'Propose session'} <ArrowRight size={14} /></button>
      </form> : <div className="fb-no-connections"><MessageCircle size={18} /><span>Accept an exchange request first; you can then schedule a session with your learning partner.</span><Link className="button button-outline button-sm" to="/app/explore">Find a partner <ArrowRight size={13} /></Link></div>}</section>
      <section className="surface-card session-section"><div className="card-heading"><div><span className="section-kicker">KEEP YOUR MOMENTUM</span><h2>Your sessions</h2></div><span className="quiet-badge">{futureSessions.length} upcoming</span></div>{sortedSessions.length ? sortedSessions.map((session) => <SessionRow key={session.id} session={session} user={authState.user} people={people} onStatus={changeStatus} onCall={openCall} callBusy={callBusyId === session.id} />) : <div className="fb-agenda-empty">No sessions yet. Once you have an accepted exchange, suggest a time to learn together.</div>}</section>
      <section className="surface-card fb-session-tip"><Sparkles size={17} /><span><strong>Small, focused sessions work well.</strong><small>Pick one skill, agree on a clear goal, and use your conversation to coordinate the details. Calls open in Jitsi with microphone and camera muted; meet.jit.si may require the first participant to sign in as a moderator.</small></span></section>
    </>}
  </div>
  {callSession && <JitsiCall session={callSession} displayName={authState.profile?.name || authState.user.email || 'SkillBridge learner'} onClose={closeCall} />}
  </>;
}

function SessionSummary({ session, user, people, onCall, callBusy }) {
  const partnerId = session.participants?.find((uid) => uid !== user.uid);
  const partner = Array.isArray(people) ? people.find((person) => person.uid === partnerId) : people[partnerId];
  return <div className="session-row fb-session-summary"><span className="session-date"><strong>{new Date(`${session.date}T00:00:00`).getDate()}</strong><small>{new Date(`${session.date}T00:00:00`).toLocaleString(undefined, { month: 'short' })}</small></span><span className="fb-session-details"><strong>{session.title}</strong><small>{session.skillName} · {session.startTime}–{session.endTime} · with {partner?.name || 'your learning partner'}</small></span><span className={`status-pill fb-session-status-${session.status}`}>{session.status}</span>{session.status === 'accepted' && <button className="button button-primary button-sm" onClick={() => onCall(session)} disabled={callBusy}>{callBusy ? 'Opening…' : session.callRoom ? 'Join call' : 'Create call'} <Video size={14} /></button>}</div>;
}

function SessionRow({ session, user, people, onStatus, onCall, callBusy }) {
  const partnerId = session.participants.find((uid) => uid !== user.uid);
  const partner = people[partnerId];
  const proposalFromMe = session.createdBy === user.uid;
  const end = new Date(`${session.date}T${session.endTime}:00`);
  const past = end < new Date();
  return <div className="session-row fb-session-summary"><span className="session-date"><strong>{new Date(`${session.date}T00:00:00`).getDate()}</strong><small>{new Date(`${session.date}T00:00:00`).toLocaleString(undefined, { month: 'short' })}</small></span><span className="fb-session-details"><strong>{session.title}</strong><small>{session.skillName} · {session.startTime}–{session.endTime} · with {partner?.name || 'your learning partner'}</small></span><span className={`status-pill fb-session-status-${session.status}`}>{session.status}</span>{session.status === 'pending' && !proposalFromMe && <button className="button button-primary button-sm" onClick={() => onStatus(session, 'accepted')}>Accept</button>}{session.status === 'pending' && !proposalFromMe && <button className="button button-outline button-sm" onClick={() => onStatus(session, 'rejected')}>Decline</button>}{session.status === 'pending' && proposalFromMe && <small>Waiting for confirmation</small>}{['pending', 'accepted'].includes(session.status) && proposalFromMe && <button className="button button-outline button-sm" onClick={() => onStatus(session, 'cancelled')}>Cancel</button>}{session.status === 'accepted' && <button className="button button-primary button-sm" onClick={() => onCall(session)} disabled={callBusy}>{callBusy ? 'Opening…' : session.callRoom ? 'Join call' : 'Create call'} <Video size={14} /></button>}{session.status === 'accepted' && past && <button className="button button-outline button-sm" onClick={() => onStatus(session, 'completed')}>Mark complete</button>}</div>;
}

function SafetyCenter() {
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">A COMMUNITY BUILT ON TRUST</span><h1>Learn together, safely.</h1><p>A few thoughtful habits help make every SkillBridge connection a better one.</p></div><span className="free-tag free-tag-large"><ShieldCheck size={13} /> YOUR SAFETY MATTERS</span></div><div className="fb-safety-grid">
    {[['Protect your account', 'Never share your password, sign-in code, or account recovery link with another member.'], ['Keep personal details private', 'Share only what you are comfortable making visible to signed-in learners. Keep financial information, home addresses, and sensitive documents out of your profile and messages.'], ['Set clear expectations', 'Agree on a learning goal, duration, and format before a session. Peer exchanges are voluntary and free; do not send money for an exchange.'], ['Meet thoughtfully', 'For in-person sessions, choose a public place and let someone you trust know your plans. You can always end a conversation that no longer feels right.'], ['Trust your instincts', 'You can decline a request or stop replying at any time. If you have a safety concern, contact the project administrator.'], ['Share honestly', 'Describe your experience fairly and approach teaching as peer-to-peer learning. SkillBridge does not verify claims or certify advice.']].map(([title, text], index) => <section className="surface-card fb-safety-card" key={title}><span className={`fb-safety-number fb-safety-number-${index}`}>0{index + 1}</span><ShieldCheck size={18} /><h2>{title}</h2><p>{text}</p></section>)}
  </div><section className="inline-notice fb-safety-note"><Heart size={15} /> A respectful learning community starts with all of us.</section></div>;
}

function Messages({ authState }) {
  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState({});
  const [blockedIds, setBlockedIds] = useState([]);
  const [readReceiptsEnabled, setReadReceiptsEnabledState] = useState(true);
  const [readReceiptsLoaded, setReadReceiptsLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationBusy, setConversationBusy] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      listConversations(authState.user.uid),
      listProfiles(),
      getUserSettings(authState.user.uid),
      listBlockedUsers(authState.user.uid),
      listArchivedConversations(authState.user.uid),
    ]).then(([items, profiles, preferences, blocked, archived]) => {
      if (!active) return;
      const visibleItems = items.filter((item) => {
        const otherUid = item.participants.find((uid) => uid !== authState.user.uid);
        return !blocked.includes(otherUid) && !archived.includes(item.id);
      });
      setConversations(visibleItems);
      setPeople(Object.fromEntries(profiles.map((item) => [item.uid, item])));
      setBlockedIds(blocked);
      setReadReceiptsEnabledState(preferences.readReceiptsEnabled);
      setReadReceiptsLoaded(true);
      setSelectedId((current) => visibleItems.some((item) => item.id === current) ? current : visibleItems[0]?.id || '');
    }).catch((reason) => { if (active) setError(messageFor(reason)); });
    return () => { active = false; };
  }, [authState.user.uid]);
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMessagesLoading(false);
      return undefined;
    }
    setError('');
    setMessages([]);
    setMessagesLoading(true);
    return listenToMessages(selectedId, (items) => {
      setMessages(items);
      setMessagesLoading(false);
      if (readReceiptsLoaded && readReceiptsEnabled) {
        markMessagesRead(selectedId, authState.user.uid, items)
          .catch((reason) => setError(messageFor(reason)));
      }
    }, (reason) => {
      setMessagesLoading(false);
      setError(messageFor(reason));
    });
  }, [selectedId, authState.user.uid, readReceiptsEnabled, readReceiptsLoaded]);
  const manageConversation = async (action) => {
    if (!selectedId || !partnerId || conversationBusy) return;
    setConversationBusy(true);
    setError('');
    try {
      if (action === 'block') {
        await blockUser(authState.user.uid, partnerId);
        setBlockedIds((current) => [...current, partnerId]);
        const remaining = conversations.filter((item) => item.id !== selectedId);
        setConversations(remaining);
        setSelectedId(remaining[0]?.id || '');
      } else {
        await archiveConversation(authState.user.uid, selectedId);
        const remaining = conversations.filter((item) => item.id !== selectedId);
        setConversations(remaining);
        setSelectedId(remaining[0]?.id || '');
      }
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setConversationBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedId || busy) return;
    setBusy(true);
    setError('');
    try {
      await sendMessage(selectedId, authState.user.uid, draft);
      setDraft('');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };

  const selected = conversations.find((item) => item.id === selectedId);
  const partnerId = selected?.participants?.find((id) => id !== authState.user.uid);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return <div className="fb-page">
    <span className="section-kicker">KEEP LEARNING TOGETHER</span>
    <h1>Messages.</h1>
    <p className="fb-page-subtitle">Conversations with people who are ready to share what they know.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    <section className="fb-messenger">
      <aside className="fb-thread-list">
        <h2>Your conversations</h2>
        {conversations.map((item) => {
          const otherId = item.participants.find((id) => id !== authState.user.uid);
          const person = people[otherId] || {};
          return <button className={`fb-thread ${item.id === selectedId ? 'fb-thread-selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}>
            <span className="fb-person-avatar">{(person.name || '?').slice(0, 1).toUpperCase()}</span>
            <span><strong>{person.name || 'SkillBridge learner'}</strong><small>{item.lastMessage || 'Your exchange is ready — say hello!'}</small></span>
          </button>;
        })}
        {!conversations.length && <p className="fb-thread-empty">No active chats. Restore archived conversations in Settings or accept an exchange request to start a chat.</p>}
      </aside>
      <div className="fb-chat">
        <header>
          {selected ? <>
            <div className="fb-person-avatar">{(people[partnerId]?.name || '?').slice(0, 1).toUpperCase()}</div>
            <div><strong>{people[partnerId]?.name || 'SkillBridge learner'}</strong><small>Skill exchange conversation</small></div>
          </> : <strong>Choose a conversation</strong>}
          {selected && <div className="fb-chat-actions">
            <button type="button" className="icon-button" aria-label="Archive conversation" title="Archive conversation" disabled={conversationBusy} onClick={() => manageConversation('archive')}><Archive size={16} /></button>
            <button type="button" className="icon-button fb-chat-block" aria-label={`Block ${people[partnerId]?.name || 'learner'}`} title="Block learner" disabled={conversationBusy || blockedIds.includes(partnerId)} onClick={() => manageConversation('block')}><Ban size={16} /></button>
          </div>}
        </header>
        <div className="fb-chat-messages" aria-live="polite">
          {messagesLoading ? <div className="fb-chat-loading"><span className="loader" />Loading messages…</div> : <>
            {messages.map((item) => {
              const own = item.fromId === authState.user.uid;
              const read = own && item.readBy?.includes(partnerId);
              return <div key={item.id} className={`fb-message ${own ? 'fb-message-own' : ''}`}>
                <span>{own ? 'You' : people[item.fromId]?.name || 'Learner'}</span>
                <p>{item.text}</p>
                {own && <small className={`fb-message-receipt ${read ? 'fb-message-read' : ''}`}>{read ? <><Check size={12} /> Read</> : 'Sent'}</small>}
              </div>;
            })}
            {selected && !messages.length && <div className="fb-chat-empty">Your conversation is ready. Send a friendly hello to get started.</div>}
          </>}
          <div ref={messagesEnd} />
        </div>
        <form className="fb-chat-form" onSubmit={submit}>
          <input maxLength="2000" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!selected} placeholder={selected ? 'Write a message…' : 'Accept an exchange request to start chatting'} />
          <button className="button button-primary button-sm" disabled={!selected || blockedIds.includes(partnerId) || !draft.trim() || busy}>{busy ? 'Sending…' : 'Send'} <Send size={14} /></button>
        </form>
      </div>
    </section>
  </div>;
}

function SettingsPage({ authState }) {
  const [reduceMotion, setReduceMotion] = useState(() => readLocalPreference('skillbridge.reduceMotion') === 'true');
  const [readReceiptsEnabled, setReadReceipts] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [archivedIds, setArchivedIds] = useState([]);
  const [people, setPeople] = useState({});
  const [conversations, setConversations] = useState([]);
  const [chatError, setChatError] = useState('');
  const [chatBusy, setChatBusy] = useState('');
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    writeLocalPreference('skillbridge.reduceMotion', String(reduceMotion));
  }, [reduceMotion]);
  useEffect(() => {
    let active = true;
    Promise.all([
      getUserSettings(authState.user.uid),
      listBlockedUsers(authState.user.uid),
      listArchivedConversations(authState.user.uid),
      listProfiles(),
      listConversations(authState.user.uid),
    ]).then(([preferences, blocked, archived, profiles, items]) => {
      if (!active) return;
      setReadReceipts(preferences.readReceiptsEnabled);
      setBlockedUsers(blocked);
      setArchivedIds(archived);
      setPeople(Object.fromEntries(profiles.map((person) => [person.uid, person])));
      setConversations(items);
    }).catch((reason) => {
      if (active) setChatError(messageFor(reason));
    });
    return () => { active = false; };
  }, [authState.user.uid]);
  const provider = authState.user.providerData.some(({ providerId }) => providerId === 'google.com')
    ? 'Google'
    : 'Email and password';
  const updateReceipts = async (enabled) => {
    setChatBusy('receipts');
    setChatError('');
    try {
      await setReadReceiptsEnabled(authState.user.uid, enabled);
      setReadReceipts(enabled);
    } catch (reason) {
      setChatError(messageFor(reason));
    } finally {
      setChatBusy('');
    }
  };
  const updateBlocked = async (uid) => {
    setChatBusy(uid);
    setChatError('');
    try {
      await unblockUser(authState.user.uid, uid);
      setBlockedUsers((current) => current.filter((blockedUid) => blockedUid !== uid));
    } catch (reason) {
      setChatError(messageFor(reason));
    } finally {
      setChatBusy('');
    }
  };
  const updateArchived = async (conversationId) => {
    setChatBusy(conversationId);
    setChatError('');
    try {
      await restoreConversation(authState.user.uid, conversationId);
      setArchivedIds((current) => current.filter((id) => id !== conversationId));
    } catch (reason) {
      setChatError(messageFor(reason));
    } finally {
      setChatBusy('');
    }
  };
  return <div className="fb-page fb-settings-page">
    <span className="section-kicker">MAKE IT YOURS</span>
    <h1>Settings.</h1>
    <p className="fb-page-subtitle">A few controls for a more comfortable learning space.</p>
    <section className="fb-settings-card">
      <div className="fb-settings-heading"><span className="fb-settings-icon"><SettingsIcon size={18} /></span><div><h2>Accessibility</h2><p>Choose motion that feels comfortable for you.</p></div></div>
      <label className="fb-setting-row">
        <span><strong>Reduce animations</strong><small>Turn off decorative movement and transitions across the app.</small></span>
        <input type="checkbox" role="switch" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} />
      </label>
    </section>
    <section className="fb-settings-card">
      <div className="fb-settings-heading"><span className="fb-settings-icon"><MessageCircle size={18} /></span><div><h2>Chat privacy</h2><p>Control read status and manage conversations.</p></div></div>
      <label className="fb-setting-row">
        <span><strong>Read receipts</strong><small>{readReceiptsEnabled === null ? 'Loading your preference…' : readReceiptsEnabled ? 'When you open a chat, its other participant can see Read.' : 'Other participants will only see Sent for your messages.'}</small></span>
        <input type="checkbox" role="switch" checked={readReceiptsEnabled === true} disabled={readReceiptsEnabled === null || chatBusy === 'receipts'} onChange={(event) => updateReceipts(event.target.checked)} />
      </label>
      {chatError && <div className="form-error" role="alert">{chatError}</div>}
      <div className="fb-chat-setting-list">
        <h3>Blocked learners</h3>
        {blockedUsers.length ? blockedUsers.map((uid) => <div className="fb-chat-setting-item" key={uid}><span>{people[uid]?.name || 'SkillBridge learner'}</span><button className="button button-outline button-sm" disabled={chatBusy === uid} onClick={() => updateBlocked(uid)}>{chatBusy === uid ? 'Unblocking…' : 'Unblock'}</button></div>) : <p>No blocked learners.</p>}
      </div>
      <div className="fb-chat-setting-list">
        <h3>Archived conversations</h3>
        {archivedIds.length ? archivedIds.map((id) => {
          const conversation = conversations.find((item) => item.id === id);
          const partnerId = conversation?.participants?.find((uid) => uid !== authState.user.uid);
          return <div className="fb-chat-setting-item" key={id}><span>{people[partnerId]?.name || 'SkillBridge learner'}</span><button className="button button-outline button-sm" disabled={chatBusy === id} onClick={() => updateArchived(id)}>{chatBusy === id ? 'Restoring…' : 'Restore'}</button></div>;
        }) : <p>No archived conversations.</p>}
      </div>
    </section>
    <section className="fb-settings-card">
      <div className="fb-settings-heading"><span className="fb-settings-icon fb-settings-account"><Users size={18} /></span><div><h2>Account</h2><p>Your sign-in details for this device.</p></div></div>
      <div className="fb-setting-detail"><span>Email</span><strong>{authState.user.email || 'Not provided'}</strong></div>
      <div className="fb-setting-detail"><span>Signed in with</span><strong>{provider}</strong></div>
      <Link to="/app/profile" className="button button-outline fb-settings-profile">Edit your profile <ArrowRight size={14} /></Link>
    </section>
  </div>;
}

function ProfileEditor({ authState }) {
  const initial = authState.profile || {};
  const [form, setForm] = useState({
    name: initial.name || '',
    college: initial.college || '',
    bio: initial.bio || '',
    teachingSkills: (Array.isArray(initial.teachingSkills) ? initial.teachingSkills : []).filter((skill) => typeof skill === 'string').join(', '),
    learningSkills: (Array.isArray(initial.learningSkills) ? initial.learningSkills : []).filter((skill) => typeof skill === 'string').join(', '),
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [verificationForm, setVerificationForm] = useState({ skill: '', qualifications: '', evidenceLink: '' });
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [verificationError, setVerificationError] = useState('');
  const [verificationNotice, setVerificationNotice] = useState('');
  const [verificationBusy, setVerificationBusy] = useState(false);
  useEffect(() => {
    let active = true;
    listTeachingVerificationRequests(authState.user.uid).then((requests) => {
      if (active) setVerificationRequests(requests);
    }).catch((reason) => {
      if (active) setVerificationError(messageFor(reason));
    });
    return () => { active = false; };
  }, [authState.user.uid]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submitVerification = async (event) => {
    event.preventDefault();
    setVerificationError('');
    setVerificationNotice('');
    const skill = verificationForm.skill.trim();
    const evidenceLink = verificationForm.evidenceLink.trim();
    if (evidenceLink) {
      try {
        if (new URL(evidenceLink).protocol !== 'https:') throw new Error('Use a secure https:// evidence link.');
      } catch {
        setVerificationError('Enter a valid secure https:// link to your qualification evidence.');
        return;
      }
    }
    const alreadyPending = verificationRequests.some((request) => (
      request.skill.toLocaleLowerCase() === skill.toLocaleLowerCase() && request.status === 'pending'
    ));
    if (alreadyPending) {
      setVerificationError('You already have a pending request for this skill.');
      return;
    }
    setVerificationBusy(true);
    try {
      await createTeachingVerificationRequest(authState.user.uid, verificationForm);
      setVerificationForm({ skill: '', qualifications: '', evidenceLink: '' });
      setVerificationRequests(await listTeachingVerificationRequests(authState.user.uid));
      setVerificationNotice('Your verification request was saved as pending.');
    } catch (reason) {
      setVerificationError(messageFor(reason));
    } finally {
      setVerificationBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const skills = (value) => [...new Set(value.split(',').map((skill) => skill.trim()).filter(Boolean))].slice(0, 20);
    try {
      const profile = await saveProfile(authState.user.uid, {
        ...form,
        teachingSkills: skills(form.teachingSkills),
        learningSkills: skills(form.learningSkills),
      });
      authState.setProfile(profile);
      setNotice('Your profile is saved and visible to signed-in learners.');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };
  return <div className="fb-page"><span className="section-kicker">THE HUMAN BEHIND THE SKILLS</span><h1>Your profile.</h1><p className="fb-page-subtitle">Share what you can teach and what you would like to learn. Your email stays in Firebase Authentication and is not published on your profile.</p><form className="fb-profile-form" onSubmit={submit}><div className="fb-profile-account"><span className="fb-person-avatar">{(form.name || '?').slice(0, 1).toUpperCase()}</span><div><strong>{form.name || 'Your name'}</strong><small>{authState.user.email}</small></div></div><div className="fb-profile-fields"><label>Your name<input maxLength="80" value={form.name} onChange={update('name')} required /></label><label>College or organization <span className="optional">(optional)</span><input maxLength="120" value={form.college} onChange={update('college')} /></label><label className="fb-field-full">A little about you<textarea rows="4" maxLength="500" value={form.bio} onChange={update('bio')} placeholder="What are you curious about? How do you like to learn?" /></label><label className="fb-field-full">Skills I can teach <span className="optional">Self-reported · separate with commas</span><input value={form.teachingSkills} onChange={update('teachingSkills')} placeholder="e.g. Python, creative writing" /></label><label className="fb-field-full">Skills I’d like to learn <span className="optional">Separate with commas</span><input value={form.learningSkills} onChange={update('learningSkills')} placeholder="e.g. UI design, Spanish" /></label></div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status"><Check size={15} /> {notice}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save my profile'} <ArrowRight size={15} /></button></form>
    <section className="fb-profile-form fb-verification-form">
      <div className="fb-settings-heading"><span className="fb-settings-icon"><ShieldCheck size={18} /></span><div><h2>Request teaching verification</h2><p>Share relevant experience and a secure link to supporting evidence.</p></div></div>
      <form className="fb-profile-fields" onSubmit={submitVerification}>
        <label className="fb-field-full">Skill to verify<input required maxLength={100} value={verificationForm.skill} onChange={(event) => setVerificationForm({ ...verificationForm, skill: event.target.value })} placeholder="e.g. Python" /></label>
        <label className="fb-field-full">Qualifications and teaching experience<textarea required rows="4" maxLength={2000} value={verificationForm.qualifications} onChange={(event) => setVerificationForm({ ...verificationForm, qualifications: event.target.value })} placeholder="Describe relevant study, work, certifications, projects, or teaching experience." /></label>
        <label className="fb-field-full">Evidence link <span className="optional">(optional · https:// only)</span><input type="url" maxLength={2048} value={verificationForm.evidenceLink} onChange={(event) => setVerificationForm({ ...verificationForm, evidenceLink: event.target.value })} placeholder="https://…" /></label>
        {verificationError && <div className="form-error fb-field-full" role="alert">{verificationError}</div>}
        {verificationNotice && <div className="inline-notice fb-field-full" role="status"><Check size={15} /> {verificationNotice}</div>}
        <div className="fb-field-full"><button className="button button-primary" disabled={verificationBusy}>{verificationBusy ? 'Submitting…' : 'Submit for review'} <ArrowRight size={15} /></button></div>
      </form>
      <p className="fb-verification-notice">Requests are private to you and saved as pending. The admin review panel is not configured yet, so no skill will be marked verified until that is set up. Share only evidence links you are comfortable providing to a reviewer.</p>
      {verificationRequests.length > 0 && <div className="fb-verification-list"><h3>Your requests</h3>{verificationRequests.map((request) => <article className="fb-verification-item" key={request.id}><div><strong>{request.skill}</strong><small>{request.qualifications}</small>{request.evidenceLink && <a href={request.evidenceLink} target="_blank" rel="noreferrer">Open evidence link <ExternalLink size={12} /></a>}</div><span className={`fb-status fb-status-${request.status}`}>{request.status}</span></article>)}</div>}
    </section>
  </div>;
}

function ProfileLoadState({ error }) {
  return <div className="fb-page">
    <span className="section-kicker">THE HUMAN BEHIND THE SKILLS</span>
    <h1>Your profile.</h1>
    {error ? <section className="fb-profile-form">
      <div className="form-error" role="alert">Your saved profile could not be loaded. {messageFor({ message: error })}</div>
      <button className="button button-primary" onClick={() => window.location.reload()}>Retry loading profile</button>
    </section> : <div className="fb-profile-form fb-profile-loading" role="status"><span className="loader" /> Loading your saved profile…</div>}
  </div>;
}

function PersonProfile({ authState }) {
  const { uid } = useParams();
  const [person, setPerson] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getProfile(uid).then(setPerson).catch((reason) => setError(messageFor(reason)));
  }, [uid]);
  const request = async () => {
    setBusy(true);
    setError('');
    try {
      await createExchangeRequest(authState.profile, person, `Hi ${person.name}, I'd love to connect and exchange skills with you.`);
      setMessage('Your exchange request has been sent.');
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };
  if (error) return <div className="fb-page"><div className="form-error" role="alert">{error}</div></div>;
  if (!person) return <div className="page-loader"><span className="loader" />Loading profile…</div>;
  const teachingSkills = (person.teachingSkills || []).filter((skill) => typeof skill === 'string');
  const learningSkills = (person.learningSkills || []).filter((skill) => typeof skill === 'string');
  return <div className="fb-page"><Link to="/app/explore" className="fb-auth-back"><ArrowLeft size={15} /> Back to learners</Link><section className="fb-person-detail"><div className="fb-person-avatar fb-person-avatar-large">{(person.name || '?').slice(0, 1).toUpperCase()}</div><span className="section-kicker">SKILLBRIDGE LEARNER</span><h1>{person.name}</h1><p className="fb-page-subtitle">{person.college || 'Community member'}</p><p>{person.bio || 'Ready to learn something new and share what they know.'}</p><div className="fb-skill-columns"><div><strong>Can teach</strong><div>{teachingSkills.map((skill) => <span className="fb-skill-tag" key={skill}>{skill}</span>)}</div></div><div><strong>Wants to learn</strong><div>{learningSkills.map((skill) => <span className="fb-skill-tag fb-skill-learn" key={skill}>{skill}</span>)}</div></div></div>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="inline-notice" role="status">{message}</div>}<button className="button button-primary" onClick={request} disabled={busy || authState.profileLoading || authState.firestoreError || person.uid === authState.user.uid}>{busy ? 'Sending…' : 'Request a skill exchange'} <ArrowRight size={15} /></button></section></div>;
}

function StartupLoading({ message }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!timedOut) return <div className="page-loader"><span className="loader" />{message}</div>;
  return <main className="app-error-shell">
    <div className="app-error-card">
      <span className="brand-mark"><BookOpen size={20} /></span>
      <h1>SkillBridge is taking longer than expected</h1>
      <p>Your sign-in is saved. Check your connection, then reload to try restoring your learning space again.</p>
      <button className="button button-primary" onClick={() => window.location.reload()}>Reload app</button>
    </div>
  </main>;
}

export default function FirebaseExperience() {
  return <FirebaseAuthProvider>{(authState) => {
    if (authState.loading) return <StartupLoading message="Getting your learning space ready…" />;
    const privatePath = window.location.pathname.startsWith('/app');
    if (privatePath && !authState.user) return <Navigate to="/login" replace />;
    if (privatePath && authState.user && !authState.profile && !authState.firestoreError) return <StartupLoading message="Loading your profile…" />;
    if (privatePath) return <Workspace authState={authState} />;
    if (authState.user) return <Navigate to="/app" replace />;
    return <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" authState={authState} />} />
      <Route path="/register" element={<AuthPage mode="register" authState={authState} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/safety" element={<PublicInfoPage type="safety" />} />
      <Route path="/guidelines" element={<PublicInfoPage type="guidelines" />} />
      <Route path="/privacy" element={<PublicInfoPage type="privacy" />} />
      <Route path="/terms" element={<PublicInfoPage type="terms" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
  }}</FirebaseAuthProvider>;
}
