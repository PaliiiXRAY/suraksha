// ─────────────────────────────────────────────────────────────────────────────
// ResponderOperations.tsx — Tab 3 matching video frames 00:15 - 00:22 & 00:57 - 01:06
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Check, CheckCircle2, Radio, MapPin, Copy, ExternalLink, ShieldAlert } from 'lucide-react';

interface Props {
  onShowToast: (msg: string) => void;
}

type MissionState = 'ASSIGNED' | 'DISPATCHED' | 'EN ROUTE' | 'ON SITE' | 'COMPLETE';

export default function ResponderOperations({ onShowToast }: Props) {
  const [currentState, setCurrentState] = useState<MissionState>('DISPATCHED');
  const [copied, setCopied] = useState(false);

  const steps: MissionState[] = ['ASSIGNED', 'DISPATCHED', 'EN ROUTE', 'ON SITE'];

  const getStepIndex = (state: MissionState) => {
    switch (state) {
      case 'ASSIGNED': return 0;
      case 'DISPATCHED': return 1;
      case 'EN ROUTE': return 2;
      case 'ON SITE': return 3;
      case 'COMPLETE': return 4;
    }
  };

  const currentIndex = getStepIndex(currentState);

  function handleAdvance() {
    if (currentState === 'DISPATCHED') {
      setCurrentState('EN ROUTE');
      onShowToast('Task advanced to EN ROUTE');
    } else if (currentState === 'EN ROUTE') {
      setCurrentState('ON SITE');
      onShowToast('Task advanced to ON SITE');
    } else if (currentState === 'ON SITE') {
      setCurrentState('COMPLETE');
      onShowToast('Mission completed');
    }
  }

  function handleCopyGPS() {
    navigator.clipboard?.writeText('19.7991, 85.8239');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('Coordinates copied to clipboard');
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-emerald-400 font-semibold uppercase mb-1">
            NDRF UNIT 3 · FIELD TERMINAL
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Responder Operations</h1>
          <p className="text-xs text-white/50 mt-0.5">
            Assigned mission, site conditions and next actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/60">
            TASK-104 · Brahmagiri Evacuation Support
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FIELD READY</span>
          </div>
        </div>
      </div>

      {/* Focused Mission Card */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
              FOCUSED MISSION
            </div>
            <h2 className="text-xl font-extrabold text-white">Brahmagiri Evacuation Support</h2>
            <div className="text-xs text-white/50 font-mono mt-0.5">
              Brahmagiri block, Puri · Target sector assessment and support
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
              CYCLONE
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              HIGH
            </span>
          </div>
        </div>

        {/* 4-Grid Mission Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-white/5">
          {/* Target GPS */}
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">TARGET GPS</div>
              <div className="text-sm font-bold font-mono text-white mt-1">19.7991°N · 85.8239°E</div>
            </div>
            <button
              onClick={handleCopyGPS}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 mt-2 self-start"
            >
              <Copy size={11} />
              <span>{copied ? 'Copied' : 'Copy coordinates'}</span>
            </button>
          </div>

          {/* Forecast Wind */}
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">FORECAST WIND</div>
              <div className="text-xl font-black font-mono text-white mt-1">92 km/h</div>
            </div>
            <div className="text-[11px] text-white/40 font-mono mt-2">IMD Bulletin - Official</div>
          </div>

          {/* Hazard Rating */}
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">HAZARD RATING</div>
              <div className="text-sm font-bold font-mono text-red-400 mt-1">
                CRITICAL · 92/100
              </div>
            </div>
            <div className="text-[11px] text-white/40 font-mono mt-2">Operational priority</div>
          </div>

          {/* Surface Wind Vector */}
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">SURFACE WIND VECTOR</div>
              <div className="text-xs font-bold text-white mt-1">East-North-East at 92 km/h</div>
            </div>
            <div className="text-[11px] text-white/40 font-mono mt-2">Track moving inland</div>
          </div>
        </div>

        {/* Access Route Box */}
        <div className="p-4 rounded-xl bg-[#161a25] border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-white/70">ACCESS ROUTE</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
              38.4 KM ACCESS
            </span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-sans">
            Approach via NH-316 -&gt; Satapada Road. Avoid coastal SH-13 due to verified surge exposure.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onShowToast('Navigation route pinned to map')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors"
            >
              <ExternalLink size={12} />
              <span>Open coordinates in maps</span>
            </button>
            <button
              onClick={() => onShowToast('Connecting to Radio Channel 1670...')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-mono transition-colors"
            >
              <Radio size={12} />
              <span>Radio Command 1670</span>
            </button>
          </div>
        </div>

        {/* Lifecycle Control: Field Status Progression */}
        <div className="p-5 rounded-xl bg-[#0e121b] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              LIFECYCLE CONTROL
            </div>
            <div className="text-xs font-mono">
              <span className="text-white/40">CURRENT STATE: </span>
              <strong className="text-blue-400 font-bold">{currentState}</strong>
            </div>
          </div>

          <div className="text-sm font-bold text-white">Field Status Progression</div>

          {/* Stepper Circles */}
          <div className="relative flex items-center justify-between max-w-xl mx-auto py-4">
            {/* Horizontal Line */}
            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-white/10 z-0"></div>

            {steps.map((st, i) => {
              const isDone = currentIndex > i || currentState === 'COMPLETE';
              const isCurrent = currentState === st;
              return (
                <div key={st} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-xs transition-all ${
                      isDone
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                        : isCurrent
                        ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                        : 'bg-[#181d29] text-white/40 border border-white/10'
                    }`}
                  >
                    {isDone ? <Check size={16} /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-mono mt-2 tracking-wider ${
                      isDone || isCurrent ? 'text-white font-bold' : 'text-white/40'
                    }`}
                  >
                    {st}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Advance Button */}
          <div className="flex justify-end pt-2">
            {currentState !== 'COMPLETE' ? (
              <button
                onClick={handleAdvance}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-900/40"
              >
                {currentState === 'DISPATCHED' && 'Advance to EN ROUTE'}
                {currentState === 'EN ROUTE' && 'Advance to ON SITE'}
                {currentState === 'ON SITE' && 'Advance to COMPLETE'}
              </button>
            ) : (
              <div className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white/40 font-bold font-mono text-xs uppercase tracking-wider cursor-default">
                Mission completed
              </div>
            )}
          </div>
        </div>

        {/* Safety Interlocks Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/5">
          <div className="p-3 rounded-lg bg-[#0e121b] border border-white/5">
            <div className="text-[10px] font-mono text-white/40 uppercase">SAFETY INTERLOCKS</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">All clear</div>
            <div className="text-[10px] text-white/30 font-mono mt-0.5">
              AUTOMATIC CHECK: 12 SATELLITE · 10 GROUND
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e121b] border border-white/5">
            <div className="text-[10px] font-mono text-white/40 uppercase">FIELD TEAM</div>
            <div className="text-sm font-bold text-white mt-0.5">12 personnel</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e121b] border border-white/5">
            <div className="text-[10px] font-mono text-white/40 uppercase">OPERATIONAL WINDOW</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">06h 45m</div>
            <div className="text-[10px] text-white/30 font-mono mt-0.5">
              BEFORE 90 KM/H GALE FORCE WINDS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
