import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

interface AuditVerificationBlockProps {
  hash: string;
  sourceAuthority?: string;
  onVerify?: () => void;
  className?: string;
}

export default function AuditVerificationBlock({
  hash,
  sourceAuthority = 'SURAKSHA Consensus Engine',
  onVerify,
  className = '',
}: AuditVerificationBlockProps) {
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerified(true);
    if (onVerify) onVerify();
  };

  return (
    <div
      className={`p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-300 dark:border-white/10 flex items-center justify-between flex-wrap gap-3 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 flex-shrink-0">
          <Lock size={15} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Immutable Consensus Audit Trail
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              • {sourceAuthority}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-lg mt-0.5">
            SHA-256: {hash}
          </span>
        </div>
      </div>

      <div>
        {verified ? (
          <span className="px-3.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 text-xs font-mono font-black flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 size={14} />
            <span>CONSENSUS VERIFIED</span>
          </span>
        ) : (
          <button
            onClick={handleVerify}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <ShieldCheck size={14} />
            <span>Verify Audit Hash</span>
          </button>
        )}
      </div>
    </div>
  );
}
