import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { readLocalPreference } from './localPreferences';

export default function StartupSplash() {
  const [visible, setVisible] = useState(() => readLocalPreference('skillbridge.reduceMotion') !== 'true');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const exitTimer = window.setTimeout(() => setExiting(true), 820);
    const hideTimer = window.setTimeout(() => setVisible(false), 1200);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return <div className={`startup-splash${exiting ? ' startup-splash-exit' : ''}`} role="status" aria-label="Starting SkillBridge">
    <div className="startup-splash-content">
      <span className="startup-splash-mark"><BookOpen size={31} strokeWidth={1.8} /></span>
      <span className="startup-splash-name">skillbridge<span>.</span></span>
      <span className="startup-splash-tagline">Learn better, together</span>
      <span className="startup-splash-progress" aria-hidden="true"><span /></span>
    </div>
  </div>;
}
