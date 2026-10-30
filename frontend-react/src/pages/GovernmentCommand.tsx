// ─────────────────────────────────────────────────────────────────────────────
// GovernmentCommand.tsx — Portal 2: Government Portal
// Government command, operational decision-making, what-if simulations & dispatch authorizations.
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
} from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';
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
  },
];

export default function GovernmentCommand({ onShowToast }: Props) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('brahmagiri');
  const [windSlider, setWindSlider] = useState<number>(50); // 0 to 100
  const [dispatched, setDispatched] = useState<boolean>(false);
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);

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
    setShowDispatchModal(false);
    onShowToast(`Simulated dispatch alert sent: NDRF Unit 3 dispatched to ${selectedArea.name} (${selectedArea.district})`);
  }

  function handleQuickAction(actionName: string) {
    onShowToast(`Simulated Command Action Triggered: ${actionName} for ${selectedArea.name}`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-[#0a0d14] text-slate-900 dark:text-white p-6 space-y-6 transition-colors">
      {/* Top Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Government Portal
          </h1>
          <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">
            Command authorization, what-if simulation, logistics routing & response coordination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {windSlider !== 50 ? (
            <ProvenancePill tag="SIMULATED" />
          ) : (
            <ProvenancePill tag="OFFICIAL_FORECAST" />
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/40 bg-red-950/20 text-red-500 dark:text-red-400 text-xs font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-pulse"></span>
            <span>4 CRITICAL SECTORS ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Prioritised Blocks"
          value={39}
          subtitle="3 Coastal Districts"
          provenance="OSDMA BASELINE"
        />
        <StatCard
          title="Exposed Population"
          value={peopleAtRisk}
          subtitle="Within Active Hazard Footprint"
          delta={windSlider > 60 ? '+81K SURGE' : undefined}
          deltaType="negative"
          provenance={windSlider !== 50 ? 'SIMULATED' : 'CENSUS 2011'}
        />
        <StatCard
          title="Disaster Teams Mobilized"
          value={deployedTeamsCount}
          subtitle="of 14 NDRF & ODRAF Battalions"
          delta={dispatched ? '+1 DISPATCHED' : undefined}
          deltaType="positive"
          provenance="SIMULATED"
        />
        <StatCard
          title="Verified Relief Shelters"
          value={18}
          subtitle="44,500 High-Ground Capacity"
          provenance="DISTRICT REGISTRY"
        />
      </div>

      {/* Main Grid: Priority Areas (Left) & Incident Action Board (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Priority Areas List */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0e121b]">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
                Priority Area Rankings
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-white/40">39 AREAS TOTAL</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {PRIORITY_AREAS.map(area => {
                const isSelected = selectedAreaId === area.id;
                const dynamicScore = getDynamicScore(area.baseScore);
                return (
                  <div
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/15 border-l-4 border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-black">
                          {area.rank}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{area.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
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

          {/* Interactive What-If Scenario Slider */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/90">
                  Interactive "What-If" Perturbation
                </span>
              </div>
              <ProvenancePill tag="SIMULATED" size="sm" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-white/60">Simulated Wind Intensity:</span>
                <span className="font-bold text-amber-500 dark:text-amber-300">{currentWindKmh} km/h (Category 4)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={windSlider}
                onChange={e => setWindSlider(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-white/30">
                <span>180 km/h (Weakened)</span>
                <span>215 km/h (Official Peak)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/40 italic">
              Adjusting slider recalculates block exposure, bridge scours and route cutoff ratios in real-time (&lt; 15ms).
            </p>
          </div>
        </div>

        {/* Right Column (7 Cols): Selected Action Dossier & Strategic Controls */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="text-[10px] font-mono text-blue-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                  DISASTER DECISION & ACTION BOARD
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedArea.name} ({selectedArea.district})
                </h2>
                <div className="text-xs text-slate-500 dark:text-white/50 font-mono mt-0.5">
                  Action Recommendation: {selectedArea.recommendedAction}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-500 dark:text-white/40 uppercase">
                  ACTIVE PRIORITY SCORE
                </div>
                <div className="text-3xl font-black font-mono text-red-500 dark:text-red-400">
                  {selectedAreaScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* Exposed Critical Infrastructure */}
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-white/60">
                Critical Exposed Assets in Sector
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedArea.criticalAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 text-xs flex flex-col justify-between"
                  >
                    <span className="font-bold text-slate-800 dark:text-white truncate">{asset}</span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-2">
                      Vulnerability: HIGH
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supply Route Cutoff Flags */}
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-white/60">
                Critical Arterial Supply Routes
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-white font-bold">NH-316 (Bhubaneswar-Puri)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    PASSABLE (W/ ESCORT)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-white font-bold">Marine Drive Corridor</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    CUT (1.8M SURGE)
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Actions Grid */}
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-white/60">
                Command Directive Dispatches
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleQuickAction('Broadcast Red Evacuation Warning')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
                >
                  <Megaphone size={16} className="text-red-500" />
                  <span>Issue Evac Order</span>
                </button>
                <button
                  onClick={() => handleQuickAction('Open High-Ground Cyclone Shelters')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
                >
                  <Tent size={16} className="text-amber-500" />
                  <span>Open Shelters</span>
                </button>
                <button
                  onClick={() => handleQuickAction('Seal Inundated Route Corridor')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
                >
                  <Route size={16} className="text-blue-500" />
                  <span>Seal Route 14</span>
                </button>
                <button
                  onClick={() => handleQuickAction('Activate Mobile Medical Units')}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181d2a] dark:hover:bg-[#202738] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
                >
                  <PhoneCall size={16} className="text-emerald-500" />
                  <span>Pre-alert CHC</span>
                </button>
              </div>
            </div>

            {/* Primary Command Authorization CTA */}
            <div className="pt-2">
              <button
                onClick={handleTriggerDispatch}
                disabled={dispatched}
                className={`w-full py-3.5 px-4 rounded-xl font-mono text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
                  dispatched
                    ? 'bg-emerald-600 text-white cursor-default shadow-emerald-900/30'
                    : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-950/40'
                }`}
              >
                {dispatched ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>OPERATIONAL DISPATCH AUTHORIZED (SIMULATED)</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>AUTHORIZE FIELD RESPONSE & DISPATCH RELIEF TEAMS</span>
                  </>
                )}
              </button>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
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
