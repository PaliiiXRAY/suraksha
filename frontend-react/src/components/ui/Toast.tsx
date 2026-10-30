// ─────────────────────────────────────────────────────────────────────────────
// Toast.tsx — Global notification banner matching Figma / Video toasts
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'warning' | 'info';
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-lg w-full px-4">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#161c28]/95 border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {t.type === 'warning' ? (
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
          )}
          <span className="leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-white/40 hover:text-white ml-1.5 p-0.5 rounded-full"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
