// ─────────────────────────────────────────────────────────────────────────────
// HazardIntelligence.tsx — Portal 1: Hazard Intelligence Portal
// Exact FireSense visual design reference inheritance (Cards, Header, 35/65 Split, Table)
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
  Download,
  ExternalLink,
} from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';
import AuditVerificationBlock from '../components/design-system/AuditVerificationBlock';

interface Props {
  onShowToast: (msg: string) => void;
}

interface IncidentSignal {
  id: string;
  title: string;
  location: string;
  state: string;
  coordinates: string;
  classification: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  confidence: string;
  source: string;
  provenance: string;
  status: 'NEW' | 'VERIFIED';
  riskScore: number;
  formula: string;
  reasons: string[];
  assets: string[];
  peakMetric: string;
  persistenceMetric: string;
  nearestUnit: string;
  hazardType: 'cyclone' | 'flood' | 'wildfire';
  auditHash: string;
}

const SIGNALS: IncidentSignal[] = [
  {
    id: 'INC-2019-0042',
    title: 'Cyclone Fani Eyewall Landfall',
    location: 'Puri Coastal Sector',
    state: 'Odisha',
    coordinates: '19.8135°N • 85.8315°E',
    classification: 'CYCLONE',
    severity: 'CRITICAL',
    confidence: '95% (IMD Doppler)',
    source: 'IMD Doppler Radar Paradip',
    provenance: 'OFFICIAL_FORECAST',
    status: 'NEW',
    riskScore: 92.0,
    formula: '0.30·wind + 0.20·rain + 0.20·pop + 0.15·surge + 0.10·infra = 92.0',
    reasons: [
      'Extremely Severe Cyclonic Storm with sustained winds 215 km/h (gusts 240 km/h)',
      'Direct coastal eye landfall projected within 35 km radius of Puri town',
      'High-risk surge inundation corridor overlapping dense coastal settlements',
    ],
    assets: ['Puri District Headquarters Hospital (0.8 km)', 'Jagannath Temple Evacuation Complex (1.2 km)', 'Pipili Substation 132kV (4.2 km)'],
    peakMetric: '215 km/h',
    persistenceMetric: 'Cat 4 Equivalent',
    nearestUnit: 'NDRF Battalion 03 (Mundali)',
    hazardType: 'cyclone',
    auditHash: '0x9d4a77e1c8b32095f612089b0d1fa7e4483a991823fbd09419b48c3491ea7011',
  },
  {
    id: 'INC-2019-0043',
    title: 'Brahmagiri Storm Surge Inundation',
    location: 'Brahmagiri Block, Chilika Coast',
    state: 'Odisha',
    coordinates: '19.7991°N • 85.8239°E',
    classification: 'STORM SURGE',
    severity: 'CRITICAL',
    confidence: '89%',
    source: 'ISRO MOSDAC Satellite Telemetry',
    provenance: 'MODEL_ESTIMATE',
    status: 'NEW',
    riskScore: 87.0,
    formula: '0.35·surge + 0.25·pop + 0.20·infra + 0.20·saline = 87.0',
    reasons: [
      'Low-lying coastal spit adjacent to Chilika lagoon vulnerable to sea water ingress',
      'Estimated 118,000 population in storm surge swath requiring immediate evacuation',
      'Marine Drive road corridor cut off by projected 1.8m surge flood',
    ],
    assets: ['Brahmagiri Community Health Centre (1.4 km)', 'Marine Drive Culvert 14 (0.6 km)', 'Satapada Ferry Terminal (5.2 km)'],
    peakMetric: '1.8m Surge',
    persistenceMetric: '195 km/h Wind',
    nearestUnit: 'ODRAF Unit 2 (Puri)',
    hazardType: 'cyclone',
    auditHash: '0x3f12a804c7d956e1b89945112eaf7392d4710bb81a9420084c7e6512ba3098f1',
  },
  {
    id: 'INC-2019-0044',
    title: 'Mahanadi Basin Flash Inundation',
    location: 'Erasama, Jagatsinghpur District',
    state: 'Odisha',
    coordinates: '20.0028°N • 86.4251°E',
    classification: 'FLOOD',
    severity: 'HIGH',
    confidence: '84%',
    source: 'CWC Hydrological Model & Bhuvan',
    provenance: 'MODEL_ESTIMATE',
    status: 'NEW',
    riskScore: 79.0,
    formula: '0.40·rainfall + 0.30·backflow + 0.20·pop + 0.10·embankment = 79.0',
    reasons: [
      'Coastal delta zone exposed to combined tidal surge and Mahanadi backflow',
      '142,000 residents in unreinforced dwellings in direct hazard path',
      'Critical bridge culvert on SH-12 at risk of scouring',
    ],
    assets: ['Erasama Multipurpose Cyclone Shelter (0.5 km)', 'Paradip Port Feeder Pipeline (3.8 km)', 'Coastal Embankment #4 (1.1 km)'],
    peakMetric: '340mm Rain',
    persistenceMetric: '1.2m Depth',
    nearestUnit: 'ODRAF Unit 3 (Cuttack)',
    hazardType: 'flood',
    auditHash: '0x71e84a29c0182745ba6110f29cdae8503810f639908127346b9a89104f291077',
  },
  {
    id: 'INC-2024-0045',
    title: 'Similipal Biosphere Reserve Thermal Hotspot',
    location: 'Similipal National Park, Mayurbhanj District',
    state: 'Odisha',
    coordinates: '21.8540°N • 86.3520°E',
    classification: 'WILDFIRE',
    severity: 'MEDIUM',
    confidence: '91% (Rule-based)',
    source: 'NASA VIIRS_SNPP (375m)',
    provenance: 'OBSERVED',
    status: 'VERIFIED',
    riskScore: 68.5,
    formula: '0.40·frp + 0.30·dryness + 0.20·canopy + 0.10·wind = 68.5',
    reasons: [
      'Thermal Radiative Power of 142.6 MW confirmed on consecutive VIIRS overpasses',
      'Dry deciduous sal forest canopy with high fuel moisture deficit',
      'Proximity to tribal eco-settlement buffer zone requiring containment',
    ],
    assets: ['Chahala Forest Range Quarters (1.8 km)', 'Mayurbhanj District Fire Station (14 km)', 'Substation Angul-4 (4.2 km)'],
    peakMetric: '96°C Temp',
    persistenceMetric: '142.6 MW',
    nearestUnit: 'NDRF Team Alpha (14.2 km)',
    hazardType: 'wildfire',
    auditHash: '0x15b7c89920dfa74129b05781a541094892c908123e4758129a0081249b6184aa',
  },
];

export default function HazardIntelligence({ onShowToast }: Props) {
  const [hazardFilter, setHazardFilter] = useState<'all' | 'cyclone' | 'flood' | 'wildfire'>('all');
  const [selectedSignalId, setSelectedSignalId] = useState<string>('INC-2019-0042');
  const [search, setSearch] = useState('');
  const [activeDossierTab, setActiveDossierTab] = useState<'classification' | 'dossier'>('classification');
  const [runningPipeline, setRunningPipeline] = useState(false);

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

  function handleRunPipeline() {
    setRunningPipeline(true);
    setTimeout(() => {
      setRunningPipeline(false);
      onShowToast('Multi-Hazard AI Classification Pipeline executed successfully (100% evaluated)');
    }, 800);
  }

  return (
    <div className="space-y-6">
      {/* 1. FireSense Reference Header Card with Satellite Background Banner */}
      <div
        className="rounded-2xl border border-slate-200/90 dark:border-white/10 p-7 shadow-md flex items-center justify-between flex-wrap gap-4 relative overflow-hidden text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.80) 50%, rgba(15,23,42,0.45) 100%), url('/media/hero_india_night.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="z-10 max-w-2xl">
          <div className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase mb-1 flex items-center gap-2">
            <span>NASA FIRMS • IMD • MOSDAC • AI CLASSIFICATION</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Hazard & Thermal Anomaly Intelligence
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Satellite pass every 3 hrs • Odisha coastal coverage • 39 sectors analyzed today
          </p>
        </div>

        <div className="z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono bg-red-950/60 backdrop-blur-md text-red-300 border border-red-500/40 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>LIVE REPLAY FEED</span>
          </span>
        </div>
      </div>

      {/* 2. FireSense Horizontal Summary Metrics Strip */}
      <div className="bg-white dark:bg-[#121622] rounded-xl border border-slate-200/90 dark:border-white/10 p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/10 gap-3 sm:gap-0">
        <div className="px-4 py-1 flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">39</span>
          <span className="text-xs text-slate-500 dark:text-white/60">sectors analyzed</span>
        </div>
        <div className="px-4 py-1 flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">100%</span>
          <span className="text-xs text-slate-500 dark:text-white/60">classification rate</span>
        </div>
        <div className="px-4 py-1 flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-red-600 dark:text-red-400">6</span>
          <span className="text-xs text-slate-500 dark:text-white/60">critical — action needed</span>
        </div>
        <div className="px-4 py-1 flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">1.18s</span>
          <span className="text-xs text-slate-500 dark:text-white/60">avg model score latency</span>
        </div>
      </div>

      {/* 3. FireSense Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setHazardFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            hazardFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'
          }`}
        >
          All (4)
        </button>
        <button
          onClick={() => setHazardFilter('cyclone')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            hazardFilter === 'cyclone'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'
          }`}
        >
          Cyclone
        </button>
        <button
          onClick={() => setHazardFilter('flood')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            hazardFilter === 'flood'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'
          }`}
        >
          Flood
        </button>
        <button
          onClick={() => setHazardFilter('wildfire')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            hazardFilter === 'wildfire'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'
          }`}
        >
          Wildfire
        </button>
      </div>

      {/* 4. FireSense GIS Classification Pipeline Card */}
      <div className="bg-white dark:bg-[#121622] rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        {/* Card Toolbar matching FireSense */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 dark:text-white">
            <span className="text-blue-600 text-sm">🎯</span>
            <span>Live Classification Pipeline — GIS Overlay</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              className="bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-white focus:outline-none"
              defaultValue="cyclone"
            >
              <option value="cyclone">🌪️ Cyclone Fani Replay (Odisha)</option>
              <option value="flood">🌊 Mahanadi Delta Inundation (Jagatsinghpur)</option>
              <option value="wildfire">🔥 Similipal Biosphere Reserve (Mayurbhanj)</option>
              <option value="flare">🏭 Jamnagar Petrochemical Flare</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-white/70 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
              <span>Live OSM (Overpass)</span>
            </label>

            <button
              onClick={handleRunPipeline}
              disabled={runningPipeline}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Zap size={13} className={runningPipeline ? 'animate-spin' : ''} />
              <span>{runningPipeline ? 'Evaluating...' : 'Run AI Pipeline'}</span>
            </button>

            <button
              onClick={() => onShowToast('Exported geojson layers for GIS integration')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download size={13} />
              <span>GeoJSON</span>
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-[380px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative">
          <GISOverlayMap selectedBlockId="brahmagiri" filter={hazardFilter} />
        </div>

        {/* Map Legend matching FireSense bottom bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-white/60 pt-1 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Cyclone Eye / Gale Swath
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Flood Inundation Zone
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Thermal Hotspot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Verified Safe Route
          </span>
        </div>
      </div>

      {/* 5. FireSense Exact 35/65 Split: Incident Log (Left) vs Selected Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (35%): Incident Log */}
        <div className="lg:col-span-4 bg-white dark:bg-[#121622] rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-black text-slate-900 dark:text-white">
              Incident Log
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {filteredSignals.length} events
            </span>
          </div>

          <div className="space-y-3">
            {filteredSignals.map(s => {
              const isSelected = selectedSignalId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSignalId(s.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-600/10 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-blue-700 dark:text-blue-400">
                      {s.id}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-black font-mono text-white shadow-sm ${
                        s.severity === 'CRITICAL'
                          ? 'bg-red-600'
                          : s.severity === 'HIGH'
                          ? 'bg-amber-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {s.severity}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{s.title}</h3>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{s.location}</div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-white/5 text-xs font-mono text-slate-700 dark:text-slate-300">
                    <span>Class: <strong className="text-slate-950 dark:text-white font-black">{s.classification}</strong></span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-black border border-slate-300 dark:border-white/15">
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (65%): Detailed Intelligence Dossier */}
        <div className="lg:col-span-8 bg-white dark:bg-[#121622] rounded-2xl border border-slate-200/90 dark:border-white/10 p-6 shadow-sm space-y-5">
          {/* Sector Preview Banner with Photograph matching Screenshot 110143 */}
          <div
            className="p-6 rounded-2xl shadow-lg min-h-[175px] flex flex-col justify-between relative overflow-hidden border-2 border-slate-700 bg-slate-950"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(10, 15, 25, 0.85) 0%, rgba(10, 15, 25, 0.25) 55%, rgba(0, 0, 0, 0) 100%), url('/media/sector_detail_bg.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="flex items-center justify-between z-10">
              <span
                className="px-3 py-1 rounded-lg text-xs font-mono font-black tracking-wider uppercase border border-white/30 backdrop-blur-md shadow-md"
                style={{ color: '#ffffff', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
              >
                REGISTERED SECTOR · {selectedSignal.location}, {selectedSignal.state}
              </span>
              <span
                className="px-3.5 py-1 rounded-lg text-xs font-black font-mono shadow-md uppercase tracking-wider"
                style={{
                  color: '#ffffff',
                  backgroundColor:
                    selectedSignal.severity === 'CRITICAL'
                      ? '#dc2626'
                      : selectedSignal.severity === 'HIGH'
                      ? '#d97706'
                      : '#2563eb',
                }}
              >
                {selectedSignal.severity}
              </span>
            </div>

            <div className="pt-4 z-10">
              <h2
                className="text-2xl font-black tracking-tight"
                style={{ color: '#ffffff', textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {selectedSignal.title}
              </h2>
              <div
                className="text-xs font-mono font-bold mt-1 tracking-wide"
                style={{ color: '#38bdf8', textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
              >
                {selectedSignal.coordinates}
              </div>
            </div>
          </div>

          {/* Sub-tabs: Classification | Intelligence Dossier */}
          <div className="flex items-center gap-6 border-b border-slate-200 dark:border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveDossierTab('classification')}
              className={`pb-2.5 transition-all flex items-center gap-1.5 ${
                activeDossierTab === 'classification'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-white/50'
              }`}
            >
              <span>Classification</span>
            </button>
            <button
              onClick={() => setActiveDossierTab('dossier')}
              className={`pb-2.5 transition-all flex items-center gap-1.5 ${
                activeDossierTab === 'dossier'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-white/50'
              }`}
            >
              <span>Intelligence Dossier</span>
            </button>
          </div>

          {/* Dossier Body Content */}
          <div className="space-y-4">
            {/* Classification & AI Confidence */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">CLASSIFICATION</div>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {selectedSignal.classification}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">AI CONFIDENCE</div>
                <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {selectedSignal.confidence}
                </div>
              </div>
            </div>

            {/* 3-Column Metric Strip matching Reference */}
            <div className="grid grid-cols-3 gap-3 bg-slate-100/80 dark:bg-[#181d2a] p-4 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-mono">
              <div>
                <div className="text-xs text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">PEAK INTENSITY</div>
                <div className="font-black text-slate-900 dark:text-white text-sm mt-1">{selectedSignal.peakMetric}</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">PERSISTENCE / SCALE</div>
                <div className="font-black text-slate-900 dark:text-white text-sm mt-1">{selectedSignal.persistenceMetric}</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">DATA SOURCE</div>
                <div className="font-black text-slate-900 dark:text-white text-sm mt-1 truncate">{selectedSignal.source}</div>
              </div>
            </div>

            {/* Facility Context Match Box */}
            <div className="bg-slate-100/70 dark:bg-[#181d2a] p-4 rounded-xl border border-slate-300 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-white/70">
                <span className="font-bold uppercase tracking-wider">POSTGIS GEOSPATIAL PROXIMITY</span>
                <span className="text-blue-700 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded">ST_DWITHIN</span>
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-bold w-28 flex-shrink-0">Critical Assets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSignal.assets.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-mono font-semibold border border-slate-300 dark:border-white/15">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-bold w-28 flex-shrink-0">Nearest Units:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold border border-emerald-300 dark:border-emerald-700">
                    {selectedSignal.nearestUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Risk Score Gauge */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                Transparent Priority Risk Score
              </span>
              <span className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
                {selectedSignal.riskScore} / 100
              </span>
            </div>

            {/* Consensus Audit Trail */}
            <AuditVerificationBlock
              hash={selectedSignal.auditHash}
              sourceAuthority="IMD Doppler Genesis Block & SURAKSHA Consensus"
              onVerify={() => onShowToast(`Audit Verified: Consensus confirmed for ${selectedSignal.id}`)}
            />
          </div>
        </div>
      </div>

      {/* 6. FireSense Incident Intelligence Table */}
      <div className="bg-white dark:bg-[#121622] rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-white">
            <span className="text-blue-600 text-sm">📋</span>
            <span>Incident Intelligence Table</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ID, place, class..."
                className="bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none w-48 sm:w-64"
              />
            </div>
            <select className="bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-white font-mono">
              <option>ALL STATUSES</option>
              <option>CRITICAL ONLY</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border-b-2 border-slate-300 dark:border-white/10 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white">ID</th>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white">LOCATION</th>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white">CLASSIFICATION</th>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white text-right">RISK</th>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white text-center">STATUS</th>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white">CONFIDENCE</th>
                <th className="py-3 px-3.5 font-black text-slate-900 dark:text-white text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filteredSignals.map(s => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSignalId(s.id)}
                  className="hover:bg-slate-100/70 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-3.5 font-black text-blue-700 dark:text-blue-400">{s.id}</td>
                  <td className="py-3.5 px-3.5 font-bold text-slate-900 dark:text-white font-sans">{s.location}</td>
                  <td className="py-3.5 px-3.5 font-extrabold text-slate-900 dark:text-white">{s.classification}</td>
                  <td className="py-3.5 px-3.5 text-right font-black text-red-600 dark:text-red-400 text-sm">{s.riskScore}</td>
                  <td className="py-3.5 px-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-black border border-slate-300 dark:border-white/15">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">{s.confidence}</td>
                  <td className="py-3.5 px-3.5 text-right">
                    <button className="text-blue-700 dark:text-blue-400 font-black hover:underline">
                      Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
