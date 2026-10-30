// ─────────────────────────────────────────────────────────────────────────────
// ResponderOperations.tsx — Tab 3 matching 8.16.10 PM canonical UI + 8.37.45 PM features
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
  ChevronRight,
  Database,
  Route,
} from 'lucide-react';

interface Props {
  onShowToast: (msg: string) => void;
}

type StepState = 'ASSIGNED' | 'DISPATCHED' | 'EN ROUTE' | 'ARRIVED' | 'CONTAINED' | 'RESOLVED';

const LIFECYCLE_STEPS: StepState[] = [
  'ASSIGNED',
  'DISPATCHED',
  'EN ROUTE',
  'ARRIVED',
  'CONTAINED',
  'RESOLVED',
];

export default function ResponderOperations({ onShowToast }: Props) {
  const [currentStep, setCurrentStep] = useState<StepState>('DISPATCHED');
  const [selectedRoute, setSelectedRoute] = useState<'nh316' | 'marinedrive'>('nh316');
  const [sitrepText, setSitrepText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sitreps, setSitreps] = useState<Array<{ id: string; text: string; time: string; state: string }>>([
    {
      id: 'UNIT 3 · D-09-04-0421',
      text: 'Staging vehicles at Pipili Bypass depot. VHF radio check confirmed on Channel 4.',
      time: '18 mins ago',
      state: 'DISPATCHED',
    },
    {
      id: 'UNIT 3 · D-09-04-0418',
      text: 'Clearing fallen tree debris on SH-13 with chainsaws. 240 villagers escorted to cyclone shelter.',
      time: '42 mins ago',
      state: 'EN ROUTE',
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
      onShowToast(`Mission advanced to ${nextStep}`);
    } else {
      onShowToast('Mission is fully resolved');
    }
  }

  function handleTransmitSitrep() {
    if (!sitrepText.trim()) return;
    const newEntry = {
      id: `UNIT 3 · D-09-04-${Math.floor(1000 + Math.random() * 9000)}`,
      text: sitrepText,
      time: 'Just now',
      state: currentStep,
    };
    setSitreps(prev => [newEntry, ...prev]);
    setSitrepText('');
    onShowToast('SitRep transmitted to Incident Command Center');
  }

  function handleCopyGPS() {
    navigator.clipboard?.writeText('19.7991, 85.8239');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('GPS coordinates copied: 19.7991°N, 85.8239°E (Brahmagiri)');
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0d14] text-white p-6 space-y-6">
      {/* Top Header matching 8.16.10 PM */}
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

        {/* Active Task Badge matching 8.16.10 PM */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#141824] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono">
            <span className="text-white/40">Active Task:</span>
            <span className="font-bold text-white">TASK-104 · Brahmagiri Evacuation Support</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FIELD READY</span>
          </div>
        </div>
      </div>

      {/* Focused Mission Card matching 8.16.10 PM */}
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

        {/* 4-Grid Mission Telemetry matching 8.16.10 PM */}
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
            <div className="text-[11px] text-red-400 font-mono mt-2">Peak gusts 215 km/h</div>
          </div>

          {/* Terrain Risk */}
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">TERRAIN RISK</div>
              <div className="text-xs font-bold text-white mt-1">Storm Surge Inundation Corridor</div>
            </div>
            <div className="text-[11px] text-amber-400 font-mono mt-2">1.8m coastal flood swath</div>
          </div>

          {/* Radio Frequency */}
          <div className="p-3.5 rounded-lg bg-[#0e121b] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase">RADIO FREQUENCY</div>
              <div className="text-sm font-bold font-mono text-white mt-1">CH-4 (VHF 156.200 MHz)</div>
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-2">Repeater: Pipli Active</div>
          </div>
        </div>

        {/* Optimal Access Route matching 8.16.10 PM */}
        <div className="pt-3 border-t border-white/5 space-y-2.5">
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
            OPTIMAL ACCESS ROUTE
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Route A */}
            <div
              onClick={() => setSelectedRoute('nh316')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedRoute === 'nh316'
                  ? 'bg-blue-600/10 border-blue-500'
                  : 'bg-[#0e121b] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">NH-316 via Pipili Bypass</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                Avoids coastal surge corridor. Police escort stationed at km 28. ETA: 42 mins.
              </p>
            </div>

            {/* Route B */}
            <div
              onClick={() => setSelectedRoute('marinedrive')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedRoute === 'marinedrive'
                  ? 'bg-blue-600/10 border-blue-500'
                  : 'bg-[#0e121b] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Puri Marine Drive</span>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">
                  BLOCKED / CUT
                </span>
              </div>
              <p className="text-[11px] text-red-400/80 mt-1">
                ALERT: Marine Drive inundated by 1.8m surge flood near Konark spit. Do NOT attempt.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Step Lifecycle Progression Stepper (from 8.16.10 PM & 8.37.45 PM) */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-0.5">
              INCIDENT LIFECYCLE PROGRESSION
            </div>
            <h3 className="text-base font-bold text-white">
              Status Stepper · Current State: <span className="text-cyan-400 font-mono">{currentStep}</span>
            </h3>
          </div>

          <button
            onClick={handleAdvance}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <span>{nextStep ? `Advance to ${nextStep}` : 'Mission Resolved'}</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={step}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-600/20 border-blue-500 text-white font-bold shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#0e121b] border-white/5 text-white/30'
                }`}
              >
                <div className="text-[9px] font-mono mb-1">STEP 0{idx + 1}</div>
                <div className="text-xs font-mono font-semibold truncate">{step}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Field SitRep Logger (from 8.37.45 PM) */}
      <div className="bg-[#121622] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-white">
              Field Situation Report (SitRep) Logger
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
            <Database size={12} />
            <span>LOCAL SQLITE / INDEXEDDB CACHED · ZERO-WIFI READY</span>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={sitrepText}
            onChange={e => setSitrepText(e.target.value)}
            placeholder="Log tactical observation: e.g. Shelter occupancy, road conditions, casualty count..."
            className="flex-1 bg-[#0e121b] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            onKeyDown={e => {
              if (e.key === 'Enter') handleTransmitSitrep();
            }}
          />
          <button
            onClick={handleTransmitSitrep}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
          >
            <Send size={12} />
            <span>Transmit SitRep</span>
          </button>
        </div>

        {/* SitRep History Feed */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="text-[10px] font-mono text-white/40 uppercase">TRANSMITTED FIELD LOGS</div>
          <div className="space-y-2">
            {sitreps.map(sr => (
              <div
                key={sr.id}
                className="p-3 rounded-lg bg-[#0e121b] border border-white/5 flex items-start justify-between gap-4 text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-cyan-300">{sr.id}</span>
                    <span className="text-white/40">·</span>
                    <span className="text-white/50">{sr.time}</span>
                    <span className="px-1.5 py-0.2 rounded bg-white/5 text-[9px] text-white/60">
                      {sr.state}
                    </span>
                  </div>
                  <div className="font-sans text-white/90">{sr.text}</div>
                </div>
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
