// ─────────────────────────────────────────────────────────────────────────────
// HazardIntelligence.tsx — Tab 1 matching video frames 00:00 - 00:08 & 00:30 - 00:41
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Search, Zap, CheckCircle2, AlertTriangle, ShieldAlert, Radio } from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';

interface Props {
  onShowToast: (msg: string) => void;
}

const SIGNALS = [
  {
    id: 'EVT-2019-0002',
    title: 'Cyclone Fani Landfall',
    location: 'Puri Coast, Odisha',
    coordinates: '19.8135°N, 85.8315°E',
    classification: 'CYCLONE',
    risk: 92,
    status: 'WARNING',
    source: 'IMD',
    confidence: 'Official',
    tag: 'cyclone',
  },
  {
    id: 'EVT-2019-0003',
    title: 'Brahmagiri Storm Surge',
    location: 'Brahmagiri Block, Puri',
    coordinates: '19.7991°N, 85.8239°E',
    classification: 'STORM SURGE',
    risk: 87,
    status: 'NEW',
    source: 'MOSDAC',
    confidence: '89%',
    tag: 'cyclone',
  },
  {
    id: 'EVT-2019-0004',
    title: 'Erasama Flood Exposure',
    location: 'Erasama, Jagatsinghpur',
    coordinates: '20.0028°N, 86.4251°E',
    classification: 'FLOOD',
    risk: 79,
    status: 'NEW',
    source: 'Bhuvan',
    confidence: '84%',
    tag: 'flood',
  },
  {
    id: 'EVT-2019-0005',
    title: 'NH-316 Route Interruption',
    location: 'Puri-Bhubaneswar Corridor',
    coordinates: '20.0512°N, 85.8520°E',
    classification: 'ROUTE CUT',
    risk: 66,
    status: 'VERIFIED',
    source: 'OSM',
    confidence: '91%',
    tag: 'route',
  },
];

export default function HazardIntelligence({ onShowToast }: Props) {
  const [filter, setFilter] = useState<'all' | 'cyclone' | 'flood' | 'route'>('all');
  const [selectedSignalId, setSelectedSignalId] = useState<string>('EVT-2019-0002');
  const [search, setSearch] = useState('');
  const [runningEngine, setRunningEngine] = useState(false);
  const [latestRun, setLatestRun] = useState('1.42s');

  const filteredSignals = SIGNALS.filter(s => {
    if (filter !== 'all' && s.tag !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${s.id} ${s.title} ${s.location} ${s.classification}`.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedSignal = SIGNALS.find(s => s.id === selectedSignalId) ?? SIGNALS[0];

  function handleRunRiskEngine() {
    setRunningEngine(true);
    setTimeout(() => {
      setRunningEngine(false);
      setLatestRun('1.18s');
      onShowToast('Pipeline complete: 24 blocks scored and 12 assets evaluated');
    }, 900);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-cyan-400 font-semibold uppercase mb-1">
            IMD · MOSDAC · ISRO · AI PRIORITISATION
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Hazard Intelligence</h1>
          <p className="text-xs text-white/50 mt-0.5">
            Multi-source ingestion, geospatial classification and explainable risk analysis.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-mono font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
          <span>REPLAY FEED</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-3xl font-black font-mono text-white tracking-tight">24</div>
          <div className="text-xs text-white/50 font-medium mt-1">blocks analysed</div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-3xl font-black font-mono text-white tracking-tight">24</div>
          <div className="text-xs text-white/50 font-medium mt-1">100% ranking coverage</div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#121622] border border-red-500/20 rounded-xl p-4 flex flex-col">
          <div className="text-3xl font-black font-mono text-red-500 tracking-tight">6</div>
          <div className="text-xs text-white/50 font-medium mt-1">critical — action needed</div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col">
          <div className="text-3xl font-black font-mono text-white tracking-tight">{latestRun}</div>
          <div className="text-xs text-white/50 font-medium mt-1">latest engine run</div>
        </div>
      </div>

      {/* GIS Overlay Container */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-4 space-y-3">
        {/* Map Header & Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-white/90">
              Live Classification Pipeline — GIS Overlay
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-[#171d2b] p-1 rounded-lg border border-white/10">
              {(['all', 'cyclone', 'flood', 'route'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                    filter === t
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Run risk engine button */}
            <button
              onClick={handleRunRiskEngine}
              disabled={runningEngine}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-900/40 disabled:opacity-50"
            >
              <Zap size={12} className={runningEngine ? 'animate-spin' : ''} />
              <span>{runningEngine ? 'Running engine...' : 'Run risk engine'}</span>
            </button>
          </div>
        </div>

        {/* Vector Map Canvas */}
        <div className="h-[380px] w-full">
          <GISOverlayMap filter={filter} />
        </div>
      </div>

      {/* Prioritised Signals List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold">
            PRIORITISED SIGNALS
          </div>
          <div className="text-xs font-mono text-white/40">{filteredSignals.length} RESULTS</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredSignals.map(sig => {
            const isSelected = sig.id === selectedSignalId;
            return (
              <div
                key={sig.id}
                onClick={() => setSelectedSignalId(sig.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#1b2233] border-blue-500 shadow-md shadow-blue-950/50'
                    : 'bg-[#121622] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono text-white/40">{sig.id}</span>
                  <span
                    className={`text-sm font-mono font-black ${
                      sig.risk >= 90 ? 'text-red-400' : sig.risk >= 80 ? 'text-orange-400' : 'text-amber-400'
                    }`}
                  >
                    {sig.risk}
                  </span>
                </div>
                <div className="font-bold text-sm text-white mt-1 leading-snug">{sig.title}</div>
                <div className="text-xs text-white/40 mt-1 truncate">{sig.location}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Intelligence Table */}
      <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden">
        {/* Table Header / Search */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/90">
              Incident Intelligence Table
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#171d2c] border border-white/10 rounded-lg px-2.5 py-1.5 w-64">
            <Search size={12} className="text-white/40" />
            <input
              type="text"
              placeholder="Search ID, place, event..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-white/30 outline-none w-full font-mono"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e121a] text-white/40 font-mono text-[10px] uppercase border-b border-white/5">
              <tr>
                <th className="py-2.5 px-4">ID</th>
                <th className="py-2.5 px-4">LOCATION</th>
                <th className="py-2.5 px-4">CLASSIFICATION</th>
                <th className="py-2.5 px-4 text-center">RISK</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4">SOURCE</th>
                <th className="py-2.5 px-4">CONF.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredSignals.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedSignalId(row.id)}
                  className={`hover:bg-white/5 cursor-pointer transition-colors ${
                    row.id === selectedSignalId ? 'bg-blue-600/10' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-white/80">{row.id}</td>
                  <td className="py-3 px-4 text-white/60 font-sans">{row.location}</td>
                  <td className="py-3 px-4 text-white/80">{row.classification}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-black ${
                        row.risk >= 90 ? 'text-red-400' : row.risk >= 80 ? 'text-orange-400' : 'text-amber-400'
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'WARNING'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : row.status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/50">{row.source}</td>
                  <td className="py-3 px-4 text-white/50">{row.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Dossier Bottom Strip */}
        <div className="bg-[#0d1018] border-t border-white/10 p-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">
              {selectedSignal.id} · MULTI-SOURCE INTELLIGENCE DOSSIER
            </div>
            <div className="text-base font-extrabold text-white">{selectedSignal.title}</div>
            <div className="text-xs text-white/50 font-mono mt-0.5">
              {selectedSignal.location} · {selectedSignal.coordinates}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              {selectedSignal.classification}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 font-mono font-bold text-sm">
              <span className="text-[10px] text-white/40 uppercase">SCORE</span>
              <span className="text-lg">{selectedSignal.risk}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
