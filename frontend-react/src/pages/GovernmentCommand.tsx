// ─────────────────────────────────────────────────────────────────────────────
// GovernmentCommand.tsx — Portal 2: Government Portal
// Command authorization, what-if simulation, logistics routing & response coordination.
// Inherits FireSense design language with dual theme support.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Send,
  Radio,
  RefreshCw,
  AlertTriangle,
  Megaphone,
  Tent,
  ShieldAlert,
  AlertOctagon,
  PhoneCall,
  CheckCircle2,
  Route,
  ShieldCheck,
  Zap,
  Sliders,
  Users,
  Building,
  Check,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../components/design-system/StatCard';
import RiskBadge from '../components/design-system/RiskBadge';
import ProvenancePill from '../components/design-system/ProvenancePill';
import AuditVerificationBlock from '../components/design-system/AuditVerificationBlock';

interface Props {
  onShowToast: (msg: string) => void;
}

interface PriorityArea {
  id: string;
  rank: string;
  name: string;
  district: string;
  exposed: string;
  baseScore: number;
  criticalAssets: string[];
  recommendedAction: string;
  evacProgress: number;
  shelterOccupancy: number;
  rationIntegrity: number;
}

const PRIORITY_AREAS: PriorityArea[] = [
  {
    id: 'brahmagiri',
    rank: 'RANK 01',
    name: 'Brahmagiri',
    district: 'Puri District',
    exposed: '118K exposed',
    baseScore: 92,
    criticalAssets: ['Brahmagiri CHC Hospital', 'Marine Drive Culvert 14', 'Power Substation 33kV'],
    recommendedAction: 'Stage NDRF Unit 3 to Brahmagiri / Puri',
    evacProgress: 68,
    shelterOccupancy: 82,
    rationIntegrity: 91,
  },
  {
    id: 'krushnaprasad',
    rank: 'RANK 02',
    name: 'Krushna Prasad',
    district: 'Puri District',
    exposed: '94K exposed',
    baseScore: 87,
    criticalAssets: ['Chilika Ferry Terminal', 'Satapada Medical Camp', 'Rural Water Works'],
    recommendedAction: 'Deploy ODRAF Inflatable Boats & Water Purification Unit',
    evacProgress: 54,
    shelterOccupancy: 76,
    rationIntegrity: 88,
  },
  {
    id: 'erasama',
    rank: 'RANK 03',
    name: 'Erasama',
    district: 'Jagatsinghpur District',
    exposed: '142K exposed',
    baseScore: 79,
    criticalAssets: ['Erasama Multipurpose Cyclone Shelter', 'Paradip Feeder Line', 'Coastal Embankment #4'],
    recommendedAction: 'Reinforce Coastal Embankment and Distribute Emergency Rations',
    evacProgress: 61,
    shelterOccupancy: 89,
    rationIntegrity: 84,
  },
  {
    id: 'astaranga',
    rank: 'RANK 04',
    name: 'Astaranga',
    district: 'Puri District',
    exposed: '85K exposed',
    baseScore: 73,
    criticalAssets: ['Astaranga Fishing Harbour', 'Coastal VHF Relay Tower', 'Primary Health Centre'],
    recommendedAction: 'Evacuate Low-Lying Fishermen Settlements to High-Ground Shelters',
    evacProgress: 72,
    shelterOccupancy: 64,
    rationIntegrity: 95,
  },
];

export default function GovernmentCommand({ onShowToast }: Props) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('brahmagiri');
  const [windSlider, setWindSlider] = useState<number>(50); // 0 to 100
  const [dispatched, setDispatched] = useState<boolean>(false);
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [alertDispatched, setAlertDispatched] = useState<boolean>(false);

  // Dynamic calculations based on slider (What-if scenario engine)
  const currentWindKmh = Math.round(180 + (windSlider / 100) * 35);
  const peopleAtRisk = windSlider > 60 ? '684K' : '603K';
  const deployedTeamsCount = dispatched ? 10 : 9;

  const selectedArea = PRIORITY_AREAS.find(a => a.id === selectedAreaId) ?? PRIORITY_AREAS[0];

  const getDynamicScore = (base: number) => {
    return Math.min(100, Math.round(base + (windSlider - 50) * 0.16));
  };

  const selectedAreaScore = getDynamicScore(selectedArea.baseScore);

  function handleTriggerDispatch() {
    setShowDispatchModal(true);
  }

  function handleConfirmDispatch() {
    setDispatched(true);
    setAlertDispatched(true);
    setShowDispatchModal(false);
    onShowToast(`Simulated dispatch alert sent: NDRF Unit 3 dispatched to ${selectedArea.name} (${selectedArea.district})`);
  }

  function handleQuickAction(actionName: string) {
    onShowToast(`Simulated Command Action Triggered: ${actionName} for ${selectedArea.name}`);
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-wider font-black uppercase text-blue-950 dark:text-blue-100 bg-blue-100 dark:bg-blue-950/80 px-3 py-1 rounded-lg border-2 border-blue-400 dark:border-blue-500 shadow-sm">
              STATE EMERGENCY OPERATIONS CENTER (SEOC)
            </span>
            <ProvenancePill tag={windSlider !== 50 ? 'SIMULATED' : 'OFFICIAL_FORECAST'} size="sm" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Government Portal
          </h1>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
            Command authorization, what-if simulation, logistics routing & response coordination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/80 text-red-950 dark:text-red-100 text-xs font-mono font-black shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>4 CRITICAL SECTORS ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Prioritised Blocks"
          value={24}
          subtitle="+2 from 06:00 UTC"
          delta="+2"
          deltaType="negative"
          provenance="OSDMA BASELINE"
        />
        <StatCard
          title="People at Risk"
          value={peopleAtRisk}
          subtitle="High confidence"
          delta={windSlider > 60 ? '+81K SURGE' : undefined}
          deltaType="negative"
          provenance={windSlider !== 50 ? 'SIMULATED' : 'CENSUS 2011'}
        />
        <StatCard
          title="Teams Deployed"
          value={deployedTeamsCount}
          subtitle="3 on standby"
          delta={dispatched ? '+1 DISPATCHED' : undefined}
          deltaType="positive"
          provenance="SIMULATED"
        />
        <StatCard
          title="Relief Camps Active"
          value={18}
          subtitle="44,500 capacity"
          delta="100% OPERATIONAL"
          deltaType="positive"
          provenance="DISTRICT REGISTRY"
        />
      </div>

      {/* Main Operational Split: 35% Left (Priority Zones + What-If) / 65% Right (Dossier + Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (35% -> lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Active Priority Zones List */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0e121b]">
              <span className="text-xs font-mono uppercase tracking-wider font-black text-slate-900 dark:text-white">
                Active Priority Zones (4)
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">39 TOTAL BLOCKS</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {PRIORITY_AREAS.map(area => {
                const isSelected = selectedAreaId === area.id;
                const dynamicScore = getDynamicScore(area.baseScore);
                return (
                  <div
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-100/70 dark:bg-blue-600/20 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-800 dark:text-blue-300 font-black">
                          {area.rank}
                        </span>
                        <span className="text-base font-black text-slate-900 dark:text-white">{area.name}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        {area.district} · {area.exposed}
                      </div>
                    </div>

                    <div className="text-right">
                      <RiskBadge score={dynamicScore} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive What-If Perturbation Card */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-amber-500" />
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/90">
                  Interactive "What-If" Perturbation
                </span>
              </div>
              <ProvenancePill tag="SIMULATED" size="sm" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-white/70">Simulated Cyclone Wind Intensity:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {currentWindKmh} km/h (Category 4)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={windSlider}
                onChange={e => setWindSlider(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                <span>180 km/h (Weakened)</span>
                <span>215 km/h (Official Peak)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Deterministic Simulation:</strong> Adjusting perturbation slider recalculates exposed population, bridge scour indices and arterial cutoffs dynamically without altering official IMD baseline records.
            </div>
          </div>
        </div>

        {/* Right Column (65% -> lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Header of Selected Zone */}
            <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-blue-700 dark:text-cyan-400 uppercase tracking-wider mb-1">
                  SELECTED OPERATIONAL ZONE DOSSIER
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedArea.name} ({selectedArea.district})
                </h2>
                <div className="text-xs text-slate-700 dark:text-white/60 font-mono mt-0.5">
                  Action Recommendation: {selectedArea.recommendedAction}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                  ACTIVE PRIORITY SCORE
                </div>
                <div className="text-3xl font-black font-mono text-red-600 dark:text-red-400">
                  {selectedAreaScore} <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">/ 100</span>
                </div>
              </div>
            </div>

            {/* Primary Action Button: Dispatch Simulated Alert */}
            <div>
              <button
                onClick={handleTriggerDispatch}
                disabled={dispatched}
                className={`w-full py-3.5 px-6 rounded-xl font-mono text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all ${
                  dispatched
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-[0.99]'
                }`}
              >
                {dispatched ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>FIELD DISPATCH ALERT AUTHORIZED (SIMULATED)</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>DISPATCH SIMULATED ALERT TO OSDMA / NDRF</span>
                  </>
                )}
              </button>
            </div>

            {/* Critical Assets Exposed */}
            <div className="space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70">
                Critical Exposed Assets in Sector
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedArea.criticalAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 text-xs flex flex-col justify-between"
                  >
                    <span className="font-bold text-slate-900 dark:text-white truncate">{asset}</span>
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-300 mt-2 font-bold">
                      Vulnerability: HIGH
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Allocation Progress Bars */}
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70">
                Sector Readiness & Resource Allocations
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-slate-800 dark:text-white/90">
                    <span>Evacuation Progress</span>
                    <span className="text-blue-600 dark:text-blue-400">{selectedArea.evacProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedArea.evacProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-slate-800 dark:text-white/90">
                    <span>Shelter Occupancy</span>
                    <span className="text-amber-600 dark:text-amber-400">{selectedArea.shelterOccupancy}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedArea.shelterOccupancy}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-slate-800 dark:text-white/90">
                    <span>Supply Ration Integrity</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{selectedArea.rationIntegrity}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedArea.rationIntegrity}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Arterial Routes */}
            <div className="space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70">
                Critical Arterial Supply Routes
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-white font-bold">NH-316 (Bhubaneswar-Puri)</span>
                  <span className="px-2.5 py-1 rounded text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    PASSABLE (W/ ESCORT)
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-white font-bold">Marine Drive Corridor</span>
                  <span className="px-2.5 py-1 rounded text-xs font-black bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-700">
                    CUT (1.8M SURGE)
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Command Directive Actions */}
            <div className="space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70">
                Tactical Command Dispatches
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleQuickAction('Broadcast Red Evacuation Warning')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Megaphone size={16} className="text-red-500" />
                  <span>Issue Evac Order</span>
                </button>
                <button
                  onClick={() => handleQuickAction('Open High-Ground Cyclone Shelters')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Tent size={16} className="text-amber-500" />
                  <span>Open Shelters</span>
                </button>
                <button
                  onClick={() => handleQuickAction('Seal Inundated Route Corridor')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Route size={16} className="text-blue-500" />
                  <span>Seal Route 14</span>
                </button>
                <button
                  onClick={() => handleQuickAction('Activate Mobile Medical Units')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <PhoneCall size={16} className="text-emerald-500" />
                  <span>Pre-alert CHC</span>
                </button>
              </div>
            </div>

            {/* Incident Lifecycle Tracker */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-white/70">
                <span>INCIDENT LIFECYCLE STATE TRACKER</span>
                <span className="text-blue-600 dark:text-blue-400">STATE: {dispatched ? 'MOBILIZED' : 'ANALYZED'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs font-bold">
                <div className="p-2 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center gap-1">
                  <Check size={12} /> DETECTED
                </div>
                <div className="p-2 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center gap-1">
                  <Check size={12} /> ANALYZED
                </div>
                <div className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                  dispatched ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/60'
                }`}>
                  {dispatched ? <Check size={12} /> : null} ALERTED
                </div>
                <div className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                  dispatched ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/60'
                }`}>
                  MOBILIZED
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/60 font-bold">
                  STABILIZED
                </div>
              </div>
            </div>

            {/* Audit Trail Block */}
            <AuditVerificationBlock
              hash="0x5f812e99c1a084129b0081249b6184aae7b0deadbeefcafe1234567890abcdef"
              sourceAuthority="Government Command Executive Council"
              onVerify={() => onShowToast(`Audit Verified: Decision ledger consensus established for ${selectedArea.name}`)}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Authorize Field Response?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
              You are about to authorize the deployment of <strong>NDRF Unit 3 (Mundali Battalion)</strong> to{' '}
              <strong>{selectedArea.name}</strong>, Puri Sector. In prototype demonstration mode, all dispatch actions are marked as{' '}
              <span className="font-mono text-amber-500 dark:text-amber-400 font-bold">SIMULATED</span>.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
              >
                Confirm Dispatch Authorization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
