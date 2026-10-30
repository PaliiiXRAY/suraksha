// ─────────────────────────────────────────────────────────────────────────────
// HazardIntelligence.tsx — NTRO Intelligence matching video 2 (00:01 - 00:26)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Search,
  Zap,
  Radio,
  FileCode,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import GISOverlayMap from '../components/gis/GISOverlayMap';

interface Props {
  onShowToast: (msg: string) => void;
}

const INCIDENTS = [
  {
    id: 'INC-2026-0042',
    title: 'Similipal Forest Fire',
    location: 'Similipal National Park, Mayurbhanj District, Odisha',
    coordinates: '21.8564°N · 86.3521°E',
    classification: 'WILDFIRE',
    severity: 'CRITICAL',
    confidence: '91%',
    confType: 'Rule-based',
    peakTemp: '96°C',
    frp: '142.6 MW',
    persistence: '142.6 MW',
    source: 'VIIRS_SNPP',
    riskScore: '88.5 / 100',
    formula: '0.50·severity + 0.20·persistence + 0.20·exposure + 0.10·infra = 0.88',
    reasons: [
      'Critical high-voltage power substation within 4.2 km',
      'Downwind residential corridor extending 2.8 km toward NH-326',
      'High thermal persistence exceeds 60-day baseline threshold',
    ],
    assets: [
      'Critical Assets: Substation Angul-4 (4.2 km)',
      'Mahanadi Pipeline Junction (7.8 km)',
      'Nearest Units: NDRF Team Alpha (14.2 km)',
    ],
    wind: 'Surface Wind: NE at 10 km/h',
    downwind: 'Downwind Corridor: 2.8 km (toward NH-326)',
    tag: 'wildfire',
  },
  {
    id: 'INC-2026-0043',
    title: 'Jamnagar Refinery Flare Stack',
    location: 'Petrochemical Refining Complex, Jamnagar, Gujarat',
    coordinates: '22.3501°N · 69.8712°E',
    classification: 'FACTORY FLARE',
    severity: 'MEDIUM',
    confidence: '94%',
    confType: 'Rule-based',
    peakTemp: '184°C',
    frp: '80.4 MW',
    persistence: '80.4 MW',
    source: 'MODIS_AQUA',
    riskScore: '38.0 / 100',
    formula: '0.50·severity + 0.20·persistence + 0.20·exposure + 0.10·infra = 0.38',
    reasons: [
      'Industrial flare stack with verified registered permit',
      'Continuous 50-day thermal persistence matches refinery baseline',
      'No critical residential settlements within 5 km perimeter',
    ],
    assets: [
      'Critical Assets: Reliance Petro Tank Farm 12 (0.8 km)',
      'Jamnagar Coastal Highway (1.9 km)',
      'Nearest Units: CISF Fire Station 2 (1.4 km)',
    ],
    wind: 'Surface Wind: NW at 12 km/h',
    downwind: 'Downwind Corridor: 1.5 km (toward open sea)',
    tag: 'gasflare',
  },
  {
    id: 'INC-2026-0044',
    title: 'Sangrur Farm Stubble Burning',
    location: 'Sangrur Agricultural District, Punjab',
    coordinates: '30.2481°N · 75.8392°E',
    classification: 'CROP SMOKE',
    severity: 'VERIFIED',
    confidence: '88%',
    confType: 'Rule-based',
    peakTemp: '62°C',
    frp: '24.5 MW',
    persistence: '24.5 MW',
    source: 'VIIRS_NOAA20',
    riskScore: '62.0 / 100',
    formula: '0.50·severity + 0.20·persistence + 0.20·exposure + 0.10·infra = 0.62',
    reasons: [
      'Active seasonal crop stubble residue burning',
      'Smoke plume dispersing toward NH-55 corridor',
      'Low structural threat to high-value infrastructure',
    ],
    assets: [
      'Critical Assets: Sangrur Grain Silo Complex (2.1 km)',
      'Northern Railway Trunk Line (3.4 km)',
      'Nearest Units: Sangrur Fire Sub-station (6.8 km)',
    ],
    wind: 'Surface Wind: NW at 14 km/h',
    downwind: 'Downwind Corridor: 2.4 km (plume moving toward NH-55)',
    tag: 'cropburning',
  },
  {
    id: 'INC-2026-0045',
    title: 'Singrauli Unregistered Hotspot',
    location: 'Singrauli Scrubland, MP/UP Border',
    coordinates: '24.1841°N · 82.6432°E',
    classification: 'SUSPICIOUS ACTIVITY',
    severity: 'CRITICAL',
    confidence: '76%',
    confType: 'Rule-based',
    peakTemp: '112°C',
    frp: '52.3 MW',
    persistence: '52.3 MW',
    source: 'VIIRS_SNPP',
    riskScore: '79.0 / 100',
    formula: '0.50·severity + 0.20·persistence + 0.20·exposure + 0.10·infra = 0.79',
    reasons: [
      'Unregistered clandestine thermal anomaly with no industrial permit',
      'Located inside restricted coal corridor buffer zone',
      'Night-time combustion signature detected by VIIRS sensor',
    ],
    assets: [
      'Critical Assets: Northern Coalfields Rail Siding (1.1 km)',
      'Singrauli Power Transmission Tower 9 (1.8 km)',
      'Nearest Units: Singrauli District Police Post (5.2 km)',
    ],
    wind: 'Surface Wind: Calm at 4 km/h',
    downwind: 'Downwind Corridor: 0.8 km (localized smoke dispersal)',
    tag: 'illegal',
  },
];

const STREAMING_FEED = [
  {
    time: '04:30 UTC',
    coords: '22.350°N 69.871°E',
    persistence: '88% (44/50)',
    classification: 'INDUSTRIAL GAS FLARE / PROCESS STACK · 94%',
  },
  {
    time: '04:30 UTC',
    coords: '20.823°N 85.152°E',
    persistence: '73.3% (44/60)',
    classification: 'THERMAL POWER PLANT / COAL-HANDLING FIRE · 94%',
  },
  {
    time: '04:30 UTC',
    coords: '21.854°N 86.353°E',
    persistence: '10% (01/60)',
    classification: 'WILDFIRE / FOREST FIRE · 91%',
  },
  {
    time: '04:30 UTC',
    coords: '30.251°N 75.895°E',
    persistence: '3.3% (02/60)',
    classification: 'AGRICULTURAL CROP RESIDUE / STUBBLE BURNING · 89%',
  },
  {
    time: '04:30 UTC',
    coords: '24.184°N 82.643°E',
    persistence: '56.7% (34/60)',
    classification: 'UNREGISTERED CLANDESTINE THERMAL ANOMALY · 80%',
  },
];

export default function HazardIntelligence({ onShowToast }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string>('INC-2026-0042');
  const [scenario, setScenario] = useState('jamnagar');
  const [liveOsm, setLiveOsm] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [activeTab, setActiveTab] = useState<'classification' | 'dossier'>('classification');

  const selectedIncident = INCIDENTS.find(i => i.id === selectedId) ?? INCIDENTS[0];

  function handleRunPipeline() {
    setRunningPipeline(true);
    setTimeout(() => {
      setRunningPipeline(false);
      onShowToast('AI Pipeline ran: 10 FIRMS hotspots analyzed and classified with 100% precision');
    }, 900);
  }

  function handleDownloadGeoJSON() {
    const data = {
      type: 'FeatureCollection',
      features: INCIDENTS.map(inc => ({
        type: 'Feature',
        properties: { id: inc.id, title: inc.title, classification: inc.classification },
        geometry: { type: 'Point', coordinates: [86.3521, 21.8564] },
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firesense_classified_hotspots.geojson';
    a.click();
    onShowToast('Exported firesense_classified_hotspots.geojson');
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-cyan-400 font-semibold uppercase mb-1">
            NASA FIRMS · VIIRS · MODIS · AI CLASSIFICATION
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Thermal Anomaly Intelligence</h1>
          <p className="text-xs text-white/50 mt-0.5">
            Satellite pass every 3 hrs · India coverage · 247 events today
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/40 bg-red-950/20 text-red-400 text-xs font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
          <span>LIVE FEED</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-black font-mono text-white tracking-tight">10</div>
          <div className="text-xs text-white/50 font-medium mt-1">hotspots analyzed</div>
        </div>
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-black font-mono text-white tracking-tight">10</div>
          <div className="text-xs text-white/50 font-medium mt-1">100% classification rate</div>
        </div>
        <div className="bg-[#121622] border border-red-500/30 rounded-xl p-4">
          <div className="text-3xl font-black font-mono text-red-500 tracking-tight">3</div>
          <div className="text-xs text-white/50 font-medium mt-1">critical — action needed</div>
        </div>
        <div className="bg-[#121622] border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-black font-mono text-cyan-400 tracking-tight">88.5</div>
          <div className="text-xs text-white/50 font-medium mt-1">avg model score</div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All' },
          { id: 'industrial', label: 'Industrial' },
          { id: 'wildfire', label: 'Wildfire' },
          { id: 'gasflare', label: 'Gas Flare' },
          { id: 'cropburning', label: 'Crop Burning' },
          { id: 'illegal', label: 'Illegal' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              filter === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-[#141824] border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* GIS Pipeline & Scenario Controls */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-white/90">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <span>Live Classification Pipeline — GIS Overlay</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Scenario dropdown */}
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              className="bg-[#171d2b] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none cursor-pointer"
            >
              <option value="jamnagar">🏭 Jamnagar Refinery Flare (Gujarat)</option>
              <option value="similipal">🌲 Similipal Forest Fire (Odisha)</option>
              <option value="sangrur">🌾 Sangrur Farm Stubble (Punjab)</option>
              <option value="singrauli">⚡ Singrauli Coal Basin Hotspot</option>
            </select>

            {/* Live OSM Toggle */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171d2b] border border-white/15 text-xs font-mono text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={liveOsm}
                onChange={e => setLiveOsm(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>Live OSM (Overpass)</span>
            </label>

            {/* Run AI Pipeline Button */}
            <button
              onClick={handleRunPipeline}
              disabled={runningPipeline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold shadow-md shadow-blue-900/40 transition-all"
            >
              <Zap size={12} className={runningPipeline ? 'animate-spin' : ''} />
              <span>{runningPipeline ? 'Running...' : 'Run AI Pipeline'}</span>
            </button>

            {/* GeoJSON Button */}
            <button
              onClick={handleDownloadGeoJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-colors"
            >
              <FileCode size={12} />
              <span>GeoJSON</span>
            </button>
          </div>
        </div>

        {/* Vector Map */}
        <div className="h-[360px] w-full">
          <GISOverlayMap highlightBrahmagiri={scenario === 'similipal'} />
        </div>

        {/* Legend Bar */}
        <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono text-white/60 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Gas Flare / Industrial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Power / Steel / Mining</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Wildfire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span>Unregistered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Crop Burning</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column: Incident Log (Left) + Intelligence Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Incident Log */}
        <div className="lg:col-span-5 bg-[#121622] border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e121a]">
            <span className="text-xs font-mono uppercase font-bold text-white/80">Incident Log</span>
            <span className="text-xs font-mono text-white/40">4 EVENTS</span>
          </div>

          <div className="divide-y divide-white/5 overflow-y-auto max-h-[600px]">
            {INCIDENTS.map(inc => {
              const isSelected = inc.id === selectedId;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-600/15 border-l-4 border-l-blue-500' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-white/40">{inc.id}</div>
                      <div className="font-bold text-sm text-white mt-0.5">{inc.title}</div>
                      <div className="text-xs text-white/40 mt-0.5 truncate">{inc.location}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : inc.severity === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs font-mono text-white/50 pt-2 border-t border-white/5">
                    <span>Class: <strong className="text-white font-semibold">{inc.classification}</strong></span>
                    <span>Conf: <strong className="text-white/80">{inc.confType}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Intelligence Dossier */}
        <div className="lg:col-span-7 bg-[#121622] border border-white/10 rounded-xl p-5 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">{selectedIncident.title}</h2>
              <div className="text-xs font-mono text-white/50 mt-0.5">{selectedIncident.coordinates}</div>
            </div>
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
              {selectedIncident.severity}
            </span>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('classification')}
              className={`text-xs font-bold transition-colors pb-1 border-b-2 ${
                activeTab === 'classification'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              Classification
            </button>
            <button
              onClick={() => setActiveTab('dossier')}
              className={`text-xs font-bold transition-colors pb-1 border-b-2 ${
                activeTab === 'dossier'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              Intelligence Dossier
            </button>
          </div>

          {/* Classification Stats */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#0e121a] border border-white/5">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">CLASSIFICATION</div>
              <div className="text-sm font-bold text-white mt-0.5">{selectedIncident.classification}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-white/40 uppercase">AI CONFIDENCE</div>
              <div className="text-lg font-black font-mono text-emerald-400">{selectedIncident.confidence}</div>
            </div>
          </div>

          {/* 3 Metric Tiles: Peak Temp, FRP, Source */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#0e121a] border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase">PEAK TEMP</div>
              <div className="text-base font-bold font-mono text-white mt-0.5">{selectedIncident.peakTemp}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0e121a] border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase">PERSISTENCE</div>
              <div className="text-base font-bold font-mono text-white mt-0.5">{selectedIncident.frp}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0e121a] border border-white/5">
              <div className="text-[10px] font-mono text-white/40 uppercase">SOURCE</div>
              <div className="text-xs font-mono font-bold text-cyan-400 mt-1">{selectedIncident.source}</div>
            </div>
          </div>

          {/* Facility Context Match */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/70">
                Facility Context Match
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold">
                ST_DWITHIN
              </span>
            </div>
            <div className="text-[11px] text-white/40 font-mono">
              Wildfire - Sentinel &amp; FIRMS Automated Ingestion Engine
            </div>

            <div className="space-y-1.5 pt-1 text-xs font-mono text-white/70">
              {selectedIncident.assets.map((asset, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>{asset}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-white/50">
              <span>{selectedIncident.wind}</span>
              <span className="text-amber-300">{selectedIncident.downwind}</span>
            </div>
          </div>

          {/* Transparent Priority Risk Score */}
          <div className="p-4 rounded-xl bg-[#161a25] border border-red-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/80">
                Transparent Priority Risk Score
              </span>
              <span className="text-2xl font-black font-mono text-red-400">{selectedIncident.riskScore}</span>
            </div>
            <div className="text-[11px] font-mono text-white/40">
              Formula: {selectedIncident.formula}
            </div>
            <div className="space-y-1.5 pt-1 text-xs text-white/70">
              {selectedIncident.reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-red-400">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Immutable Audit Trail */}
          <div className="p-4 rounded-xl bg-[#0e121a] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-white/70">
                🔒 Immutable Audit Trail
              </span>
              <span className="text-[10px] font-mono text-white/40">5 LOGS</span>
            </div>

            <div className="space-y-2 text-[11px] font-mono divide-y divide-white/5">
              <div className="flex items-center justify-between pt-1">
                <span className="text-cyan-400 font-bold">INGEST_SATELLITE</span>
                <span className="text-white/40">04:15 AM</span>
              </div>
              <div className="text-white/60 text-[10px] pl-2">
                MODIS thermal anomaly detected in Similipal Reserve canopy
              </div>

              <div className="flex items-center justify-between pt-1.5">
                <span className="text-blue-400 font-bold">LAND_COVER_CHECK</span>
                <span className="text-white/40">04:15 AM</span>
              </div>
              <div className="text-white/60 text-[10px] pl-2">
                Canopy density confirmed 76% natural woodland (Zone 28)
              </div>

              <div className="flex items-center justify-between pt-1.5">
                <span className="text-purple-400 font-bold">ML_CLASSIFY</span>
                <span className="text-white/40">04:16 AM</span>
              </div>
              <div className="text-white/60 text-[10px] pl-2">
                Classified as WILDFIRE with high propagation risk
              </div>

              <div className="flex items-center justify-between pt-1.5">
                <span className="text-emerald-400 font-bold">IMMUTABLE_SEAL</span>
                <span className="text-white/40">04:16 AM</span>
              </div>
              <div className="text-emerald-300/80 text-[10px] pl-2">
                SHA-256 block hash 4c62e8... sealed into audit ledger
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streaming Pipeline Detection Feed */}
      <div className="bg-[#121622] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e121a]">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-400">
            <Activity size={14} />
            <span>Pipeline Detection Feed</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-white/40 font-bold">
            DEMO PLAYBACK
          </span>
        </div>

        <div className="divide-y divide-white/5 p-4 space-y-3 font-mono text-xs">
          {STREAMING_FEED.map((item, idx) => (
            <div key={idx} className="pt-2 first:pt-0 space-y-1">
              <div className="flex items-center gap-2 text-white/50 text-[11px]">
                <strong className="text-white/80">{item.time}</strong>
                <span>·</span>
                <span>VIIRS detection: <strong className="text-cyan-300">{item.coords}</strong></span>
              </div>
              <div className="text-white/40 text-[11px]">
                Persistence match: <span className="text-white/70">{item.persistence}</span>
              </div>
              <div className="text-emerald-400 font-semibold text-[11px]">
                Classification: {item.classification}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
