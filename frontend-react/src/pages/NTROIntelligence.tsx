// ─────────────────────────────────────────────────────────────────────────────
// NTROIntelligence — NTRO analyst dashboard for thermal anomaly intelligence
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Search, Filter, Satellite, CheckCircle, AlertTriangle, Clock, Activity } from 'lucide-react';
import type { Incident, OverviewStats } from '../types';
import { getIncidents, getOverviewStats, submitAnalystVerification } from '../services/api';
import ProvenanceBadge from '../components/ui/ProvenanceBadge';
import RiskTierBadge from '../components/ui/RiskTierBadge';

const CATEGORY_FILTERS = ['all', 'industrial', 'illegal', 'wildfire', 'gas-flare', 'crop-burning'];

const RISK_COLOR = (score: number) => {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-green-400';
};

function MetricCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#161921] border border-white/10 rounded-lg px-4 py-3">
      <div className="text-white/40 text-xs font-mono uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
      {sub && <div className="text-white/30 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export default function NTROIntelligence() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [inc, ov] = await Promise.all([getIncidents(), getOverviewStats()]);
      setIncidents(inc);
      setOverview(ov);
      setSelectedId(inc[0]?.id ?? null);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = incidents.filter(i => {
    if (categoryFilter !== 'all' && i.classification.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${i.id} ${i.title} ${i.location_name} ${i.classification.label}`.toLowerCase().includes(q);
    }
    return true;
  });

  const selected = incidents.find(i => i.id === selectedId);

  async function handleVerify(status: string) {
    if (!selectedId) return;
    await submitAnalystVerification(selectedId, {
      status,
      notes: verifyNotes || 'Verified via NTRO Command Dashboard.',
      analystName: 'Analyst NTRO-08 (P. Rajput)',
    });
    const updated = await getIncidents();
    setIncidents(updated);
    setVerifyNotes('');
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/40 text-sm font-mono animate-pulse">Loading NTRO intelligence feed…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Overview metrics */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Hotspots Today" value={overview?.hotspots_today ?? 0} sub={`+${overview?.delta_yesterday ?? 0} vs yesterday`} color="text-orange-400" />
        <MetricCard label="Auto-Classified" value={`${overview?.classification_rate_pct ?? 0}%`} sub={`${overview?.auto_classified ?? 0} incidents`} color="text-emerald-400" />
        <MetricCard label="Critical Alerts" value={overview?.critical_alerts ?? 0} color="text-red-400" />
        <MetricCard label="Pending Review" value={overview?.pending_review ?? 0} color="text-amber-400" />
        <MetricCard label="Satellite Pass" value={overview?.satellite_pass_time_utc ?? '—'} sub="UTC" />
        <div className="bg-[#161921] border border-white/10 rounded-lg px-3 py-2.5 flex flex-col justify-between">
          <div className="text-white/40 text-xs font-mono uppercase tracking-wider">Sensor Fleet</div>
          {overview?.sensor_fleet.map((s: string) => (
            <div key={s} className="text-xs text-white/60 font-mono mt-1">{s}</div>
          ))}
          {overview?.is_demo_mode && <ProvenanceBadge tag="REPLAY" size="xs" className="mt-1.5" />}
        </div>
      </div>

      {/* Main: incident list + dossier */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Incident list */}
        <div className="w-80 flex-shrink-0 border-r border-white/10 flex flex-col">
          {/* Search + filters */}
          <div className="flex-shrink-0 px-3 py-3 border-b border-white/10 space-y-2">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2.5 py-1.5">
              <Search size={13} className="text-white/30" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setCategoryFilter(f)}
                  className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
                    categoryFilter === f
                      ? 'bg-white/15 text-white border-white/30'
                      : 'text-white/40 border-white/10 hover:text-white/70'
                  }`}
                >
                  {f === 'all' ? 'ALL' : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(inc => (
              <button
                key={inc.id}
                onClick={() => setSelectedId(inc.id)}
                className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors group ${
                  selectedId === inc.id ? 'bg-white/8 border-l-2 border-l-[#f4511e]' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-white/40 mb-0.5">{inc.id}</div>
                    <div className="text-sm text-white font-medium leading-snug truncate">{inc.title}</div>
                    <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                      <Satellite size={9} />
                      <span>{inc.satellite_source}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-sm font-mono font-bold ${RISK_COLOR(inc.risk.score)}`}>{inc.risk.score}</span>
                    <RiskTierBadge tier={inc.risk.tier} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    inc.analyst_verification.status === 'CONFIRMED' ? 'bg-emerald-950/60 text-emerald-400' :
                    inc.analyst_verification.status === 'UNVERIFIED' ? 'bg-amber-950/60 text-amber-400' :
                    'bg-slate-900 text-slate-400'
                  }`}>
                    {inc.analyst_verification.status}
                  </span>
                  <span className="text-[10px] text-white/30 truncate">{inc.location_name}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-white/30 text-sm">No incidents match filter</div>
            )}
          </div>
        </div>

        {/* RIGHT: Dossier */}
        {selected ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Dossier header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono text-white/40 mb-1">{selected.id} · {selected.location_name}</div>
                <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <RiskTierBadge tier={selected.risk.tier} />
                  <span className={`text-xl font-mono font-bold ${RISK_COLOR(selected.risk.score)}`}>
                    {selected.risk.score}<span className="text-white/30 text-sm">/100</span>
                  </span>
                  <ProvenanceBadge tag="MODEL_ESTIMATE" size="xs" />
                </div>
              </div>
              <div className="text-right text-xs text-white/40 font-mono">
                <div>{new Date(selected.timestamp_utc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                <div className="text-white/30">{selected.satellite_source}</div>
              </div>
            </div>

            {/* Evidence blocks in 2-col grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Block 1: Satellite Fields */}
              <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Satellite size={12} className="text-white/40" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Satellite Telemetry</h3>
                  <ProvenanceBadge tag="OBSERVED" size="xs" />
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  {[
                    ['FRP', `${selected.satellite.frp_mw} MW`],
                    ['Brightness Temp', `${selected.satellite.brightness_temp_c}°C`],
                    ['Confidence', `${selected.satellite.detection_confidence_pct}%`],
                    ['Instrument', selected.satellite.instrument],
                    ['Resolution', `${selected.satellite.track_m}m`],
                    ['Pass Type', selected.satellite.pass_type],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-white/30 font-mono">{k}</span>
                      <span className="text-white font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block 2: Classification */}
              <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={12} className="text-white/40" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Classification</h3>
                  <ProvenanceBadge tag="MODEL_ESTIMATE" size="xs" />
                </div>
                <div className="mb-2">
                  <div className="text-sm font-medium text-white">{selected.classification.label}</div>
                  <div className="text-xs text-white/40 font-mono mt-1">{selected.classification.model_version} · {selected.classification.confidence_pct}% confidence</div>
                </div>
                <div className="space-y-1.5">
                  {selected.classification.evidence.map((e: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-300/80">
                      <CheckCircle size={10} className="flex-shrink-0 mt-0.5" />
                      <span>{e}</span>
                    </div>
                  ))}
                  {selected.classification.counter_evidence.map((e: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-300/70">
                      <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block 3: Persistence */}
              <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={12} className="text-white/40" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Persistence ({selected.persistence.window_days}d)</h3>
                  <ProvenanceBadge tag="OBSERVED" size="xs" />
                </div>
                <div className="flex gap-0.5 mb-3 flex-wrap">
                  {selected.persistence.dot_history.map((active: boolean, i: number) => (
                    <span
                      key={i}
                      className={`w-3 h-3 rounded-sm ${active ? 'bg-orange-500' : 'bg-white/10'}`}
                      title={active ? 'Detection' : 'No detection'}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <div><span className="text-white/30">Observations</span><br/><span className="text-white font-medium">{selected.persistence.observations_in_window} / {selected.persistence.window_days}d</span></div>
                  <div><span className="text-white/30">Score</span><br/><span className="text-white font-medium">{selected.persistence.persistence_score_pct}%</span></div>
                  <div className="col-span-2"><span className="text-white/30">Normal Range</span><br/><span className="text-white font-medium">{selected.persistence.normal_seasonal_range}</span></div>
                </div>
                <div className="mt-2 text-xs text-amber-300/80 border-l-2 border-amber-500/50 pl-2">{selected.persistence.verdict}</div>
              </div>

              {/* Block 4: Geospatial + Risk */}
              <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Risk & Geospatial</h3>
                  <ProvenanceBadge tag="OBSERVED" size="xs" />
                </div>
                <div className="space-y-1.5 text-xs mb-3">
                  {[
                    ['Land Cover', selected.geospatial.land_cover_class],
                    ['Facility', selected.geospatial.facility_name],
                    ['Distance', `${selected.geospatial.distance_to_facility_m}m`],
                    ['Nearest Road', selected.geospatial.nearest_transport],
                    ['Wind Direction', `${selected.geospatial.surface_wind.direction} at ${selected.geospatial.surface_wind.speed_kmh} km/h`],
                    ['Threat Zone', selected.geospatial.surface_wind.impact_zone],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-white/30 w-24 flex-shrink-0">{k}</span>
                      <span className="text-white/80">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Risk factors */}
                <div className="space-y-1.5 mt-3 pt-3 border-t border-white/10">
                  {selected.risk.contributing_factors.map((f: { factor: string; impact: string; weight_pct: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-white/60 truncate flex-1">{f.factor}</span>
                      <span className={`font-mono font-bold flex-shrink-0 ${f.impact.startsWith('+') ? 'text-red-400' : 'text-emerald-400'}`}>{f.impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Analyst Verification */}
            <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Analyst Verification</h3>
                  <ProvenanceBadge tag="OBSERVED" size="xs" extraInfo="human review" />
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                  selected.analyst_verification.status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-400' :
                  selected.analyst_verification.status === 'UNVERIFIED' ? 'bg-amber-950 text-amber-400' :
                  'bg-slate-900 text-slate-400'
                }`}>
                  {selected.analyst_verification.status}
                </span>
              </div>

              {selected.analyst_verification.verified_by ? (
                <div className="space-y-1 text-sm mb-3">
                  <div className="text-white/60">Verified by: <span className="text-white">{selected.analyst_verification.verified_by}</span></div>
                  <div className="text-white/40 text-xs">{selected.analyst_verification.notes}</div>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-sm text-amber-300/70 mb-2">⚠ Pending analyst review.</p>
                  <textarea
                    value={verifyNotes}
                    onChange={e => setVerifyNotes(e.target.value)}
                    placeholder="Add verification notes..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify('CONFIRMED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-xs font-mono hover:bg-emerald-500/30 transition-colors"
                    >
                      <CheckCircle size={11} />
                      CONFIRM
                    </button>
                    <button
                      onClick={() => handleVerify('FLAGGED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-xs font-mono hover:bg-red-500/30 transition-colors"
                    >
                      <AlertTriangle size={11} />
                      FLAG
                    </button>
                  </div>
                </div>
              )}
              <div className="text-xs text-white/20 mt-2">
                🔒 Human analyst must authorize before any operational response is triggered.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Select an incident to view the evidence dossier
          </div>
        )}
      </div>
    </div>
  );
}
