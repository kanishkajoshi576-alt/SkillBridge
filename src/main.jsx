import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App.jsx';
import StartupSplash from './StartupSplash.jsx';
import { readLocalPreference } from './localPreferences';
import './firebase.css';
import './styles.css';
import './learn.css';
import './mobile.css';
import './interactions.css';
import './theme.css';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native-app');
  StatusBar.setOverlaysWebView({ overlay: false }).catch((error) => {
    console.error('SkillBridge could not configure the Android status bar.', error);
  });
  StatusBar.setStyle({ style: Style.Light }).catch((error) => {
    console.error('SkillBridge could not set the status bar icon color.', error);
  });
  StatusBar.setBackgroundColor({ color: '#f7f8fc' }).catch((error) => {
    console.error('SkillBridge could not set the status bar background.', error);
  });
}

if (readLocalPreference('skillbridge.reduceMotion') === 'true') {
  document.documentElement.classList.add('reduce-motion');
}

if (import.meta.env.PROD && !import.meta.env.VITE_DESKTOP_APP && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('SkillBridge could not register its offline app shell.', error);
    });
  });
}

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('SkillBridge encountered an unrecoverable screen error.', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <main className="app-error-shell">
        <div className="app-error-card">
          <span className="brand-mark">S</span>
          <h1>SkillBridge needs to refresh</h1>
          <p>We couldn’t restore this screen. Your account is saved; reload to continue.</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>Reload app</button>
        </div>
      </main>;
    }
    return this.props.children;
  }
}

function AppBootMarker() {
  React.useEffect(() => {
    document.documentElement.classList.add('app-mounted');
  }, []);
  return null;
}

function NetworkStatus() {
  const [online, setOnline] = React.useState(() => navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;
  return <div className="network-status" role="status" aria-live="polite">
    <span className="network-status-dot" />
    <span>You’re offline. Changes may not save until you reconnect.</span>
  </div>;
}

function StartupRecovery() {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!timedOut) return <div className="page-loader"><span className="loader" />Opening SkillBridge…</div>;
  return <main className="app-error-shell">
    <div className="app-error-card">
      <span className="brand-mark">S</span>
      <h1>Still loading?</h1>
      <p>Check your connection, then reload SkillBridge. Your account is saved on this device.</p>
      <button className="button button-primary" onClick={() => window.location.reload()}>Reload app</button>
    </div>
  </main>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <AppBootMarker />
      <AppErrorBoundary>
        <BrowserRouter>
          <>
            <React.Suspense fallback={<StartupRecovery />}>
              <App />
            </React.Suspense>
            <StartupSplash />
            <NetworkStatus />
          </>
        </BrowserRouter>
      </AppErrorBoundary>
    </>
  </React.StrictMode>,
);
