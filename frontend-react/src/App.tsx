// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — SURAKSHA Global Shell adhering to FireSense Layout Rhythm
// Centered max-w-7xl canvas, dual-theme support, and seamless portal navigation.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { DataMode, AuthUser } from './types';
import AuthPortal from './pages/AuthPortal';
import TopBar from './components/layout/TopBar';
import ToastContainer, { ToastMessage } from './components/ui/Toast';
import HazardIntelligence from './pages/HazardIntelligence';
import GovernmentCommand from './pages/GovernmentCommand';
import ResponderOperations from './pages/ResponderOperations';
import CitizenServices from './pages/CitizenServices';

type ViewId = 'intelligence' | 'command' | 'responder' | 'citizen';
export type ThemeMode = 'dark' | 'light';

export default function App() {
  const [dataMode, setDataMode] = useState<DataMode>('REPLAY');
  const [activeView, setActiveView] = useState<ViewId>('intelligence');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('suraksha_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('fs-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light'; // Default to FireSense's signature clean light theme
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
    try {
      localStorage.setItem('fs-theme', theme);
    } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  function addToast(message: string, type: 'success' | 'warning' | 'info' = 'success') {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  function handleSignOut() {
    setUser(null);
    try {
      localStorage.removeItem('suraksha_auth_user');
    } catch {}
    addToast('Signed out of operational session', 'info');
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#f4f7fb] dark:bg-[#0c1017] text-slate-900 dark:text-white transition-colors">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AuthPortal
          onLoginSuccess={(authUser, targetView) => {
            setUser(authUser);
            setActiveView(targetView as ViewId);
            try {
              localStorage.setItem('suraksha_auth_user', JSON.stringify(authUser));
            } catch {}
          }}
          onPublicBypass={() => {
            const guestUser: AuthUser = {
              id: 'usr_guest_public',
              email: 'citizen@suraksha.public',
              full_name: 'Civilian (Public Access)',
              role: 'civilian',
              org: 'Public Resilience Portal',
            };
            setUser(guestUser);
            setActiveView('citizen');
            addToast('Public access granted: Citizen Safety Portal', 'info');
          }}
          onShowToast={(msg, type = 'info') => addToast(msg, type)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f1f5f9] dark:bg-[#0a0d14] text-slate-900 dark:text-white transition-colors">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global TopBar Header */}
      <TopBar
        dataMode={dataMode}
        onModeChange={setDataMode}
        onViewChange={v => setActiveView(v as ViewId)}
        activeView={activeView}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onSignOut={handleSignOut}
        onSimulatePass={() =>
          addToast('🛰️ Satellite pass simulated: Synthetic telemetry ingested across Bay of Bengal & Odisha basin')
        }
        onSyncReplay={() => addToast('Replay data pack verified and in-sync (Cyclone Fani 2019 · Odisha Coast)')}
      />

      {/* Centered Main Tab View Container matching FireSense */}
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-6 py-6">
        {activeView === 'intelligence' && (
          <HazardIntelligence onShowToast={msg => addToast(msg, 'info')} />
        )}
        {activeView === 'command' && (
          <GovernmentCommand onShowToast={msg => addToast(msg, 'success')} />
        )}
        {activeView === 'responder' && (
          <ResponderOperations onShowToast={msg => addToast(msg, 'info')} />
        )}
        {activeView === 'citizen' && (
          <CitizenServices onShowToast={msg => addToast(msg, 'warning')} />
        )}
      </main>

      {/* Subtle FireSense-style Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0e14] py-3.5 px-6 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-t border-slate-300 dark:border-white/10">
        <div>SURAKSHA • Multi-Hazard Geospatial Intelligence Platform</div>
        <div>All Dispatches: SIMULATED • Replay Mode Active</div>
      </footer>
    </div>
  );
}
