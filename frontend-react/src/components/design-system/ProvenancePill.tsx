import React from 'react';
import { TOKENS, ProvenanceTag } from '../../theme/tokens';
import { ShieldCheck, Eye, Cpu, History, Sliders, AlertTriangle } from 'lucide-react';

interface ProvenancePillProps {
  tag: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ProvenancePill({
  tag,
  size = 'sm',
  className = '',
}: ProvenancePillProps) {
  const normTag = (tag in TOKENS.colors.provenance ? tag : 'OFFICIAL_FORECAST') as ProvenanceTag;
  const cfg = TOKENS.colors.provenance[normTag] || TOKENS.colors.provenance.OFFICIAL_FORECAST;

  const renderIcon = () => {
    switch (cfg.icon) {
      case 'verified':
        return <ShieldCheck size={12} className="text-blue-700 dark:text-blue-300 flex-shrink-0" />;
      case 'sensor':
        return <Eye size={12} className="text-emerald-700 dark:text-emerald-300 flex-shrink-0" />;
      case 'cpu':
        return <Cpu size={12} className="text-purple-700 dark:text-purple-300 flex-shrink-0" />;
      case 'history':
        return <History size={12} className="text-slate-800 dark:text-slate-200 flex-shrink-0" />;
      case 'sliders':
        return <Sliders size={12} className="text-amber-800 dark:text-amber-300 flex-shrink-0" />;
      default:
        return <AlertTriangle size={12} className="text-rose-700 dark:text-rose-300 flex-shrink-0" />;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-xs px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-mono font-black border uppercase tracking-wider shadow-sm transition-colors ${cfg.badge} ${sizeClasses[size]} ${className}`}
      title={`Data Provenance: ${cfg.label}`}
    >
      {renderIcon()}
      <span>{cfg.label}</span>
    </span>
  );
}
