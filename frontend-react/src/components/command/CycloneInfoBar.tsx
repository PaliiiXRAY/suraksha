// ─────────────────────────────────────────────────────────────────────────────
// CycloneInfoBar — top data strip showing cyclone headline stats
// ─────────────────────────────────────────────────────────────────────────────
import { Wind, Navigation, MapPin, Clock } from 'lucide-react';
import type { HazardEvent, CycloneWarning } from '../../types';
import ProvenanceBadge from '../ui/ProvenanceBadge';

interface Props {
  event: HazardEvent;
  warning: CycloneWarning;
}

const STAT_BLOCK = ({ label, value, unit, color = 'text-white' }: { label: string; value: string; unit?: string; color?: string }) => (
  <div className="flex flex-col items-center px-4 py-2 border-r border-white/10 last:border-r-0">
    <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-0.5">{label}</span>
    <span className={`text-lg font-mono font-bold leading-none ${color}`}>{value}</span>
    {unit && <span className="text-white/30 text-[10px] font-mono mt-0.5">{unit}</span>}
  </div>
);

export default function CycloneInfoBar({ event, warning }: Props) {
  const landfallDate = new Date(event.landfall_est);
  const now = new Date();
  const hoursToLandfall = Math.max(0, Math.round((landfallDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return (
    <div className="bg-[#161921] border-b border-white/10 flex flex-col sm:flex-row sm:items-stretch">
      {/* Cyclone name/category */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-white/10 bg-purple-950/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌀</span>
            <span className="text-sm font-bold text-white tracking-wide">CYCLONE {event.name}</span>
            <ProvenanceBadge tag="REPLAY" size="xs" />
          </div>
          <div className="text-xs text-purple-300/70 font-mono mt-0.5">{event.category}</div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-stretch overflow-x-auto flex-1">
        <STAT_BLOCK label="Max Wind" value={`${event.wind_kmh}`} unit="km/h" color="text-red-400" />
        <STAT_BLOCK label="Forward Speed" value={`${event.speed_kmh}`} unit="km/h" color="text-orange-300" />
        <STAT_BLOCK label="Landfall" value={event.landfall_location.split(',')[0]} color="text-amber-300" />
        <STAT_BLOCK label="ETA" value={hoursToLandfall > 0 ? `${hoursToLandfall}h` : 'LANDFALL'} color={hoursToLandfall < 6 ? 'text-red-400' : 'text-white'} />
      </div>

      {/* Warning bulletin */}
      <div className="px-4 py-2 border-t sm:border-t-0 sm:border-l border-white/10 flex items-center gap-2 max-w-xs">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Wind size={10} className="text-blue-400" />
            <span className="text-blue-300 text-[10px] font-mono">{warning.issued_by.split(',')[0]}</span>
          </div>
          <p className="text-xs text-white/60 leading-tight line-clamp-2">{warning.message.slice(0, 80)}…</p>
          <ProvenanceBadge tag="OFFICIAL_FORECAST" size="xs" className="mt-1" />
        </div>
      </div>
    </div>
  );
}
