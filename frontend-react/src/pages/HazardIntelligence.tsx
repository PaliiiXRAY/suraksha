// ─────────────────────────────────────────────────────────────────────────────
// HazardIntelligence.tsx — Portal 1: Hazard Intelligence Portal
// Standardized on FireSense visual design language + SURAKSHA multi-hazard architecture.
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
  Activity,
  Flame,
  Waves,
  Wind,
} from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';
import StatCard from '../components/design-system/StatCard';
import RiskBadge from '../components/design-system/RiskBadge';
import ProvenancePill from '../components/design-system/ProvenancePill';
import AuditVerificationBlock from '../components/design-system/AuditVerificationBlock';

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
  provenance: string;
  status: string;
  riskScore: number;
  formula: string;
  reasons: string[];
  assets: string[];
  telemetry: string;
  secondaryMetric: string;
  hazardType: 'cyclone' | 'flood' | 'wildfire' | 'earthquake';
  auditHash: string;
}

const SIGNALS: IncidentSignal[] = [
  {
    id: 'EVT-2019-0002',
    title: 'Extremely Severe Cyclone Fani Landfall',
    location: 'Puri Coast, Odisha',
    coordinates: '19.8135°N · 85.8315°E',
    classification: 'CYCLONE',
    severity: 'CRITICAL',
    confidence: 'IMD Official',
    source: 'IMD Doppler Radar Paradip',
    provenance: 'OFFICIAL_FORECAST',
    status: 'WARNING',
    riskScore: 92,
    formula: '0.30·wind + 0.20·rain + 0.20·pop + 0.15·surge + 0.10·infra + 0.05·urgency = 0.92',
    reasons: [
      'Extremely Severe Cyclonic Storm with sustained winds 215 km/h (gusts 240 km/h)',
      'Direct coastal eye landfall projected within 35 km radius of Puri town',
      'High-risk surge inundation corridor overlapping dense coastal settlements',
      'Power transmission infrastructure vulnerable to structural buckling along NH-316',
    ],
    assets: [
      'Puri District Headquarters Hospital (0.8 km from coast · Critical Care)',
      'Jagannath Temple Evacuation Complex (1.2 km · Designated Shelter)',
      'Substation Pipili 132kV Grid (4.2 km · Grid Vulnerability)',
    ],
    telemetry: 'Surface Winds: 215 km/h sustained · Gusts 240 km/h',
    secondaryMetric: 'Storm Surge: 1.5m – 2.0m above astronomical tide',
    hazardType: 'cyclone',
    auditHash: '0x9d4a77e1c8b32095f612089b0d1fa7e4483a991823fbd09419b48c3491ea7011',
  },
  {
    id: 'EVT-2019-0003',
    title: 'Brahmagiri Storm Surge Inundation',
    location: 'Brahmagiri Block, Puri District',
    coordinates: '19.7991°N · 85.8239°E',
    classification: 'STORM SURGE',
    severity: 'CRITICAL',
    confidence: '89%',
    source: 'ISRO MOSDAC Satellite Telemetry',
    provenance: 'MODEL_ESTIMATE',
    status: 'NEW',
    riskScore: 87,
    formula: '0.35·surge + 0.25·pop + 0.20·infra + 0.20·saline = 0.87',
    reasons: [
      'Low-lying coastal spit adjacent to Chilika lagoon vulnerable to saltwater ingress',
      'Estimated 118,000 population in storm surge swath requiring immediate evacuation',
      'Marine Drive road corridor cut off by projected 1.8m surge flood',
    ],
    assets: [
      'Brahmagiri Community Health Centre (1.4 km)',
      'Marine Drive Highway Culvert 14 (0.6 km)',
      'Designated Safe Staging: Pipili High School Shelter',
    ],
    telemetry: 'Surface Wind: NE at 195 km/h',
    secondaryMetric: 'Peak Surge: 1.8m coastal inundation depth',
    hazardType: 'cyclone',
    auditHash: '0x3f12a804c7d956e1b89945112eaf7392d4710bb81a9420084c7e6512ba3098f1',
  },
  {
    id: 'EVT-2019-0004',
    title: 'Mahanadi River Basin Flash Inundation',
    location: 'Erasama, Jagatsinghpur District',
    coordinates: '20.0028°N · 86.4251°E',
    classification: 'FLOOD',
    severity: 'HIGH',
    confidence: '84%',
    source: 'CWC Hydrological Model & Bhuvan',
    provenance: 'MODEL_ESTIMATE',
    status: 'NEW',
    riskScore: 79,
    formula: '0.40·rainfall + 0.30·backflow + 0.20·pop + 0.10·embankment = 0.79',
    reasons: [
      'Combined extreme precipitation and storm backflow breaching low-lying drainage canals',
      '142,000 residents in unreinforced dwellings in direct waterlogging path',
      'Critical bridge culvert on SH-12 at risk of scouring',
    ],
    assets: [
      'Erasama Multipurpose Cyclone Shelter (0.5 km)',
      'Paradip Port Feeder Pipeline (3.8 km)',
      'Cuttack Relief Pre-positioning Hub (34 km)',
    ],
    telemetry: 'Precipitation: 340mm / 24h accumulation',
    secondaryMetric: 'Flood Depth: 1.2m above agricultural plain',
    hazardType: 'flood',
    auditHash: '0x71e84a29c0182745ba6110f29cdae8503810f639908127346b9a89104f291077',
  },
  {
    id: 'EVT-2024-0007',
    title: 'Similipal Biosphere Reserve Thermal Hotspot',
    location: 'Similipal Core Zone, Mayurbhanj',
    coordinates: '21.8540°N · 86.3420°E',
    classification: 'WILDFIRE',
    severity: 'HIGH',
    confidence: '95% (High Conf)',
    source: 'NASA VIIRS / S-NPP I-band (375m)',
    provenance: 'OBSERVED',
    status: 'ACTIVE',
    riskScore: 74,
    formula: '0.40·frp + 0.30·dryness + 0.20·canopy + 0.10·wind = 0.74',
    reasons: [
      'Persistent thermal radiative power > 48 MW recorded over 3 consecutive passes',
      'Dry deciduous sal forest canopy with high fuel moisture deficit',
      'Proximity to tribal eco-settlement buffer zone requiring preventative containment',
    ],
    assets: [
      'Chahala Forest Range Quarters (1.8 km)',
      'Mayurbhanj District Fire Station Staging (14 km)',
      'Core Ecological Biodiversity Monitoring Post #7',
    ],
    telemetry: 'FRP: 48.6 MW · Brightness Temp: 348 K',
    secondaryMetric: 'Spread Rate: 0.8 km/h driven by westerly breezes',
    hazardType: 'wildfire',
    auditHash: '0x88f9104b20a77519e412089b0d1fa7e4483a991823fbd09419b48c3491ea7992',
  },
];

export default function HazardIntelligence({ onShowToast }: Props) {
  const [hazardFilter, setHazardFilter] = useState<'all' | 'cyclone' | 'flood' | 'wildfire'>('all');
  const [selectedSignalId, setSelectedSignalId] = useState<string>('EVT-2019-0002');
  const [search, setSearch] = useState('');
  const [runningEngine, setRunningEngine] = useState(false);
  const [latestRun, setLatestRun] = useState('1.18s');

  const filteredSignals = SIGNALS.filter(s => {
    if (hazardFilter !== 'all' && s.hazardType !== hazardFilter) return false;
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
      setLatestRun('0.94s');
      onShowToast('Universal Multi-Hazard Risk Pipeline complete: 39 coastal blocks scored and 42 strategic assets evaluated');
    }, 800);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-[#0a0d14] text-slate-900 dark:text-white p-6 space-y-6 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 font-bold uppercase mb-1 flex items-center gap-1.5">
            <Activity size={13} className="animate-pulse" />
            <span>IMD · MOSDAC · VIIRS · SATELLITE EXPOSURE CORE</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Hazard Intelligence Portal
          </h1>
          <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">
            Multi-hazard detection, footprint ingestion, spatial exposure and explainable risk heuristics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProvenancePill tag="HISTORICAL_REPLAY" />
          <button
            onClick={handleRunRiskEngine}
            disabled={runningEngine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Zap size={13} className={runningEngine ? 'animate-spin' : ''} />
            <span>{runningEngine ? 'Calculating...' : 'Execute Universal Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards inheriting FireSense design language */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Blocks"
          value={39}
          subtitle="Odisha Coastal & Basin Districts"
          provenance="CENSUS 2011"
        />
        <StatCard
          title="Ranking Coverage"
          value="100%"
          subtitle="Full Deterministic Explainability"
          provenance="MODEL ESTIMATE"
        />
        <StatCard
          title="Critical Priority Areas"
          value={6}
          subtitle="Immediate Pre-positioning Required"
          delta="+2 New"
          deltaType="negative"
          provenance="SURAKSHA HQ"
        />
        <StatCard
          title="Pipeline Execution"
          value={latestRun}
          subtitle="PostGIS Vector Intersections"
          delta="Optimized"
          deltaType="positive"
          provenance="LOCAL POSTGIS"
        />
      </div>

      {/* Hazard Class Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-white/40 uppercase mr-1">
            Hazard Mode:
          </span>
          <button
            onClick={() => setHazardFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              hazardFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#121622] text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:text-white'
            }`}
          >
            ALL HAZARDS (4)
          </button>
          <button
            onClick={() => setHazardFilter('cyclone')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              hazardFilter === 'cyclone'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#121622] text-purple-600 dark:text-purple-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Wind size={12} />
            <span>CYCLONE</span>
          </button>
          <button
            onClick={() => setHazardFilter('flood')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              hazardFilter === 'flood'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#121622] text-cyan-600 dark:text-cyan-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Waves size={12} />
            <span>FLOOD</span>
          </button>
          <button
            onClick={() => setHazardFilter('wildfire')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              hazardFilter === 'wildfire'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#121622] text-orange-600 dark:text-orange-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Flame size={12} />
            <span>WILDFIRE</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-white/40">
          SHOWING {filteredSignals.length} ACTIVE INTELLIGENCE FEEDS
        </div>
      </div>

      {/* Interactive Multi-Hazard GIS Map */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0e121b]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
              Interactive Geospatial Overlay Engine
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-white/40">
            <span>BAY OF BENGAL · 19.81°N, 85.83°E</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-bold hidden sm:inline">
              MAPLIBRE 4.7
            </span>
          </div>
        </div>

        <div className="h-[420px] w-full relative">
          <GISOverlayMap
            selectedBlockId="brahmagiri"
            filter={hazardFilter}
            highlightBrahmagiri={true}
          />
        </div>
      </div>

      {/* Intelligence Signals Carousel / Cards */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-white/50">
          Detected Multi-Hazard Signatures
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSignals.map(s => {
            const isSelected = selectedSignalId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSignalId(s.id)}
                className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/50 dark:bg-[#161c2a] border-blue-500 dark:border-blue-500 shadow-md ring-1 ring-blue-500'
                    : 'bg-white dark:bg-[#121622] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                      {s.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80">
                      {s.classification}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{s.title}</h3>
                  <div className="text-xs text-slate-500 dark:text-white/50 mt-0.5 truncate">{s.location}</div>
                </div>

                <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">SOURCE</div>
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-white/80 truncate max-w-[120px]">
                      {s.source}
                    </div>
                  </div>
                  <div className="text-right">
                    <RiskBadge score={s.riskScore} size="sm" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Intelligence Table & Search */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0e121b] flex-wrap gap-3">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
            Hazard Intelligence Ledger
          </span>

          <div className="relative min-w-[260px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by ID, hazard or location..."
              className="w-full bg-white dark:bg-[#181d2a] border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-[#0b0e14] text-slate-600 dark:text-white/40 border-b border-slate-200 dark:border-white/5">
              <tr>
                <th className="py-2.5 px-4 font-bold">EVENT ID</th>
                <th className="py-2.5 px-4 font-bold">HAZARD TITLE</th>
                <th className="py-2.5 px-4 font-bold">LOCATION / COORDS</th>
                <th className="py-2.5 px-4 font-bold">CLASSIFICATION</th>
                <th className="py-2.5 px-4 font-bold">PROVENANCE</th>
                <th className="py-2.5 px-4 font-bold text-right">RISK SCORE</th>
                <th className="py-2.5 px-4 font-bold text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredSignals.map(s => {
                const isSelected = selectedSignalId === s.id;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSignalId(s.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-300">{s.id}</td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">{s.title}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-white/60">
                      <div>{s.location}</div>
                      <div className="text-[10px] text-slate-400 dark:text-white/40">{s.coordinates}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white/80 font-bold">
                        {s.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ProvenancePill tag={s.provenance} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <RiskBadge score={s.riskScore} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedSignalId(s.id);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-bold"
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

      {/* Selected Hazard Intelligence Dossier */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider mb-1">
              OPERATIONAL INTELLIGENCE DOSSIER · {selectedSignal.id}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedSignal.title}</h2>
            <div className="text-xs text-slate-600 dark:text-white/60 font-mono mt-0.5">
              {selectedSignal.location} · Coordinates: {selectedSignal.coordinates}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-500 dark:text-white/40 uppercase">
              EXPLAINABLE RISK SCORE
            </div>
            <div className="text-2xl font-black font-mono text-red-500 dark:text-red-400">
              {selectedSignal.riskScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 max-w-sm truncate">{selectedSignal.formula}</div>
          </div>
        </div>

        {/* 3-Column Dossier Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {/* Col 1: Contributing Factors */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-600 dark:text-white/50 uppercase font-bold tracking-wider">
              DETERMINISTIC REASONS[]
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-white/80">
              {selectedSignal.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Critical Assets Exposed */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-600 dark:text-white/50 uppercase font-bold tracking-wider">
              CRITICAL ASSETS EXPOSED
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-white/80">
              {selectedSignal.assets.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">⚲</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Telemetry & Inundation */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-600 dark:text-white/50 uppercase font-bold tracking-wider">
              METEOROLOGICAL TELEMETRY
            </div>
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-[#0c1017] p-3 rounded-xl border border-slate-200 dark:border-white/5">
              <div className="text-slate-800 dark:text-white/80">{selectedSignal.telemetry}</div>
              <div className="text-cyan-600 dark:text-cyan-300 font-bold">{selectedSignal.secondaryMetric}</div>
              <div className="text-[10px] text-slate-500 dark:text-white/40">Sourced from {selectedSignal.source}</div>
            </div>
          </div>
        </div>

        {/* Reusable Immutable Consensus Audit Trail Block */}
        <AuditVerificationBlock
          hash={selectedSignal.auditHash}
          sourceAuthority="IMD Doppler Genesis Block & SURAKSHA Consensus"
          onVerify={() => onShowToast(`Audit Verified: SHA-256 genesis signature confirmed for ${selectedSignal.id}`)}
        />
      </div>
    </div>
  );
}
