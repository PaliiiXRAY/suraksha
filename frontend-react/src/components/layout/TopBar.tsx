// ─────────────────────────────────────────────────────────────────────────────
// TopBar — SURAKSHA global header with mode toggle, interlock status, timestamp
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { ShieldCheck, Radio, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import type { DataMode } from '../../types';
import { checkBackendHealth, setDataMode } from '../../services/api';

interface Props {
  dataMode: DataMode;
  onModeChange: (mode: DataMode) => void;
  onViewChange: (view: string) => void;
  activeView: string;
}

const MODE_STYLES: Record<DataMode, string> = {
  LIVE:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  CACHED: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  REPLAY: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
};

const NAV_VIEWS = [
  { id: 'command', label: 'Command' },
  { id: 'ntro',    label: 'NTRO Intel' },
  { id: 'responder', label: 'Responder' },
  { id: 'public',  label: 'Public' },
];

export default function TopBar({ dataMode, onModeChange, onViewChange, activeView }: Props) {
  const [time, setTime] = useState(new Date());
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleToggleLive() {
    if (dataMode === 'REPLAY') {
      setChecking(true);
      const ok = await checkBackendHealth();
      setChecking(false);
      if (ok) {
        setDataMode('LIVE');
        onModeChange('LIVE');
        setShowFallbackBanner(false);
      } else {
        setShowFallbackBanner(true);
        setTimeout(() => setShowFallbackBanner(false), 5000);
      }
    } else {
      setDataMode('REPLAY');
      onModeChange('REPLAY');
    }
  }

  const modeStyle = MODE_STYLES[dataMode];
  const istTime = time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  const istDate = time.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <header className="flex-shrink-0 bg-[#0f1117] border-b border-white/10">
      {/* Fallback banner */}
      {showFallbackBanner && (
        <div className="bg-amber-950 border-b border-amber-500/40 px-4 py-1.5 text-amber-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle size={12} />
          <span className="font-bold">[!] LIVE FEED UNREACHABLE — AUTOMATIC SAFETY FALLBACK ENGAGED.</span>
          <span className="opacity-80">System reverted to Cyclone Fani 2019 replay. Zero data loss.</span>
        </div>
      )}

      <div className="flex items-center h-12 px-4 gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-6 h-6 bg-[#f4511e] rounded-sm flex items-center justify-center">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest text-white">SURAKSHA</span>
          <span className="text-white/30 text-xs font-mono hidden sm:block">| Disaster Intelligence</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-0.5 flex-1">
          {NAV_VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeView === v.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Interlock indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-xs font-mono">
            <ShieldCheck size={11} />
            <span>INTERLOCKS ARMED</span>
          </div>

          {/* Data mode toggle */}
          <button
            onClick={handleToggleLive}
            disabled={checking}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-bold transition-all ${modeStyle}`}
          >
            {checking ? <RefreshCw size={10} className="animate-spin" /> : <Radio size={10} />}
            {checking ? 'CHECKING...' : dataMode}
            {dataMode === 'REPLAY' && <span className="opacity-60 font-normal">: FANI 2019</span>}
          </button>

          {/* Time */}
          <div className="hidden lg:flex items-center gap-1 text-white/40 text-xs font-mono">
            <Clock size={11} />
            <span>{istTime} IST</span>
            <span className="opacity-50">{istDate}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
