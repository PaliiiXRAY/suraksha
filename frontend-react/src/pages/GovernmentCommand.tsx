// ─────────────────────────────────────────────────────────────────────────────
// GovernmentCommand.tsx — Tab 2 matching video frames 00:09 - 00:14 & 00:42 - 00:56
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, AlertTriangle, Route } from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';

interface Props {
  onShowToast: (msg: string) => void;
}

export default function GovernmentCommand({ onShowToast }: Props) {
  const [windSlider, setWindSlider] = useState<number>(50); // 0 to 100
  const [dispatched, setDispatched] = useState<boolean>(false);
  const [selectedRank, setSelectedRank] = useState<string>('brahmagiri');

  // Dynamic calculations based on wind slider
  const windKmh = Math.round(180 + (windSlider / 100) * 30); // 180 to 210 km/h
  const peopleAtRisk = windSlider > 60 ? '684K' : '603K';
  const teamsDeployed = dispatched ? 10 : 9;

  // Dynamic scores for priority areas
  const scoreBrahmagiri = Math.min(100, Math.round(92 + (windSlider - 50) * 0.16));
  const scoreKrushna = Math.min(100, Math.round(87 + (windSlider - 50) * 0.2));
  const scoreErasama = Math.min(100, Math.round(79 + (windSlider - 50) * 0.24));
  const scoreAstaranga = Math.min(100, Math.round(73 + (windSlider - 50) * 0.16));

  function handleDispatch() {
    if (!dispatched) {
      setDispatched(true);
      onShowToast('Simulated dispatch alert created and added to the command log');
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header */}
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

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Active Areas</div>
          <div className="text-3xl font-black font-mono text-white tracking-tight">24</div>
          <div className="text-xs text-white/40 mt-1">across 3 districts</div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">People at Risk</div>
          <div className="text-3xl font-black font-mono text-red-400 tracking-tight transition-all">
            {peopleAtRisk}
          </div>
          <div className="text-xs text-white/40 mt-1">Within forecast wind field</div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Teams Deployed</div>
          <div className="text-3xl font-black font-mono text-white tracking-tight transition-all">
            {teamsDeployed}
          </div>
          <div className="text-xs text-white/40 mt-1">of 14 NDRF teams</div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Relief Camps</div>
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">18</div>
          <div className="text-xs text-white/40 mt-1">44,500 capacity</div>
        </div>
      </div>

      {/* Priority Areas Ranked List */}
      <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e121b]">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
            Priority Areas
          </span>
          <span className="text-xs font-mono text-white/40">24 AREAS</span>
        </div>

        <div className="divide-y divide-white/5">
          {/* Rank 1 */}
          <div
            onClick={() => setSelectedRank('brahmagiri')}
            className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
              selectedRank === 'brahmagiri' ? 'bg-blue-600/10' : 'hover:bg-white/5'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-white/40">RANK 01</div>
              <div className="font-bold text-sm text-white">Brahmagiri</div>
              <div className="text-xs text-white/40">Puri · 118K exposed</div>
            </div>
            <div className="text-2xl font-black font-mono text-red-500">{scoreBrahmagiri}</div>
          </div>

          {/* Rank 2 */}
          <div
            onClick={() => setSelectedRank('krushnaprasad')}
            className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
              selectedRank === 'krushnaprasad' ? 'bg-blue-600/10' : 'hover:bg-white/5'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-white/40">RANK 02</div>
              <div className="font-bold text-sm text-white">Krushna Prasad</div>
              <div className="text-xs text-white/40">Puri · 89K exposed</div>
            </div>
            <div className="text-2xl font-black font-mono text-red-500">{scoreKrushna}</div>
          </div>

          {/* Rank 3 */}
          <div
            onClick={() => setSelectedRank('erasama')}
            className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
              selectedRank === 'erasama' ? 'bg-blue-600/10' : 'hover:bg-white/5'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-white/40">RANK 03</div>
              <div className="font-bold text-sm text-white">Erasama</div>
              <div className="text-xs text-white/40">Jagatsinghpur · 132K exposed</div>
            </div>
            <div className="text-2xl font-black font-mono text-orange-400">{scoreErasama}</div>
          </div>

          {/* Rank 4 */}
          <div
            onClick={() => setSelectedRank('astaranga')}
            className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
              selectedRank === 'astaranga' ? 'bg-blue-600/10' : 'hover:bg-white/5'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono text-white/40">RANK 04</div>
              <div className="font-bold text-sm text-white">Astaranga</div>
              <div className="text-xs text-white/40">Puri · 65K exposed</div>
            </div>
            <div className="text-2xl font-black font-mono text-orange-400">{scoreAstaranga}</div>
          </div>
        </div>
      </div>

      {/* Selected Operational Zone Box (Brahmagiri - Puri) */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
        {/* Box Header with Wind Intensity Slider */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              SELECTED OPERATIONAL ZONE
            </div>
            <h2 className="text-xl font-extrabold text-white">Brahmagiri - Puri</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/60">
              INTENSITY (WIND): <strong className="text-white font-bold">{windKmh} km/h</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={windSlider}
              onChange={e => setWindSlider(Number(e.target.value))}
              className="w-36 accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Vector Map for Brahmagiri */}
        <div className="h-[360px] w-full">
          <GISOverlayMap
            selectedBlockId="brahmagiri"
            windSpeed={windKmh}
            highlightBrahmagiri={true}
          />
        </div>

        {/* Bottom Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">PRIORITY SCORE</div>
            <div className="text-3xl font-black font-mono text-red-500 mt-0.5">
              {scoreBrahmagiri}<span className="text-sm text-white/40">/100</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">TIME TO IMPACT</div>
            <div className="text-3xl font-black font-mono text-white mt-0.5">08h 20m</div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">PRIMARY HAZARD</div>
            <div className="text-sm font-semibold text-white/90 mt-1">
              Storm surge + coastal exposure
            </div>
          </div>
        </div>

        {/* Recommended Action + Simulated Dispatch Button */}
        <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl bg-[#161b28] border border-blue-500/20">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              RECOMMENDED ACTION · SIMULATED
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              Stage NDRF Unit 3 at 7th Battalion OSAP, Bhubaneswar
            </div>
            <div className="text-xs text-white/50 font-mono mt-0.5">
              NDRF Unit 3 · 45 personnel · ETA 1h 40m · Via NH-316/NH-16 clear corridor
            </div>
          </div>

          <button
            onClick={handleDispatch}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-lg ${
              dispatched
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
            }`}
          >
            {dispatched ? '✓ Simulated dispatch sent' : 'Dispatch simulated alert'}
          </button>
        </div>

        {/* Lower Grid: Supply Route Status + Decision Interlocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Supply/Route Status */}
          <div className="p-4 rounded-xl bg-[#0f131d] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/70">
                Supply/Route Status
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-mono">
                SPATIAL
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-white/60">NH-316 Puri-Bhubaneswar</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                  AT RISK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Marine Drive - Konark</span>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[10px]">
                  CUT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Khorda Road rail corridor</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                  CLEAR
                </span>
              </div>
            </div>
          </div>

          {/* Decision Interlocks */}
          <div className="p-4 rounded-xl bg-[#0f131d] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/70">
                Decision Interlocks
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                3/3 CLEAR
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="flex-shrink-0" />
                <span>Data freshness within 6h threshold</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="flex-shrink-0" />
                <span>Official IMD bulletin governs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="flex-shrink-0" />
                <span>UNMANNED prevention: audit trail active</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="flex-shrink-0" />
                <span>Unit readiness clamp enforced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
