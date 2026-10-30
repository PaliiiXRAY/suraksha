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
        return <ShieldCheck size={11} className="text-blue-400" />;
      case 'sensor':
        return <Eye size={11} className="text-emerald-400" />;
      case 'cpu':
        return <Cpu size={11} className="text-purple-400" />;
      case 'history':
        return <History size={11} className="text-slate-400" />;
      case 'sliders':
        return <Sliders size={11} className="text-amber-400" />;
      default:
        return <AlertTriangle size={11} className="text-rose-400" />;
    }
  };

  const sizeClasses = {
    sm: 'text-[9.5px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-bold border uppercase tracking-wider ${cfg.badge} ${sizeClasses[size]} ${className}`}
      title={`Data Provenance: ${cfg.label}`}
    >
      {renderIcon()}
      <span>{cfg.label}</span>
    </span>
  );
}
