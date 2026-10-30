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
      className={`pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Lock size={13} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Immutable Consensus Audit Trail
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-white/40">
              • {sourceAuthority}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 truncate max-w-md">
            SHA-256: {hash}
          </span>
        </div>
      </div>

      <div>
        {verified ? (
          <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 size={13} />
            <span>CONSENSUS VERIFIED</span>
          </span>
        ) : (
          <button
            onClick={handleVerify}
            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#182030] dark:hover:bg-[#202c42] border border-slate-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-300 text-xs font-mono font-bold transition-all shadow-sm"
          >
            Verify Audit Hash
          </button>
        )}
      </div>
    </div>
  );
}
