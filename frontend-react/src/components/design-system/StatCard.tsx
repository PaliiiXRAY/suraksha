import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  provenance?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyan-400',
  delta,
  deltaType = 'neutral',
  provenance,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <Icon size={14} className={iconColor} />
            </div>
          )}
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-slate-200">
            {title}
          </span>
        </div>
        {provenance && (
          <span className="px-2 py-0.5 rounded-md text-xs font-mono font-black bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white shadow-xs">
            {provenance}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div className="text-2xl font-black font-mono text-slate-900 dark:text-white leading-tight">
          {value}
        </div>
        {delta && (
          <span
            className={`text-xs font-mono font-black ${
              deltaType === 'positive'
                ? 'text-emerald-700 dark:text-emerald-400'
                : deltaType === 'negative'
                ? 'text-red-700 dark:text-red-400'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {delta}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {subtitle}
        </div>
      )}
    </div>
  );
}
