// ─────────────────────────────────────────────────────────────────────────────
// TopBar.tsx — SURAKSHA navigation header matching Figma & Screen Recording
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { ShieldCheck, RefreshCw, Share2, LogOut, Radio } from 'lucide-react';
import type { DataMode } from '../../types';

interface Props {
  dataMode: DataMode;
  onModeChange: (mode: DataMode) => void;
  onViewChange: (view: string) => void;
  activeView: string;
  onSyncReplay?: () => void;
}

const NAV_VIEWS = [
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'command', label: 'Government Command' },
  { id: 'responder', label: 'Responder Operations' },
  { id: 'citizen', label: 'Citizen Services' },
];

export default function TopBar({
  dataMode,
  onModeChange,
  onViewChange,
  activeView,
  onSyncReplay,
}: Props) {
  const getRoleLabel = () => {
    switch (activeView) {
      case 'intelligence':
        return 'INTEL ANALYST · NDMA';
      case 'command':
        return 'AUTHORITY · WHISPER-4';
      case 'responder':
        return 'FIELD RESPONDER · NDRF';
      case 'citizen':
        return 'CITIZEN ACCESS';
      default:
        return 'SURAKSHA OPERATOR';
    }
  };

  return (
    <header className="flex-shrink-0 bg-[#0b0e14] border-b border-white/10 select-none">
      {/* Primary Navigation Row */}
      <div className="flex items-center justify-between h-14 px-5 gap-4">
        {/* Left: Brand + Nav tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onViewChange('intelligence')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f4511e] to-[#c2410c] flex items-center justify-center shadow-md shadow-orange-950/40">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-widest text-white leading-none">
                SURAKSHA
              </span>
            </div>
          </div>

          {/* Nav pill tabs */}
          <nav className="flex items-center bg-[#141824] p-1 rounded-xl border border-white/10">
            {NAV_VIEWS.map(v => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Status Pills & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* System status pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM NORMAL</span>
          </div>

          {/* Active role badge */}
          <div className="px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/70 text-xs font-mono font-medium">
            {getRoleLabel()}
          </div>

          {/* Sync replay button */}
          <button
            onClick={onSyncReplay}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-mono transition-colors"
            title="Sync replay state with data pack"
          >
            <RefreshCw size={11} className="text-white/60" />
            <span>Sync replay</span>
          </button>

          {/* Sign out */}
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>

          {/* Share button */}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-900/40 transition-colors ml-1"
          >
            <Share2 size={12} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Secondary Mode Sub-strip */}
      <div className="flex items-center justify-between px-5 py-1.5 bg-[#0e121b] border-t border-white/5 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-semibold">DATA MODE:</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1">
            <Radio size={10} className="text-amber-400" />
            <span>REPLAY: CYCLONE FANI · MAY 2019</span>
          </span>
        </div>
        <div className="text-white/30 text-[10px]">
          PRIORITY: IMD &gt; PROBABILITY · ALL DISPATCH: SIMULATED · REGION: ODISHA COAST
        </div>
      </div>
    </header>
  );
}
