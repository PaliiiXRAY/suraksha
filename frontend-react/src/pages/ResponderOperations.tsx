// ─────────────────────────────────────────────────────────────────────────────
// ResponderOperations.tsx — Portal 3: Response Portal
// Field execution layer: mission lifecycle, tactical navigation & ground sitreps.
// Inherits FireSense design language with dual theme support.
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
  Truck,
  Users,
  LifeBuoy,
  Wind,
  Navigation,
  Check,
  AlertOctagon,
} from 'lucide-react';
import StatCard from '../components/design-system/StatCard';
import RiskBadge from '../components/design-system/RiskBadge';
import ProvenancePill from '../components/design-system/ProvenancePill';
import AuditVerificationBlock from '../components/design-system/AuditVerificationBlock';

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
    onShowToast('Ground SITREP transmitted to Government Command HQ');
  }

  function handleCopyCoords() {
    navigator.clipboard?.writeText('19.7991, 85.8239');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('Target coordinates copied: 19.7991°N, 85.8239°E');
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <Radio size={12} className="animate-pulse" />
              <span>NDRF BATTALION 03 · TACTICAL FIELD TERMINAL</span>
            </span>
            <ProvenancePill tag="SIMULATED" size="sm" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Responder Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
            Field execution, mission progression, safe routing & ground condition telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>FIELD READY · VHF CH-04</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Unit Status"
          value={currentStep}
          subtitle="Brahmagiri / Puri Sector"
          icon={Truck}
          iconColor="text-emerald-500"
          provenance="SIMULATED"
        />
        <StatCard
          title="Personnel Deployed"
          value={42}
          subtitle="4 Officers + 38 Responders"
          icon={Users}
          iconColor="text-blue-500"
          provenance="BATTALION ROSTER"
        />
        <StatCard
          title="Civilians Evacuated"
          value="1,420"
          subtitle="Zilla High School Shelter"
          delta="+240 recent"
          deltaType="positive"
          provenance="GROUND SITREP"
        />
        <StatCard
          title="Equipment Readiness"
          value="100%"
          subtitle="4 Boats · 8 Chainsaws"
          icon={LifeBuoy}
          iconColor="text-amber-500"
          provenance="EQUIPMENT LOG"
        />
      </div>

      {/* Card 1: ASSIGNED MISSION CARD */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>ASSIGNED MISSION · OP-2019-042</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              TASK-2019-FANI-084: Brahmagiri Relief Pre-positioning
            </h2>
            <div className="text-xs text-slate-500 dark:text-white/50 font-mono mt-0.5">
              Puri Coastal District · Target Coordinates: 19.7991° N, 85.8239° E
            </div>
          </div>

          <button
            onClick={handleCopyCoords}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-mono font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Copy size={13} />
            <span>{copied ? 'Copied GPS!' : 'Copy Target GPS'}</span>
          </button>
        </div>

        {/* 4-Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">TARGET GPS</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1">
              19.7991, 85.8239
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">FORECAST WIND</div>
            <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              185 km/h (Peak 215)
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">TERRAIN RISK</div>
            <div className="text-sm font-bold font-mono text-red-600 dark:text-red-400 mt-1">
              CRITICAL (92/100)
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">RADIO FREQUENCY</div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              156.800 MHz (Ch 16)
            </div>
          </div>
        </div>

        {/* Tactical Routing Assessment */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-white/70 flex items-center gap-1.5">
            <Route size={14} className="text-blue-500" />
            <span>Tactical Route Assessment & Inundation Status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Route A: NH-316 */}
            <div
              onClick={() => setSelectedRoute('nh316')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoute === 'nh316'
                  ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-500 ring-1 ring-blue-500/30'
                  : 'bg-slate-50 dark:bg-[#181d2a] border-slate-200/90 dark:border-white/5 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Route A: NH-316 via Pipili Bypass
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  RECOMMENDED · PASSABLE
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-1.5 leading-relaxed">
                Distance: 54 km · Tree falls cleared by NHAI team at km 28 · Bridges structurally intact · Safe for heavy rescue vehicles.
              </p>
            </div>

            {/* Route B: Marine Drive */}
            <div
              onClick={() => setSelectedRoute('marinedrive')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoute === 'marinedrive'
                  ? 'bg-red-50/70 dark:bg-red-950/20 border-red-500 ring-1 ring-red-500/30'
                  : 'bg-slate-50 dark:bg-[#181d2a] border-slate-200/90 dark:border-white/5 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Route B: Puri-Konark Marine Drive
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-mono">
                  IMPASSABLE · SURGE 1.8M
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-1.5 leading-relaxed">
                Hazard: High storm surge breach at Culvert 14. Roadway washed out. Inaccessible to wheeled transport.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: MISSION LIFECYCLE CONTROL */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
              FIELD STAGE MACHINE
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Mission Lifecycle Progression
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-white/40">
            CURRENT PHASE: <strong className="text-blue-600 dark:text-blue-400 font-bold">{currentStep}</strong>
          </span>
        </div>

        {/* 6 Step Interactive Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={step}
                className={`p-3.5 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#181d2a] text-slate-400 dark:text-white/30 border-slate-200/90 dark:border-white/5'
                }`}
              >
                <div className="text-[9px] opacity-70">STAGE 0{idx + 1}</div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  {isCompleted && <Check size={12} />}
                  <span>{step}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full-width Orange Stage CTA Button (matching FireSense reference) */}
        <div>
          <button
            onClick={handleAdvance}
            className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
          >
            <span>
              {nextStep ? `ADVANCE TO ${nextStep} ->` : 'MISSION COMPLETED (ALL STAGES VERIFIED)'}
            </span>
          </button>
        </div>
      </div>

      {/* Card 3: FIELD SITUATION REPORT (SITREP) */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
              GROUND TELEMETRY & LOGS
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Field Situation Report (SitRep)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            ENCRYPTED RELAY ACTIVE
          </span>
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={sitrepText}
            onChange={e => setSitrepText(e.target.value)}
            placeholder="Log tactical ground observation (e.g., road blockage, water levels, shelter status, generator fuel)..."
            className="w-full bg-slate-50 dark:bg-[#181d2a] border border-slate-200/90 dark:border-white/10 rounded-xl p-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-blue-500 shadow-sm font-mono leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={handleTransmitSitrep}
              disabled={!sitrepText.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono text-xs font-bold shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Send size={14} />
              <span>TRANSMIT SITREP</span>
            </button>
          </div>
        </div>

        {/* Previous Sitreps Log */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
            Recent Field Transmissions Feed
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {sitreps.map((s, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] text-xs font-mono border border-slate-200/90 dark:border-white/5"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="text-blue-600 dark:text-cyan-400 font-bold">{s.id}</span>
                  <span>{s.time}</span>
                </div>
                <p className="text-slate-800 dark:text-white/90 font-sans text-xs leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Verification Block */}
        <AuditVerificationBlock
          hash="0x28a190b4c8109278ba0119f49b1094892c908123e4758129a0081249b6184ff"
          sourceAuthority="NDRF Unit 3 Tactical Keyring"
          onVerify={() => onShowToast('Audit Verified: Tactical field signature validated')}
        />
      </div>
    </div>
  );
}
