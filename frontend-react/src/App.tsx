// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — root component with routing, data mode state, layout
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import type { DataMode } from './types';
import { checkBackendHealth } from './services/api';
import TopBar from './components/layout/TopBar';
import CommandDashboard from './pages/CommandDashboard';
import NTROIntelligence from './pages/NTROIntelligence';
import ResponderOperations from './pages/ResponderOperations';
import PublicServices from './pages/PublicServices';

type ViewId = 'command' | 'ntro' | 'responder' | 'public';

export default function App() {
  const [dataMode, setDataMode] = useState<DataMode>('REPLAY');
  const [activeView, setActiveView] = useState<ViewId>('command');

  // Non-blocking health check on load
  useEffect(() => {
    checkBackendHealth().catch(() => {
      // stays REPLAY — no banner unless user clicks LIVE
    });
  }, []);

  const views: Record<ViewId, React.ReactNode> = {
    command:   <CommandDashboard />,
    ntro:      <NTROIntelligence />,
    responder: <ResponderOperations />,
    public:    <PublicServices />,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f1117] text-white">
      <TopBar
        dataMode={dataMode}
        onModeChange={setDataMode}
        onViewChange={(v) => setActiveView(v as ViewId)}
        activeView={activeView}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {views[activeView]}
      </main>
    </div>
  );
}
