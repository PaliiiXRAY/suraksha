// ─────────────────────────────────────────────────────────────────────────────
// RiskTierBadge — color-coded risk tier indicator
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskTier } from '../../types';

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL:       { bg: 'bg-red-950/80',    text: 'text-red-300',    border: 'border-red-500/60' },
  HIGH:           { bg: 'bg-orange-950/80', text: 'text-orange-300', border: 'border-orange-500/60' },
  MODERATE:       { bg: 'bg-yellow-950/80', text: 'text-yellow-300', border: 'border-yellow-500/60' },
  LOW:            { bg: 'bg-green-950/80',  text: 'text-green-300',  border: 'border-green-500/60' },
  ROUTINE:        { bg: 'bg-slate-900/80',  text: 'text-slate-300',  border: 'border-slate-600' },
  REVIEW_REQUIRED:{ bg: 'bg-amber-950/80',  text: 'text-amber-300',  border: 'border-amber-500/60' },
};

interface Props {
  tier: RiskTier | string;
  className?: string;
}

export default function RiskTierBadge({ tier, className = '' }: Props) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.ROUTINE;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border tracking-wider ${style.bg} ${style.text} ${style.border} ${className}`}>
      {tier}
    </span>
  );
}
