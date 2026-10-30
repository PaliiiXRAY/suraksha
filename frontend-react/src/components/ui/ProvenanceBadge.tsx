// ─────────────────────────────────────────────────────────────────────────────
// ProvenanceBadge — SURAKSHA canonical provenance badge
// 5 canonical tags + INSUFFICIENT_DATA, matching docs/PROVENANCE_SPEC.md
// ─────────────────────────────────────────────────────────────────────────────
import type { ProvenanceTag } from '../../types';

export const PROVENANCE_STYLES: Record<string, {
  bg: string; text: string; border: string; dot: string; label: string; tooltip: string;
}> = {
  OFFICIAL_FORECAST: {
    bg: 'bg-blue-950/80',
    text: 'text-blue-300',
    border: 'border-blue-500/60',
    dot: 'bg-blue-400',
    label: 'OFFICIAL FORECAST',
    tooltip: 'Sourced directly from official IMD meteorological bulletins. Governs all decisions.',
  },
  OBSERVED: {
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-300',
    border: 'border-emerald-500/60',
    dot: 'bg-emerald-400',
    label: 'OBSERVED',
    tooltip: 'Verified spatial ground truth (OSM roads, OSDMA asset database).',
  },
  MODEL_ESTIMATE: {
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-500/60',
    dot: 'bg-amber-400 animate-pulse',
    label: 'MODEL ESTIMATE',
    tooltip: 'Algorithmic decision-support heuristic. Supplements, never replaces, official warnings.',
  },
  REPLAY: {
    bg: 'bg-purple-950/80',
    text: 'text-purple-300',
    border: 'border-purple-500/60',
    dot: 'bg-purple-400',
    label: 'REPLAY',
    tooltip: 'Replayed from verified Cyclone Fani (May 2019) offline seed pack.',
  },
  SIMULATED: {
    bg: 'bg-rose-950/80',
    text: 'text-rose-300',
    border: 'border-rose-500/60',
    dot: 'bg-rose-400 animate-ping-sm',
    label: 'SIMULATED',
    tooltip: 'What-if operational simulation or mock response task. Not connected to real emergency dispatch.',
  },
  HISTORICAL: {
    bg: 'bg-purple-950/80',
    text: 'text-purple-300',
    border: 'border-purple-500/60',
    dot: 'bg-purple-400',
    label: 'HISTORICAL',
    tooltip: 'Historical data — Census / archived records.',
  },
  INSUFFICIENT_DATA: {
    bg: 'bg-slate-900/90',
    text: 'text-slate-300',
    border: 'border-slate-600',
    dot: 'bg-amber-500',
    label: 'INSUFFICIENT DATA',
    tooltip: 'Safety Interlock: Stale or incomplete telemetry. Automated escalation refused; human review required.',
  },
};

interface Props {
  tag: ProvenanceTag | string;
  size?: 'xs' | 'sm' | 'md';
  extraInfo?: string;
  className?: string;
}

export default function ProvenanceBadge({ tag, size = 'sm', extraInfo, className = '' }: Props) {
  const style = PROVENANCE_STYLES[tag] ?? PROVENANCE_STYLES.INSUFFICIENT_DATA;
  const sizeClasses = {
    xs: 'px-1.5 py-0 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wider select-none ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
      title={style.tooltip}
      data-provenance={tag}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      <span className="font-bold uppercase">{style.label}</span>
      {extraInfo && <span className="opacity-70 font-sans normal-case font-normal">({extraInfo})</span>}
    </span>
  );
}
