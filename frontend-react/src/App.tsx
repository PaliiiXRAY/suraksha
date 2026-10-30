// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — SURAKSHA root — 4 tabs wired to canonical + API-backed views
// Intelligence  → HazardIntelligence (canonical SURAKSHA branding)
// Govt Command  → CommandDashboard   (MapLibre map + block risk + situation brief)
// Responder Ops → ResponderOperations
// Citizen Svcs  → PublicServices     (real API data with offline fallback)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { DataMode } from './types';
import TopBar from './components/layout/TopBar';
import ToastContainer, { ToastMessage } from './components/ui/Toast';
import HazardIntelligence from './pages/HazardIntelligence';
import CommandDashboard from './pages/CommandDashboard';
import ResponderOperations from './pages/ResponderOperations';
import PublicServices from './pages/PublicServices';
import { checkBackendHealth } from './services/api';

type ViewId = 'intelligence' | 'command' | 'responder' | 'citizen';

export default function App() {
  const [dataMode, setDataMode] = useState<DataMode>('REPLAY');
  const [activeView, setActiveView] = useState<ViewId>('intelligence');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Probe backend once at startup; fall back to REPLAY if unreachable
  useEffect(() => {
    checkBackendHealth().then(alive => {
      if (alive) setDataMode('LIVE');
    });
  }, []);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0d14] text-white">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global TopBar Header */}
      <TopBar
        dataMode={dataMode}
        onModeChange={setDataMode}
        onViewChange={v => setActiveView(v as ViewId)}
        activeView={activeView}
        onSimulatePass={() => addToast('🛰️ Satellite pass synchronized: INSAT-3DR & Sentinel-1 SAR imagery acquired over Bay of Bengal (14 radar telemetry feeds ingested)')}
        onSyncReplay={() => addToast('Replay data pack verified and in-sync (Cyclone Fani 2019 · Odisha Coast)')}
      />

      {/* Main Tab View Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'intelligence' && (
          <HazardIntelligence onShowToast={msg => addToast(msg, 'info')} />
        )}
        {activeView === 'command' && (
          <CommandDashboard />
        )}
        {activeView === 'responder' && (
          <ResponderOperations onShowToast={msg => addToast(msg, 'info')} />
        )}
        {activeView === 'citizen' && (
          <PublicServices />
        )}
      </main>
    </div>
  );
}
