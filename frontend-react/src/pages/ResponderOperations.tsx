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
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-[#0a0d14] text-slate-900 dark:text-white p-6 space-y-6 transition-colors">
      {/* Top Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1.5">
            <Radio size={13} className="animate-pulse" />
            <span>NDRF BATTALION 03 · TACTICAL FIELD TERMINAL</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Response Portal
          </h1>
          <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">
            Field execution, mission progression, safe routing & ground condition telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProvenancePill tag="SIMULATED" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            <span>VHF LINK ACTIVE · CH-04</span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Unit Status"
          value={currentStep}
          subtitle="Assigned Sector: Brahmagiri / Puri"
          icon={Truck}
          iconColor="text-emerald-500"
          provenance="SIMULATED"
        />
        <StatCard
          title="Personnel Deployed"
          value={42}
          subtitle="4 Officer Leads + 38 Responders"
          icon={Users}
          iconColor="text-blue-500"
          provenance="BATTALION ROSTER"
        />
        <StatCard
          title="Civilians Evacuated"
          value="1,420"
          subtitle="Accommodated in Zilla High School"
          delta="+240 recent"
          deltaType="positive"
          provenance="GROUND SITREP"
        />
        <StatCard
          title="Equipment Readiness"
          value="100%"
          subtitle="4 Inflatable Boats · 8 Chainsaws"
          icon={LifeBuoy}
          iconColor="text-amber-500"
          provenance="EQUIPMENT LOG"
        />
      </div>

      {/* Active Mission Lifecycle Step Bar */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
            Mission Lifecycle Progression · OP-2019-042
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-white/40">
            CURRENT PHASE: <strong className="text-blue-600 dark:text-blue-400 font-bold">{currentStep}</strong>
          </span>
        </div>

        {/* 6 Step Interactive Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={step}
                className={`p-3 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#181d2a] text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/5'
                }`}
              >
                <div className="text-[9px] opacity-70">STAGE 0{idx + 1}</div>
                <div className="mt-0.5">{step}</div>
              </div>
            );
          })}
        </div>

        {/* Action button to advance */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <div className="text-xs text-slate-500 dark:text-white/50">
            Next Objective: {nextStep ? `Transition field unit to ${nextStep}` : 'All operational targets completed'}
          </div>

          <button
            onClick={handleAdvance}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Advance to {nextStep || 'COMPLETED'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 2-Column Split: Tactical Route Advice (Left) & Live SITREP Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 Cols): Route Intelligence */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Route size={16} className="text-cyan-500" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
                Tactical Route Verification
              </span>
            </div>
            <button
              onClick={handleCopyCoords}
              className="text-xs font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
            >
              <Copy size={12} />
              <span>{copied ? 'Copied!' : 'Copy Target Coords'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* Route A: NH-316 */}
            <div
              onClick={() => setSelectedRoute('nh316')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoute === 'nh316'
                  ? 'bg-blue-50/50 dark:bg-[#182032] border-blue-500 ring-1 ring-blue-500'
                  : 'bg-slate-50 dark:bg-[#181d2a] border-slate-200 dark:border-white/5 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Route A: NH-316 via Pipili Bypass (Recommended)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  PASSABLE (W/ ESCORT)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                Distance: 54 km · Tree falls cleared by NHAI team at km 28 · Bridges intact.
              </p>
            </div>

            {/* Route B: Marine Drive */}
            <div
              onClick={() => setSelectedRoute('marinedrive')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoute === 'marinedrive'
                  ? 'bg-red-50/50 dark:bg-[#28181e] border-red-500 ring-1 ring-red-500'
                  : 'bg-slate-50 dark:bg-[#181d2a] border-slate-200 dark:border-white/5 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Route B: Puri-Konark Marine Drive (Restricted)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-mono">
                  CUT (INUNDATED 1.8M)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                Hazard: High storm surge breach at Culvert 14. Inaccessible to heavy rescue trucks.
              </p>
            </div>
          </div>
        </div>

        {/* Right (6 Cols): Transmit Ground SITREP */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-white/80">
              Field Telemetry & SITREP Transmit
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              ENCRYPTED RELAY
            </span>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={sitrepText}
              onChange={e => setSitrepText(e.target.value)}
              placeholder="Enter field condition report (e.g. road water depth, shelter occupancy, generator fuel status)..."
              className="w-full bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-blue-500 shadow-sm font-mono"
            />
            <div className="flex justify-end">
              <button
                onClick={handleTransmitSitrep}
                disabled={!sitrepText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-mono text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Transmit SITREP</span>
              </button>
            </div>
          </div>

          {/* Previous Sitreps Log */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Recent Field Transmissions</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sitreps.map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181d2a] text-xs font-mono border border-slate-200 dark:border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">{s.id}</span>
                    <span>{s.time}</span>
                  </div>
                  <p className="text-slate-800 dark:text-white/80 font-sans text-xs">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          <AuditVerificationBlock
            hash="0x28a190b4c8109278ba0119f49b1094892c908123e4758129a0081249b6184ff"
            sourceAuthority="NDRF Unit 3 Tactical Keyring"
            onVerify={() => onShowToast('Audit Verified: Tactical field signature validated')}
          />
        </div>
      </div>
    </div>
  );
}
