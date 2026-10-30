// ─────────────────────────────────────────────────────────────────────────────
// SituationBriefPanel — deterministic 6-line brief, zero external calls
// ─────────────────────────────────────────────────────────────────────────────
import { FileText, Wind, AlertTriangle, Package, Route, ShieldCheck } from 'lucide-react';
import type { SituationBrief, HazardEvent } from '../../types';
import ProvenanceBadge from '../ui/ProvenanceBadge';

const BRIEF_LINES = [
  { icon: Wind,         label: 'EVENT STATUS',           key: 'event_status' as const },
  { icon: AlertTriangle,label: 'TOP PRIORITY',           key: 'top_priority' as const },
  { icon: Package,      label: 'CRITICAL ASSETS',        key: 'critical_assets' as const },
  { icon: Route,        label: 'LOGISTICS & ACCESS',     key: 'logistics' as const },
  { icon: Package,      label: 'STAGING RECOMMENDATION', key: 'staging_recommendation' as const },
  { icon: ShieldCheck,  label: 'INTERLOCK STATUS',       key: 'interlock_status' as const },
];

interface Props {
  brief: SituationBrief;
  event: HazardEvent;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function SituationBriefPanel({ brief, event, collapsed, onToggle }: Props) {
  return (
    <div className="bg-[#161921] border-t border-white/10">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-white/40" />
          <span className="text-xs font-semibold text-white">Situation Brief</span>
          <ProvenanceBadge tag="MODEL_ESTIMATE" size="xs" extraInfo="deterministic template · zero external calls" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30 font-mono">
            🌀 {event.name} · {event.wind_kmh} km/h · Landfall {event.landfall_location}
          </span>
          <span className="text-white/30 text-xs">{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Brief lines */}
      {!collapsed && (
        <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {BRIEF_LINES.map(({ icon: Icon, label, key }, idx) => (
            <div
              key={key}
              className="flex items-start gap-2 bg-black/20 rounded p-2.5 border border-white/5"
            >
              <span className="text-white/20 font-mono text-xs w-4 flex-shrink-0 mt-0.5">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={10} className="text-white/40 flex-shrink-0" />
                  <span className="text-xs font-mono text-white/40 uppercase tracking-widest">{label}</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{brief[key]}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
