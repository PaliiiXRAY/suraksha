// ─────────────────────────────────────────────────────────────────────────────
// GovernmentCommand.tsx — Tab 2 matching 8.16.10 PM canonical UI + 8.37.45 PM features
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
} from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';

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
    district: 'Puri',
    exposed: '118K exposed',
    baseScore: 92,
    criticalAssets: ['Brahmagiri CHC Hospital', 'Marine Drive Culvert 14', 'Power Substation 33kV'],
    recommendedAction: 'Stage NDRF Unit 3 to Brahmagiri / Puri',
  },
  {
    id: 'krushnaprasad',
    rank: 'RANK 02',
    name: 'Krushna Prasad',
    district: 'Puri',
    exposed: '94K exposed',
    baseScore: 87,
    criticalAssets: ['Chilika Ferry Terminal', 'Satapada Medical Camp', 'Rural Water Works'],
    recommendedAction: 'Deploy ODRAF Inflatable Boats & Water Purification Unit',
  },
  {
    id: 'erasama',
    rank: 'RANK 03',
    name: 'Erasama',
    district: 'Jagatsinghpur',
    exposed: '142K exposed',
    baseScore: 79,
    criticalAssets: ['Erasama Multipurpose Cyclone Shelter', 'Paradip Feeder Line', 'Coastal Embankment #4'],
    recommendedAction: 'Reinforce Coastal Embankment and Distribute Emergency Rations',
  },
  {
    id: 'astaranga',
    rank: 'RANK 04',
    name: 'Astaranga',
    district: 'Puri',
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
  const currentWindKmh = Math.round(180 + (windSlider / 100) * 35); // 180 to 215 km/h
  const peopleAtRisk = windSlider > 60 ? '684K' : '603K';
  const deployedTeamsCount = dispatched ? 10 : 9;

  const selectedArea = PRIORITY_AREAS.find(a => a.id === selectedAreaId) ?? PRIORITY_AREAS[0];

  // Dynamic scores for priority areas
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
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header matching 8.16.10 PM */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Incident Command Center</h1>
          <p className="text-xs text-white/50 mt-0.5">
            Real-time situational awareness - Cyclone Fani replay · Odisha
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/40 bg-red-950/30 text-red-400 text-xs font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
          <span>4 CRITICAL AREAS ACTIVE</span>
        </div>
      </div>

      {/* 4 Stat Cards matching 8.16.10 PM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Active Areas</div>
          <div className="text-3xl font-black font-mono text-white tracking-tight">24</div>
          <div className="text-xs text-white/40 mt-1">across 3 districts</div>
        </div>

        {/* Card 2 (Dynamic with wind slider) */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40 font-mono uppercase tracking-wider">People at Risk</div>
            {windSlider > 60 && (
              <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                +81K SURGE
              </span>
            )}
          </div>
          <div className="text-3xl font-black font-mono text-red-400 tracking-tight transition-all">
            {peopleAtRisk}
          </div>
          <div className="text-xs text-white/40 mt-1">Within forecast wind field</div>
        </div>

        {/* Card 3 (Dynamic with dispatch button) */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40 font-mono uppercase tracking-wider">Teams Deployed</div>
            {dispatched && (
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +1 DISPATCHED
              </span>
            )}
          </div>
          <div className="text-3xl font-black font-mono text-white tracking-tight transition-all">
            {deployedTeamsCount}
          </div>
          <div className="text-xs text-white/40 mt-1">of 14 NDRF teams</div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Relief Camps</div>
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">18</div>
          <div className="text-xs text-white/40 mt-1">44,500 capacity</div>
        </div>
      </div>

      {/* Main Grid: Priority Areas Ranking (Left) & Incident Action Board (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Priority Areas List matching 8.16.10 PM */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e121b]">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
                Priority Areas
              </span>
              <span className="text-xs font-mono text-white/40">24 AREAS</span>
            </div>

            <div className="divide-y divide-white/5">
              {PRIORITY_AREAS.map(area => {
                const isSelected = selectedAreaId === area.id;
                const dynamicScore = getDynamicScore(area.baseScore);
                return (
                  <div
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-mono text-white/40 font-semibold">{area.rank}</div>
                      <div className="font-bold text-sm text-white">{area.name}</div>
                      <div className="text-xs text-white/40">{area.district} · {area.exposed}</div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-black font-mono ${
                          dynamicScore >= 90
                            ? 'text-red-500'
                            : dynamicScore >= 80
                            ? 'text-orange-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {dynamicScore}
                      </div>
                      {dynamicScore > area.baseScore && (
                        <div className="text-[10px] font-mono text-red-400 font-bold">
                          +{dynamicScore - area.baseScore} pts
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic What-If Scenario Slider matching 8.16.10 PM */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
                  What-If Scenario: Wind Intensity
                </span>
                <p className="text-[11px] text-white/40">Adjust sustained wind speed to evaluate exposure</p>
              </div>
              <span className="text-sm font-black font-mono text-red-400 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                {currentWindKmh} km/h
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={windSlider}
              onChange={e => setWindSlider(Number(e.target.value))}
              className="w-full h-1.5 bg-[#1e2536] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            <div className="flex justify-between text-[10px] font-mono text-white/40">
              <span>Baseline: 180 km/h</span>
              <span>IMD Forecast: 195 km/h</span>
              <span>Extreme Surge: 215 km/h</span>
            </div>
          </div>

          {/* Safety Gates & Decision Interlocks matching 8.16.10 PM */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider font-bold text-white/80 mb-1">
              Safety Gates & Decision Interlocks
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={13} />
                <span>IMD Official wins conflict precedence</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={13} />
                <span>Stale-data refuse interlock active</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={13} />
                <span>Human-in-the-loop authorization enforced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Focus Map, Recommended Action & Routes */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Recommended Action Dispatch Card matching 8.16.10 PM */}
          <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
                  RECOMMENDED ACTION · PRIORITY 01
                </div>
                <h3 className="text-lg font-bold text-white">{selectedArea.recommendedAction}</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Target sector: {selectedArea.name} ({selectedArea.district}) · Priority score: {selectedAreaScore}/100
                </p>
              </div>

              <div>
                {dispatched ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                    <CheckCircle2 size={14} />
                    <span>SIMULATED DISPATCH SENT</span>
                  </div>
                ) : (
                  <button
                    onClick={handleTriggerDispatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 transition-colors"
                  >
                    <Send size={13} />
                    <span>Dispatch simulated alert</span>
                  </button>
                )}
              </div>
            </div>

            {/* Critical Assets in Selected Sector */}
            <div className="pt-2 border-t border-white/5">
              <div className="text-[11px] font-mono text-white/40 uppercase mb-2">
                CRITICAL ASSETS AT RISK IN {selectedArea.name.toUpperCase()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {selectedArea.criticalAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-[#0e121b] border border-white/5 text-xs text-white/80 font-mono flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span className="truncate">{asset}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Embedded GIS Focus Map */}
          <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden p-3 h-[250px] flex items-center justify-center">
            <GISOverlayMap
              selectedBlockId={selectedAreaId}
              onSelectBlock={setSelectedAreaId}
              windSpeed={currentWindKmh}
              highlightBrahmagiri={selectedAreaId === 'brahmagiri'}
            />
          </div>

          {/* Supply Route Status & Quick Actions from 8.37.45 PM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supply Routes matching 8.16.10 PM */}
            <div className="bg-[#121622] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
                  Supply Routes Status
                </span>
                <Route size={14} className="text-white/40" />
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-[#0e121b] border border-white/5">
                  <span className="text-white/80">NH-316 Puri-Bhubaneswar</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    AT RISK
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#0e121b] border border-white/5">
                  <span className="text-white/80">Marine Drive Konark-Puri</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                    CUT (1.8m surge)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#0e121b] border border-white/5">
                  <span className="text-white/80">SH-13 Pipli-Nimapada</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    PASSABLE
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions (from 8.37.45 PM) */}
            <div className="bg-[#121622] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
                  Tactical Quick Actions
                </span>
                <Zap size={14} className="text-amber-400" />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleQuickAction('Broadcast CAP SMS Alert to Puri & Brahmagiri residents')}
                  className="w-full flex items-center justify-between p-2 rounded bg-[#182030] hover:bg-[#202c42] border border-white/10 text-xs text-white/90 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Megaphone size={12} className="text-cyan-400" />
                    <span>Broadcast Public Alert</span>
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">SIMULATED</span>
                </button>

                <button
                  onClick={() => handleQuickAction('Order Precautionary Road Closure on Marine Drive')}
                  className="w-full flex items-center justify-between p-2 rounded bg-[#182030] hover:bg-[#202c42] border border-white/10 text-xs text-white/90 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <AlertOctagon size={12} className="text-red-400" />
                    <span>Order Coastal Road Closure</span>
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">SIMULATED</span>
                </button>

                <button
                  onClick={() => handleQuickAction('Deploy Mobile Water & Power Resupply to Shelters')}
                  className="w-full flex items-center justify-between p-2 rounded bg-[#182030] hover:bg-[#202c42] border border-white/10 text-xs text-white/90 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Tent size={12} className="text-emerald-400" />
                    <span>Open Standby Shelters</span>
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">SIMULATED</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agency Alert Dispatch Confirmation Modal (from 8.37.45 PM) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  MULTI-AGENCY DISPATCH PROTOCOL · SIMULATED
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  Authorize Emergency Dispatch
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Confirm task order transmission for {selectedArea.name} ({selectedArea.district})
                </p>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-white/40 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-[#0a0d14] p-4 rounded-xl border border-white/10 text-xs font-mono">
              <div className="flex justify-between text-white/60">
                <span>TARGET COMMAND:</span>
                <span className="font-bold text-white">NDRF 3rd Battalion (Mundali)</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>SUPPORT UNITS:</span>
                <span className="font-bold text-cyan-300">ODRAF Unit 2 · Coast Guard Paradip</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>HAZARD ZONE:</span>
                <span className="font-bold text-red-400">{selectedArea.name} ({selectedArea.district})</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>ESTIMATED EXPOSURE:</span>
                <span className="font-bold text-amber-400">{selectedArea.exposed}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>PROTOCOL:</span>
                <span className="text-emerald-400">CAP 1.2 XML Broadcast + VHF Ch-4</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              ⚠️ <strong>Decision Interlock Notice:</strong> This dispatch is an offline simulation. In live operations, official NDMA and Odisha SDMA sign-off is required.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/40"
              >
                Confirm Simulated Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
