// ─────────────────────────────────────────────────────────────────────────────
// ResponderOperations.tsx — Tab 3 matching video 2 (00:44 - 01:03)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Radio,
  MapPin,
  Copy,
  ExternalLink,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

interface Props {
  onShowToast: (msg: string) => void;
}

type StepState = 'DISPATCHED' | 'ACKNOWLEDGED' | 'EN ROUTE' | 'ARRIVED' | 'CONTAINED' | 'RESOLVED';

const LIFECYCLE_STEPS: StepState[] = [
  'DISPATCHED',
  'ACKNOWLEDGED',
  'EN ROUTE',
  'ARRIVED',
  'CONTAINED',
  'RESOLVED',
];

export default function ResponderOperations({ onShowToast }: Props) {
  const [currentStep, setCurrentStep] = useState<StepState>('DISPATCHED');
  const [sitrepText, setSitrepText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sitreps, setSitreps] = useState<Array<{ id: string; text: string; time: string }>>([
    {
      id: 'UNIT 3 · D-09-04-0421',
      text: 'Initial response vehicle on site. Establishing containment line along rail siding.',
      time: '18 mins ago',
    },
  ]);

  const currentIndex = LIFECYCLE_STEPS.indexOf(currentStep);

  const getNextStep = (): StepState | null => {
    if (currentIndex < LIFECYCLE_STEPS.length - 1) {
      return LIFECYCLE_STEPS[currentIndex + 1];
    }
    return null;
  };

  const nextStep = getNextStep();

  function handleAdvance() {
    if (nextStep) {
      setCurrentStep(nextStep);
      onShowToast(`Task advanced to ${nextStep}`);
    } else {
      onShowToast('Mission is already resolved');
    }
  }

  function handleTransmitSitrep() {
    if (!sitrepText.trim()) return;
    const newEntry = {
      id: `UNIT 3 · D-09-04-${Math.floor(1000 + Math.random() * 9000)}`,
      text: sitrepText,
      time: 'Just now',
    };
    setSitreps(prev => [newEntry, ...prev]);
    setSitrepText('');
    onShowToast('SitRep transmitted to Incident Command Center');
  }

  function handleCopyGPS() {
    navigator.clipboard?.writeText('30.248, 75.839');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('GPS coordinates copied: 30.248°N, 75.839°E');
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

        {/* Center: Active Task Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#141824] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono">
            <span className="text-white/40">Active Task:</span>
            <span className="font-bold text-white">INC-2026-0044 - Sangrur Agricultural District, Punjab</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">NEW</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FIELD READY</span>
          </div>
        </div>
      </div>

      {/* Assigned Mission Card */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
              ASSIGNED MISSION
            </div>
            <h2 className="text-xl font-extrabold text-white">Sangrur Farm Stubble Burning</h2>
            <div className="text-xs text-white/50 font-mono mt-0.5">
              Sangrur Agricultural District, Punjab · Target Sector Assessment
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-mono font-bold">
              CROP SMOKE
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              HIGH
            </span>
          </div>
        </div>

        {/* 4-Grid Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-white/5">
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">TARGET GPS</div>
              <div className="text-sm font-bold font-mono text-white mt-1">30.248°N · 75.839°E</div>
            </div>
            <button
              onClick={handleCopyGPS}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 mt-2 self-start"
            >
              <Copy size={11} />
              <span>{copied ? 'Copied' : 'Copy GPS'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">THERMAL POWER (FRP)</div>
              <div className="text-xl font-black font-mono text-white mt-1">24.5 MW</div>
            </div>
            <div className="text-[11px] text-white/40 font-mono mt-2">VIIRS Overpass Conf: 90%</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">HAZARD RATING</div>
              <div className="text-sm font-bold font-mono text-amber-400 mt-1">MODERATE (Risk: 62/100)</div>
            </div>
            <div className="text-[11px] text-white/40 font-mono mt-2">Secondary blast / coal dust</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">SURFACE WIND VECTOR</div>
              <div className="text-xs font-bold text-white mt-1">North-West (NW) at 14 km/h</div>
            </div>
            <div className="text-[11px] text-white/40 font-mono mt-2">Plume moving toward NH-55</div>
          </div>
        </div>

        {/* Access Route Box */}
        <div className="p-4 rounded-xl bg-[#161a25] border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-white/70">ACCESS ROUTE</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
              2.4 KM ACCESS
            </span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-sans">
            Approach via NH-55 East Corridor Bypass -&gt; Gate 4 Road. Do not use Northern Coal Yard approach due to heavy smoke plume. Hydrant hookup available at Sector 4 Perimeter Gate.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onShowToast('Navigation coordinates opened')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors"
            >
              <ExternalLink size={12} />
              <span>Open Coordinates in Maps</span>
            </button>
            <button
              onClick={() => onShowToast('Connecting to Radio Channel 1078...')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-mono transition-colors"
            >
              <Radio size={12} />
              <span>Radio Command (1078)</span>
            </button>
          </div>
        </div>

        {/* Lifecycle Control: Field Status Progression (6 Stepper Blocks) */}
        <div className="p-5 rounded-xl bg-[#0e121b] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              LIFECYCLE CONTROL
            </div>
            <div className="text-xs font-mono">
              <span className="text-white/40">CURRENT STATE: </span>
              <strong className="text-amber-400 font-bold">{currentStep}</strong>
            </div>
          </div>

          <div className="text-sm font-bold text-white">Field Status Progression</div>

          {/* 6 Stepper Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentStep === step;
              return (
                <div
                  key={step}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                      : isPast
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-[#141824] border-white/5 text-white/30'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold tracking-wider">{step}</div>
                  <div className="text-[9px] font-mono mt-1 text-white/40">
                    {isCurrent ? 'ACTIVE NOW' : isPast ? 'COMPLETED' : 'PENDING'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Required Banner + Advance Button */}
          {nextStep ? (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-mono text-amber-300/80">
                Action Required: <strong className="text-white">Next State: {nextStep}</strong>
              </div>
              <button
                onClick={handleAdvance}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs font-mono uppercase tracking-widest shadow-lg shadow-orange-950/40 transition-all active:scale-[0.99]"
              >
                ⚡ ACKNOWLEDGE DISPATCH ({nextStep})
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold text-center">
              ✓ All lifecycle phases completed and resolved
            </div>
          )}
        </div>

        {/* Field Situation Report (SitRep) */}
        <div className="p-5 rounded-xl bg-[#0e121b] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-white/80">
              Field Situation Report (SitRep)
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              Direct sync to Command Center
            </span>
          </div>

          <textarea
            value={sitrepText}
            onChange={e => setSitrepText(e.target.value)}
            placeholder="Field report (e.g., 2 water tenders deployed on south perimeter; wind gusting 22 km/h; evacuating residential block B)..."
            rows={3}
            className="w-full bg-[#141824] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 outline-none focus:border-amber-500/50 resize-none font-sans"
          />

          <button
            onClick={handleTransmitSitrep}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-md transition-all"
          >
            <Send size={13} />
            <span>Transmit SitRep to Command</span>
          </button>

          {/* Recent SitReps Logged */}
          <div className="space-y-2 pt-3 border-t border-white/5">
            <div className="text-[10px] font-mono text-white/40 uppercase font-bold">
              Recent SitReps Logged
            </div>
            <div className="space-y-2">
              {sitreps.map(sr => (
                <div key={sr.id} className="p-3 rounded-lg bg-[#141824] border border-white/5 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-cyan-400">{sr.id}</span>
                    <span className="text-white/40">{sr.time}</span>
                  </div>
                  <p className="text-white/80 font-sans text-xs">{sr.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
