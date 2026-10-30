// ─────────────────────────────────────────────────────────────────────────────
// GovernmentCommand.tsx — Tab 2 matching video 2 (00:34 - 00:43)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Send,
  Radio,
  RefreshCw,
  Plus,
  AlertTriangle,
  Megaphone,
  Tent,
  ShieldAlert,
  AlertOctagon,
  PhoneCall,
  Newspaper,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  onShowToast: (msg: string) => void;
}

const ACTIVE_ZONES = [
  {
    id: 'INC-2026-0042',
    name: 'Similipal Forest Fire',
    location: 'Similipal National Park, Mayurbhanj District, Odisha',
    coordinates: '21.8564°N, 86.3521°E',
    priority: '87.0/100',
    type: 'WILDFIRE',
    severity: 'CRITICAL',
    popAtRisk: '34.2K',
    teams: '3 / 4',
  },
  {
    id: 'INC-2026-0043',
    name: 'Jamnagar Refinery Flare Stack',
    location: 'Petrochemical Refining Complex, Jamnagar, Gujarat',
    coordinates: '22.3501°N, 69.8712°E',
    priority: '38.0/100',
    type: 'FACTORY FLARE',
    severity: 'MEDIUM',
    popAtRisk: '1.2K',
    teams: '1 / 2',
  },
  {
    id: 'INC-2026-0044',
    name: 'Sangrur Farm Stubble Burning',
    location: 'Sangrur Agricultural District, Punjab',
    coordinates: '30.2481°N, 75.8392°E',
    priority: '62.0/100',
    type: 'CROP SMOKE',
    severity: 'HIGH',
    popAtRisk: '18.4K',
    teams: '2 / 3',
  },
  {
    id: 'INC-2026-0045',
    name: 'Singrauli Unregistered Hotspot',
    location: 'Singrauli Scrubland, MP/UP Border',
    coordinates: '24.1841°N, 82.6432°E',
    priority: '79.0/100',
    type: 'SUSPICIOUS ACTIVITY',
    severity: 'CRITICAL',
    popAtRisk: '8.9K',
    teams: '3 / 4',
  },
];

export default function GovernmentCommand({ onShowToast }: Props) {
  const [selectedId, setSelectedId] = useState<string>('INC-2026-0042');
  const [teamsCount, setTeamsCount] = useState<number>(9);
  const [dispatchedAlerts, setDispatchedAlerts] = useState<Record<string, boolean>>({});

  const selectedZone = ACTIVE_ZONES.find(z => z.id === selectedId) ?? ACTIVE_ZONES[0];

  function handleDispatch() {
    if (!dispatchedAlerts[selectedZone.id]) {
      setDispatchedAlerts(prev => ({ ...prev, [selectedZone.id]: true }));
      setTeamsCount(prev => prev + 1);
      onShowToast(`Simulated dispatch alert created for ${selectedZone.id} (${selectedZone.name})`);
    } else {
      onShowToast(`Alert already dispatched for ${selectedZone.id}`);
    }
  }

  function handleQuickAction(actionName: string) {
    onShowToast(`Executing: ${actionName} for ${selectedZone.name}`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Incident Command Center</h1>
          <p className="text-xs text-white/50 mt-0.5">
            Real-time situational awareness · Sep 6, 2026 · All states
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/40 bg-red-950/30 text-red-400 text-xs font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
          <span>3 Critical Incidents Active</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Active Incidents</div>
          <div className="text-3xl font-black font-mono text-white tracking-tight">5</div>
          <div className="text-xs text-white/40 mt-1">across 4 states</div>
        </div>
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">People at Risk</div>
          <div className="text-3xl font-black font-mono text-red-400 tracking-tight">398K</div>
          <div className="text-xs text-white/40 mt-1">in affected zones</div>
        </div>
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Teams Deployed</div>
          <div className="text-3xl font-black font-mono text-white tracking-tight">{teamsCount}</div>
          <div className="text-xs text-white/40 mt-1">of 15 NDRF teams</div>
        </div>
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Relief Camps</div>
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">6</div>
          <div className="text-xs text-white/40 mt-1">32,000 capacity available</div>
        </div>
      </div>

      {/* Main 2-Column: Active Zones (Left) + Selected Operational Zone (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Active Zones */}
        <div className="lg:col-span-5 bg-[#121622] border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e121a]">
            <span className="text-xs font-mono uppercase font-bold text-white/80">Active Zones</span>
            <span className="text-xs font-mono text-white/40">5 INCIDENTS</span>
          </div>

          <div className="divide-y divide-white/5 overflow-y-auto max-h-[680px]">
            {ACTIVE_ZONES.map(z => {
              const isSelected = z.id === selectedId;
              return (
                <div
                  key={z.id}
                  onClick={() => setSelectedId(z.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-600/15 border-l-4 border-l-blue-500' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-white/40">{z.id}</div>
                      <div className="font-bold text-sm text-white mt-0.5">{z.name}</div>
                      <div className="text-xs text-white/40 mt-0.5 truncate">{z.location}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        z.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : z.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {z.severity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs font-mono text-white/60 pt-2 border-t border-white/5">
                    <span>Priority: <strong className="text-white font-bold">{z.priority}</strong></span>
                    <span className="text-white/40">{z.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Selected Operational Zone */}
        <div className="lg:col-span-7 bg-[#121622] border border-white/10 rounded-xl p-5 space-y-5">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              SELECTED OPERATIONAL ZONE
            </div>
            <h2 className="text-xl font-extrabold text-white mt-0.5">{selectedZone.name}</h2>
            <div className="text-xs font-mono text-white/50 mt-0.5">
              {selectedZone.location} · {selectedZone.coordinates}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
              {selectedZone.type}
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              {selectedZone.severity}
            </span>
          </div>

          {/* Dispatch Simulated Alert Action Button */}
          <button
            onClick={handleDispatch}
            className={`w-full py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
              dispatchedAlerts[selectedZone.id]
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
            }`}
          >
            <Send size={14} />
            <span>
              {dispatchedAlerts[selectedZone.id]
                ? `✓ Dispatch Sent (${selectedZone.id})`
                : `Dispatch Simulated Alert (${selectedZone.id})`}
            </span>
          </button>

          {/* 3 Metric Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#0e121a] border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase">POPULATION AT RISK</div>
              <div className="text-xl font-black font-mono text-red-400 mt-1">{selectedZone.popAtRisk}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0e121a] border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase">TEAMS DEPLOYED</div>
              <div className="text-xl font-black font-mono text-white mt-1">{selectedZone.teams}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0e121a] border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase">FIRE TYPE</div>
              <div className="text-sm font-bold font-mono text-white mt-1.5">{selectedZone.type}</div>
            </div>
          </div>

          {/* Resource Utilisation Progress Bars */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-white/5 space-y-3">
            <div className="text-xs font-mono uppercase font-bold text-white/80">
              Resource Utilisation
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <div className="flex justify-between text-white/60 mb-1">
                  <span>NDRF Teams</span>
                  <span className="text-white font-bold">9 / 15 teams</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[60%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-white/60 mb-1">
                  <span>Fire Brigades</span>
                  <span className="text-white font-bold">22 / 30 units</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full w-[73%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-white/60 mb-1">
                  <span>Relief Camps</span>
                  <span className="text-white font-bold">0 / 12 camps</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[0%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-white/60 mb-1">
                  <span>Helicopters</span>
                  <span className="text-white font-bold">3 / 5 aircraft</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full w-[60%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions (6 Buttons) */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono uppercase font-bold text-white/60">QUICK ACTIONS</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'Issue Public Alert', icon: Megaphone },
                { name: 'Open Relief Camp', icon: Tent },
                { name: 'Request Army Assist.', icon: ShieldAlert },
                { name: 'Block Affected Roads', icon: AlertOctagon },
                { name: 'Notify District Collector', icon: PhoneCall },
                { name: 'Media Briefing', icon: Newspaper },
              ].map(act => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.name}
                    onClick={() => handleQuickAction(act.name)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#151a26] hover:bg-[#1a2130] border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors"
                  >
                    <Icon size={14} className="text-blue-400" />
                    <span>{act.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incident Lifecycle Tracker — Live State Machine */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/80">
                Incident Lifecycle Tracker — Live State Machine
              </span>
              <button
                onClick={() => onShowToast('Lifecycle state machine refreshed')}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <RefreshCw size={10} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2 divide-y divide-white/5 font-mono text-xs">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-white">INC-2026-0042 Similipal Forest Fire</div>
                  <div className="text-[11px] text-white/40">Risk Score: 87.0/100 • Severity: CRITICAL</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  NEW
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-white">INC-2026-0043 Jamnagar Refinery Flare Stack</div>
                  <div className="text-[11px] text-white/40">Risk Score: 38.0/100 • Severity: MEDIUM</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    VERIFIED
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/40 text-[10px]">
                    TERMINAL (RESOLVED)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-white">INC-2026-0044 Sangrur Farm Stubble Burning</div>
                  <div className="text-[11px] text-white/40">Risk Score: 62.0/100 • Severity: HIGH</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  NEW
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-white">INC-2026-0045 Singrauli Unregistered Hotspot</div>
                  <div className="text-[11px] text-white/40">Risk Score: 79.0/100 • Severity: CRITICAL</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                    NEW
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/40 text-[10px]">
                    TERMINAL (RESOLVED)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Reports Inbox */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/80">
                Citizen Reports Inbox
              </span>
              <button
                onClick={() => onShowToast('Citizen report form opened')}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus size={10} />
                <span>New</span>
              </button>
            </div>
            <p className="text-xs text-white/40 font-mono">
              No citizen reports yet. Reports from the Citizen Services portal appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
