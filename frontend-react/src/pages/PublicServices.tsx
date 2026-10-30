// ─────────────────────────────────────────────────────────────────────────────
// PublicServices — citizen-facing alerts and safety guidance
// No model scores, no ML evidence — plain language only
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { AlertTriangle, Home, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { getPublicAlerts, getWarnings } from '../services/api';
import ProvenanceBadge from '../components/ui/ProvenanceBadge';

const SHELTER_LOCATIONS = [
  { name: 'Puri Town Cyclone Shelter C1', dist: '2.4 km', direction: 'N', capacity: 2000 },
  { name: 'Puri Govt School Shelter', dist: '3.1 km', direction: 'NW', capacity: 1500 },
  { name: 'Konark Block Office Shelter', dist: '8.6 km', direction: 'NE', capacity: 3000 },
];

const HELPLINES = [
  { name: 'NDRF Emergency', number: '9711077372' },
  { name: 'ODISHA SDRF', number: '0674-2534177' },
  { name: 'District Collector (Puri)', number: '06752-222520' },
  { name: 'National Emergency', number: '112' },
];

export default function PublicServices() {
  const [alerts, setAlerts] = useState<{ alerts: Array<{ id: string; message: string; is_simulated: boolean; severity: string; alert_type: string }> } | null>(null);
  const warnings = getWarnings();

  useEffect(() => {
    getPublicAlerts().then(setAlerts);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f1117]">
      {/* Simulated notice */}
      <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>REPLAY SCENARIO:</strong> All alerts shown are from the Cyclone Fani 2019 historical replay.
          Not connected to any live emergency system. Never substitute this demonstration for official warnings.
        </span>
      </div>

      {/* Active warning */}
      <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-sm font-bold text-red-300 uppercase tracking-wider">Active Cyclone Warning</h2>
          <ProvenanceBadge tag="OFFICIAL_FORECAST" size="xs" className="ml-auto" />
        </div>
        <p className="text-sm text-white/80 leading-relaxed mb-3">{warnings[0]?.message}</p>
        <div className="text-xs text-white/40 font-mono">
          Source: {warnings[0]?.issued_by} · {new Date(warnings[0]?.issued_at ?? '').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </div>
      </div>

      {/* Immediate guidance */}
      <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={13} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">What You Should Do Right Now</h2>
        </div>
        <div className="space-y-2">
          {[
            'Move immediately to the nearest government cyclone shelter — listed below.',
            'Carry only essential documents, medicines, and water for 3 days.',
            'Do NOT enter the sea, river banks, or low-lying coastal areas.',
            'Switch off electrical mains before leaving your home.',
            'Stay tuned to All India Radio / Doordarshan for official updates.',
            'Check on elderly neighbours and those with disabilities — assist their evacuation.',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <span className="flex-shrink-0 w-5 h-5 bg-[#f4511e]/20 text-[#f4511e] rounded text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-white/80 leading-snug">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nearest shelters */}
        <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home size={13} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Nearest Shelters</h2>
            <ProvenanceBadge tag="OBSERVED" size="xs" className="ml-auto" />
          </div>
          <div className="space-y-3">
            {SHELTER_LOCATIONS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/30 rounded flex items-center justify-center flex-shrink-0">
                  <Home size={12} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{s.name}</div>
                  <div className="text-xs text-white/40 font-mono">{s.dist} {s.direction} · Capacity {s.capacity.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/30">
                  <MapPin size={9} />
                  <span>{s.direction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency helplines */}
        <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone size={13} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Emergency Helplines</h2>
            <ProvenanceBadge tag="OBSERVED" size="xs" className="ml-auto" />
          </div>
          <div className="space-y-3">
            {HELPLINES.map((h, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="text-sm text-white/70">{h.name}</div>
                <a
                  href={`tel:${h.number}`}
                  className="font-mono font-bold text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
                >
                  {h.number}
                </a>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <a
              href="tel:112"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Phone size={14} />
              SOS — DIAL 112
            </a>
          </div>
        </div>
      </div>

      {/* Public alerts from API */}
      {alerts && alerts.alerts.length > 0 && (
        <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">System Alerts</h2>
          {alerts.alerts.map(a => (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white/70">{a.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <ProvenanceBadge tag="REPLAY" size="xs" />
                  {a.is_simulated && (
                    <span className="text-[10px] text-rose-400 font-mono">SIMULATED</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="mt-2 text-xs text-white/20">{alerts && (alerts as { notice?: string }).notice}</div>
        </div>
      )}
    </div>
  );
}
