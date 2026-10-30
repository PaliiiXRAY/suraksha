// ─────────────────────────────────────────────────────────────────────────────
// TopBar.tsx — Header with SURAKSHA branding matching FireSense Design System
// Strictly implements Section 3 required terminology and dual theme styling.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { ShieldCheck, Satellite, RefreshCw, Share2, LogOut, Radio, Sun, Moon } from 'lucide-react';
import type { DataMode } from '../../types';

interface Props {
  dataMode: DataMode;
  onModeChange: (mode: DataMode) => void;
  onViewChange: (view: string) => void;
  activeView: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSimulatePass?: () => void;
  onSyncReplay?: () => void;
}

const NAV_VIEWS = [
  { id: 'intelligence', label: 'Hazard Intelligence' },
  { id: 'command', label: 'Government Portal' },
  { id: 'responder', label: 'Response Portal' },
  { id: 'citizen', label: 'Public Portal' },
];

export default function TopBar({
  onViewChange,
  activeView,
  theme = 'dark',
  onToggleTheme,
  onSimulatePass,
  onSyncReplay,
}: Props) {
  const getRoleLabel = () => {
    switch (activeView) {
      case 'intelligence':
        return 'INTEL ANALYST · NDMA / SDMA';
      case 'command':
        return 'AUTHORITY · DISASTER COMMAND HQ';
      case 'responder':
        return 'FIELD RESPONDER · NDRF / ODRAF';
      case 'citizen':
        return 'PUBLIC CITIZEN ACCESS';
      default:
        return 'SURAKSHA OPERATOR';
    }
  };

  return (
    <header className="flex-shrink-0 bg-white dark:bg-[#0b0e14] border-b border-slate-200 dark:border-white/10 select-none shadow-sm transition-colors">
      {/* Primary Navigation Row */}
      <div className="flex items-center justify-between h-14 px-5 gap-4">
        {/* Left: Brand Logo + Nav tabs */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onViewChange('intelligence')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f4511e] to-[#c2410c] flex items-center justify-center shadow-md shadow-orange-950/40">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-widest text-slate-900 dark:text-white leading-none">
                SURAKSHA
              </span>
              <span className="text-[9px] font-mono text-slate-500 dark:text-white/40 tracking-tight leading-tight mt-0.5 hidden sm:inline">
                SATELLITE-TO-DECISION DISASTER INTELLIGENCE
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-100 dark:bg-[#141824] p-1 rounded-xl border border-slate-200 dark:border-white/10">
            {NAV_VIEWS.map(v => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions and Status Pills */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle (Dark / Light) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              id="theme-toggle"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-all shadow-sm"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-blue-500" />
              )}
            </button>
          )}

          {/* Simulate Satellite Pass button */}
          <button
            onClick={onSimulatePass}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 text-xs font-mono font-semibold transition-all shadow-sm"
          >
            <Satellite size={13} className="text-cyan-500 dark:text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Simulate Satellite Pass</span>
          </button>

          {/* System status pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM NORMAL</span>
          </div>

          {/* Active role badge */}
          <div className="px-3 py-1 rounded-full border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 text-xs font-mono font-medium hidden md:block">
            {getRoleLabel()}
          </div>

          {/* Sync replay button */}
          <button
            onClick={onSyncReplay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 text-xs font-mono transition-colors"
            title="Sync replay state with data pack"
          >
            <RefreshCw size={11} className="text-slate-500 dark:text-white/60" />
            <span className="hidden lg:inline">Sync replay</span>
          </button>

          {/* Sign out */}
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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
      <div className="flex items-center justify-between px-5 py-1.5 bg-slate-50 dark:bg-[#0e121b] border-t border-slate-200 dark:border-white/5 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-white/40 font-semibold">DATA MODE:</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
            <Radio size={10} className="text-amber-500 dark:text-amber-400" />
            <span>REPLAY: MULTI-HAZARD DISASTER INTELLIGENCE (ODISHA COAST)</span>
          </span>
        </div>
        <div className="text-slate-500 dark:text-white/40 text-[10px] hidden md:block">
          PRIORITY: IMD &gt; PROBABILITY · ALL DISPATCH: SIMULATED · REGION: ODISHA COAST
        </div>
      </div>
    </header>
  );
}
