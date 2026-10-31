// ─────────────────────────────────────────────────────────────────────────────
// TopBar.tsx — Exact FireSense Reference Header Architecture
// Clean single-row navbar with centered pill navigation, tab icons, and dual-theme controls
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  ShieldCheck,
  Zap,
  Building2,
  Truck,
  Users,
  Satellite,
  LogOut,
  Sun,
  Moon,
  Radio,
} from 'lucide-react';
import type { DataMode, AuthUser, ViewId } from '../../types';
import { ROLE_PERMISSIONS } from '../../types';

interface Props {
  dataMode: DataMode;
  onModeChange: (mode: DataMode) => void;
  onViewChange: (view: string) => void;
  activeView: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSimulatePass?: () => void;
  onSyncReplay?: () => void;
  user?: AuthUser | null;
  onSignOut?: () => void;
}

const NAV_VIEWS = [
  { id: 'intelligence', label: 'Hazard Intelligence', icon: Zap },
  { id: 'command', label: 'Government Portal', icon: Building2 },
  { id: 'responder', label: 'Response Portal', icon: Truck },
  { id: 'citizen', label: 'Public Portal', icon: Users },
];

export default function TopBar({
  onViewChange,
  activeView,
  theme = 'dark',
  onToggleTheme,
  onSimulatePass,
  user,
  onSignOut,
}: Props) {
  return (
    <header className="flex-shrink-0 bg-white dark:bg-[#0b0e14] border-b border-slate-200/90 dark:border-white/10 select-none shadow-sm transition-colors sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6 gap-4">
        {/* Left: FireSense-style Flame/Shield Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
          onClick={() => {
            const role = user?.role || 'civilian';
            const allowed = ROLE_PERMISSIONS[role] || ['citizen'];
            onViewChange(allowed[0]);
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f4511e] to-[#c2410c] flex items-center justify-center shadow-md shadow-orange-950/30">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
              SURAKSHA
            </span>
          </div>
        </div>

        {/* Center: Strict RBAC Nav Views based on authenticated role */}
        <nav className="flex items-center bg-slate-100 dark:bg-[#141824] p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-inner">
          {(() => {
            const role = user?.role || 'civilian';
            const allowed = ROLE_PERMISSIONS[role] || ['citizen'];
            const visibleViews = NAV_VIEWS.filter(v => allowed.includes(v.id as ViewId));
            return visibleViews.map(v => {
              const isActive = activeView === v.id;
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isActive
                      ? 'bg-white dark:bg-[#1c2233] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                  title={`Access ${v.label}`}
                >
                  <Icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-white/40'} />
                  <span>{v.label}</span>
                </button>
              );
            });
          })()}
        </nav>

        {/* Right: Exact FireSense Button Layout */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Simulate Satellite Pass button */}
          <button
            onClick={onSimulatePass}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Satellite size={13} className="text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Simulate Satellite Pass</span>
          </button>

          {/* User profile role badge */}
          {user && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-black text-slate-900 dark:text-white uppercase">
                {user.role}
              </span>
              <span className="text-slate-400 dark:text-white/40">•</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[120px]">
                {user.full_name.split(' ')[0]}
              </span>
            </div>
          )}

          {/* Sign out button */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50/70 dark:bg-red-950/20 hover:bg-red-100/70 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Sign out of operational session"
          >
            <LogOut size={13} className="text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Theme Toggle (Sun / Moon) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              id="theme-toggle"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-all shadow-sm"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-blue-500" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
