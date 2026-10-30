// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — root application connecting all 4 tabs matching video exactly
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { DataMode } from './types';
import TopBar from './components/layout/TopBar';
import ToastContainer, { ToastMessage } from './components/ui/Toast';
import HazardIntelligence from './pages/HazardIntelligence';
import GovernmentCommand from './pages/GovernmentCommand';
import ResponderOperations from './pages/ResponderOperations';
import CitizenServices from './pages/CitizenServices';

type ViewId = 'intelligence' | 'command' | 'responder' | 'citizen';

export default function App() {
  const [dataMode, setDataMode] = useState<DataMode>('REPLAY');
  const [activeView, setActiveView] = useState<ViewId>('intelligence');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
        onSyncReplay={() => addToast('Replay data pack verified and in-sync (Cyclone Fani 2019)')}
      />

      {/* Main Tab View Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
    </div>
  );
}
