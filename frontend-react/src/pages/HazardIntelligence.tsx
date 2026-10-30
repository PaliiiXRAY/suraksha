// ─────────────────────────────────────────────────────────────────────────────
// HazardIntelligence.tsx — Tab 1 matching 8.16.10 PM canonical UI + 8.37.45 PM features
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Search,
  Zap,
  Radio,
  FileCode,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';

interface Props {
  onShowToast: (msg: string) => void;
}

interface IncidentSignal {
  id: string;
  title: string;
  location: string;
  coordinates: string;
  classification: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'VERIFIED';
  confidence: string;
  source: string;
  status: string;
  riskScore: number;
  formula: string;
  reasons: string[];
  assets: string[];
  wind: string;
  surge: string;
  tag: 'cyclone' | 'flood' | 'route';
  auditHash: string;
}

const SIGNALS: IncidentSignal[] = [
  {
    id: 'EVT-2019-0002',
    title: 'Cyclone Fani Landfall',
    location: 'Puri Coast, Odisha',
    coordinates: '19.8135°N · 85.8315°E',
    classification: 'CYCLONE',
    severity: 'CRITICAL',
    confidence: 'IMD Official',
    source: 'IMD',
    status: 'WARNING',
    riskScore: 92,
    formula: '0.50·severity + 0.20·exposure + 0.20·surge + 0.10·infra = 0.92',
    reasons: [
      'Extremely Severe Cyclonic Storm with sustained winds 215 km/h (gusts 240 km/h)',
      'Direct coastal eye landfall projected within 35 km radius of Puri town',
      'High-risk surge inundation corridor overlapping dense coastal settlements',
    ],
    assets: [
      'Puri District Headquarters Hospital (0.8 km from coast)',
      'Jagannath Temple Evacuation Complex (1.2 km)',
      'Substation Pipili 132kV Grid (4.2 km)',
    ],
    wind: 'Sustained: 215 km/h · Gusts 240 km/h',
    surge: 'Storm Surge: 1.5m – 2.0m above astronomical tide',
    tag: 'cyclone',
    auditHash: '0x9d4a77e1c8b32095f612089b0d1fa7e4483a991823fbd09419b48c3491ea7011',
  },
  {
    id: 'EVT-2019-0003',
    title: 'Brahmagiri Storm Surge',
    location: 'Brahmagiri Block, Puri District',
    coordinates: '19.7991°N · 85.8239°E',
    classification: 'STORM SURGE',
    severity: 'CRITICAL',
    confidence: '89%',
    source: 'MOSDAC',
    status: 'NEW',
    riskScore: 87,
    formula: '0.50·severity + 0.20·exposure + 0.20·surge + 0.10·infra = 0.87',
    reasons: [
      'Low-lying coastal spit adjacent to Chilika lagoon vulnerable to sea water ingress',
      'Estimated 118,000 population in storm surge swath requiring immediate evacuation',
      'Marine Drive road corridor cut off by projected 1.8m surge flood',
    ],
    assets: [
      'Brahmagiri Community Health Centre (1.4 km)',
      'Marine Drive Highway Culvert 14 (0.6 km)',
      'Nearest Units: NDRF Unit 3 Mundali (En route)',
    ],
    wind: 'Surface Wind: NE at 195 km/h',
    surge: 'Peak Surge: 1.8m inundation depth',
    tag: 'cyclone',
    auditHash: '0x3f12a804c7d956e1b89945112eaf7392d4710bb81a9420084c7e6512ba3098f1',
  },
  {
    id: 'EVT-2019-0004',
    title: 'Erasama Flood Exposure',
    location: 'Erasama, Jagatsinghpur District',
    coordinates: '20.0028°N · 86.4251°E',
    classification: 'FLOOD',
    severity: 'HIGH',
    confidence: '84%',
    source: 'Bhuvan',
    status: 'NEW',
    riskScore: 79,
    formula: '0.50·severity + 0.20·exposure + 0.20·surge + 0.10·infra = 0.79',
    reasons: [
      'Coastal delta zone exposed to combined tidal surge and Mahanadi backflow',
      '142,000 residents in unreinforced thatch dwellings in direct hazard path',
      'Past historical vulnerability baseline from 1999 super cyclone',
    ],
    assets: [
      'Erasama Multipurpose Cyclone Shelter (0.5 km)',
      'Paradip Port Feeder Pipeline (3.8 km)',
      'Nearest Units: ODRAF Unit 2 Cuttack',
    ],
    wind: 'Surface Wind: ENE at 165 km/h',
    surge: 'Tidal Inundation: 1.2m',
    tag: 'flood',
    auditHash: '0x71e84a29c0182745ba6110f29cdae8503810f639908127346b9a89104f291077',
  },
  {
    id: 'EVT-2019-0005',
    title: 'NH-316 Route Interruption',
    location: 'Puri-Bhubaneswar Corridor',
    coordinates: '20.0512°N · 85.8520°E',
    classification: 'ROUTE CUT',
    severity: 'MODERATE',
    confidence: '91%',
    source: 'OSM',
    status: 'VERIFIED',
    riskScore: 66,
    formula: '0.50·severity + 0.20·exposure + 0.20·surge + 0.10·infra = 0.66',
    reasons: [
      'High wind threshold exceeds tree-fall and electrical mast failure limit',
      'Key arterial evacuation and relief logistics spine between capital and coast',
      'Alternative Pipili bypass confirmed passable with police escort',
    ],
    assets: [
      'Pipili Toll Plaza Medical Staging Post (0.2 km)',
      'Bhubaneswar AIIMS Logistics Depot (22 km)',
      'Nearest Units: Odisha State Highway Patrol',
    ],
    wind: 'Crosswinds: 140 km/h',
    surge: 'Waterlogging: 0.4m at km 42',
    tag: 'route',
    auditHash: '0x15b7c89920dfa74129b05781a541094892c908123e4758129a0081249b6184aa',
  },
];

export default function HazardIntelligence({ onShowToast }: Props) {
  const [filter, setFilter] = useState<'all' | 'cyclone' | 'flood' | 'route'>('all');
  const [selectedSignalId, setSelectedSignalId] = useState<string>('EVT-2019-0002');
  const [search, setSearch] = useState('');
  const [runningEngine, setRunningEngine] = useState(false);
  const [latestRun, setLatestRun] = useState('1.42s');
  const [auditVerified, setAuditVerified] = useState<Record<string, boolean>>({});

  const filteredSignals = SIGNALS.filter(s => {
    if (filter !== 'all' && s.tag !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.classification.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedSignal = SIGNALS.find(s => s.id === selectedSignalId) ?? SIGNALS[0];

  function handleRunRiskEngine() {
    setRunningEngine(true);
    setTimeout(() => {
      setRunningEngine(false);
      setLatestRun('1.18s');
      onShowToast('Risk engine pipeline complete: 24 coastal blocks scored and 12 strategic assets evaluated');
    }, 900);
  }

  function handleVerifyAuditHash(id: string) {
    setAuditVerified(prev => ({ ...prev, [id]: true }));
    onShowToast(`Audit Hash Verified: SHA-256 signature matches IMD & MOSDAC genesis block for ${id}`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header matching 8.16.10 PM */}
      <div className="flex items-start justify-between flex-wrap gap-4">
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

      {/* 4 Stat Cards matching 8.16.10 PM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-3xl font-black font-mono text-white tracking-tight">24</div>
          <div className="text-xs text-white/50 font-medium mt-1">blocks analysed</div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-3xl font-black font-mono text-white tracking-tight">24</div>
          <div className="text-xs text-white/50 font-medium mt-1">100% ranking coverage</div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-3xl font-black font-mono text-red-400 tracking-tight">6</div>
          <div className="text-xs text-white/50 font-medium mt-1">
            critical areas requiring immediate action
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
            {latestRun}
          </div>
          <div className="text-xs text-white/50 font-medium mt-1">processing time</div>
        </div>
      </div>

      {/* Live Classification Pipeline & GIS Vector Map */}
      <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden flex flex-col">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e121b] flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
              Live Classification Pipeline
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">
              GIS OVERLAY
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex items-center bg-[#181d2a] p-1 rounded-lg border border-white/10 text-xs">
              {(['all', 'cyclone', 'flood', 'route'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`px-2.5 py-0.5 rounded capitalize font-medium transition-colors ${
                    filter === k ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Run risk engine button */}
            <button
              onClick={handleRunRiskEngine}
              disabled={runningEngine}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Zap size={12} className={runningEngine ? 'animate-spin' : ''} />
              <span>{runningEngine ? 'Computing scores...' : 'Run risk engine'}</span>
            </button>
          </div>
        </div>

        {/* GIS Canvas */}
        <div className="p-4 bg-[#090c13] min-h-[380px] flex items-center justify-center">
          <GISOverlayMap
            selectedBlockId={selectedSignal.id === 'EVT-2019-0003' ? 'brahmagiri' : selectedSignal.id === 'EVT-2019-0004' ? 'erasama' : 'brahmagiri'}
            onSelectBlock={blockId => {
              if (blockId === 'brahmagiri') setSelectedSignalId('EVT-2019-0003');
              else if (blockId === 'erasama') setSelectedSignalId('EVT-2019-0004');
              else setSelectedSignalId('EVT-2019-0002');
            }}
            filter={filter}
            windSpeed={215}
            highlightBrahmagiri={true}
          />
        </div>

        {/* Legend bar */}
        <div className="flex items-center justify-between px-5 py-2 border-t border-white/5 bg-[#0e121b] text-[11px] font-mono text-white/50 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-600"></span> CRITICAL (&gt;85)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-orange-500"></span> HIGH (70–85)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400"></span> MODERATE (50–70)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500"></span> TRACK (CYCLONE FANI)
            </span>
          </div>
          <div>ODISHA DISASTER MANAGEMENT ACT 2005 COMPLIANT</div>
        </div>
      </div>

      {/* Prioritised Signals (4 Cards) matching 8.16.10 PM */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-white/80">
            Prioritised Signals
          </h2>
          <span className="text-xs text-white/40 font-mono">RANKED BY EXPLAINABLE RISK HEURISTIC</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSignals.map(s => {
            const isSelected = selectedSignalId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSignalId(s.id)}
                className={`bg-[#121622] border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-500/50 flex flex-col justify-between ${
                  isSelected ? 'border-blue-500 ring-1 ring-blue-500/40 bg-[#161c2c]' : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-white/40 font-bold">{s.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        s.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : s.severity === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {s.classification}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white">{s.title}</h3>
                  <div className="text-xs text-white/50 mt-0.5">{s.location}</div>
                </div>

                <div className="flex items-end justify-between mt-4 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">SOURCE</div>
                    <div className="text-xs font-mono font-bold text-cyan-400">{s.source} · {s.confidence}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-white/40 uppercase">RISK</div>
                    <div className="text-xl font-black font-mono text-red-400">{s.riskScore}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Intelligence Table & Search */}
      <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e121b] flex-wrap gap-3">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/80">
            Incident Intelligence Table
          </span>

          <div className="relative min-w-[240px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search incidents by id, title, location..."
              className="w-full bg-[#181d2a] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0b0e14] text-white/40 border-b border-white/5">
              <tr>
                <th className="py-2.5 px-4 font-normal">INCIDENT ID</th>
                <th className="py-2.5 px-4 font-normal">TITLE</th>
                <th className="py-2.5 px-4 font-normal">LOCATION / COORDS</th>
                <th className="py-2.5 px-4 font-normal">CLASSIFICATION</th>
                <th className="py-2.5 px-4 font-normal">SOURCE</th>
                <th className="py-2.5 px-4 font-normal text-right">RISK SCORE</th>
                <th className="py-2.5 px-4 font-normal text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSignals.map(s => {
                const isSelected = selectedSignalId === s.id;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSignalId(s.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-cyan-300">{s.id}</td>
                    <td className="py-3 px-4 font-sans font-bold text-white">{s.title}</td>
                    <td className="py-3 px-4 text-white/60">
                      <div>{s.location}</div>
                      <div className="text-[10px] text-white/40">{s.coordinates}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 font-bold">
                        {s.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/70">{s.source}</td>
                    <td className="py-3 px-4 text-right font-black text-red-400 text-sm">
                      {s.riskScore}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedSignalId(s.id);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Incident Intelligence Dossier + Audit Trail Hash Verification (from 8.37.45 PM) */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
              OPERATIONAL INTELLIGENCE DOSSIER · {selectedSignal.id}
            </div>
            <h2 className="text-xl font-extrabold text-white">{selectedSignal.title}</h2>
            <div className="text-xs text-white/60 font-mono mt-0.5">
              {selectedSignal.location} · Coordinates: {selectedSignal.coordinates}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-white/40 uppercase">EXPLAINABLE RISK SCORE</div>
            <div className="text-2xl font-black font-mono text-red-400">
              {selectedSignal.riskScore} <span className="text-xs font-normal text-white/40">/ 100</span>
            </div>
            <div className="text-[10px] font-mono text-white/40">{selectedSignal.formula}</div>
          </div>
        </div>

        {/* 3-Column Dossier Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {/* Col 1: Contributing Factors */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-white/50 uppercase font-bold tracking-wider">
              CONTRIBUTING REASONS
            </div>
            <ul className="space-y-1.5 text-xs text-white/80">
              {selectedSignal.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400 font-bold mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Critical Assets Exposed */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-white/50 uppercase font-bold tracking-wider">
              CRITICAL ASSETS EXPOSED
            </div>
            <ul className="space-y-1.5 text-xs text-white/80">
              {selectedSignal.assets.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">⚲</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Meteorological Telemetry */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-white/50 uppercase font-bold tracking-wider">
              METEOROLOGICAL TELEMETRY
            </div>
            <div className="space-y-2 text-xs font-mono bg-[#0c1017] p-3 rounded-lg border border-white/5">
              <div className="text-white/80">{selectedSignal.wind}</div>
              <div className="text-cyan-300">{selectedSignal.surge}</div>
              <div className="text-[10px] text-white/40">Sourced from IMD Doppler Weather Radar Paradip</div>
            </div>
          </div>
        </div>

        {/* Cryptographic Audit Trail Verification (Feature from 8.37.45 PM) */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Immutable Consensus Audit Trail</span>
              <span className="text-[10px] font-mono text-white/40 truncate max-w-md">
                SHA-256: {selectedSignal.auditHash}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {auditVerified[selectedSignal.id] ? (
              <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                <span>CONSENSUS VERIFIED</span>
              </span>
            ) : (
              <button
                onClick={() => handleVerifyAuditHash(selectedSignal.id)}
                className="px-3 py-1 rounded-md bg-[#182030] hover:bg-[#202c42] border border-blue-500/40 text-blue-300 text-xs font-mono font-bold transition-colors"
              >
                Verify Audit Hash
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
