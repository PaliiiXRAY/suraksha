import React from 'react';
import { TOKENS, RiskTier } from '../../theme/tokens';

interface RiskBadgeProps {
  score: number;
  showGauge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RiskBadge({
  score,
  showGauge = false,
  size = 'md',
  className = '',
}: RiskBadgeProps) {
  const getTier = (s: number): RiskTier => {
    if (s >= TOKENS.colors.riskTiers.critical.min) return 'critical';
    if (s >= TOKENS.colors.riskTiers.high.min) return 'high';
    if (s >= TOKENS.colors.riskTiers.moderate.min) return 'moderate';
    return 'low';
  };

  const tier = getTier(score);
  const cfg = TOKENS.colors.riskTiers[tier];

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-xs px-3 py-1.5',
    lg: 'text-sm px-4 py-2',
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg font-mono font-black uppercase tracking-wider shadow-sm transition-colors ${cfg.badge} ${sizeClasses[size]}`}
      >
        <span>{cfg.label}</span>
        <span className="opacity-60">•</span>
        <span>{score}</span>
      </span>

      {showGauge && (
        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 80
                ? 'bg-red-600'
                : score >= 60
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
    </div>
  );
}
