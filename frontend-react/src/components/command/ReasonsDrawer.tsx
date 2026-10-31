// ─────────────────────────────────────────────────────────────────────────────
// ReasonsDrawer — slide-in panel showing full risk breakdown for a selected block
// ─────────────────────────────────────────────────────────────────────────────
import { X, Route, AlertTriangle, Package } from 'lucide-react';
import type { BlockRisk } from '../../types';
import ProvenanceBadge from '../ui/ProvenanceBadge';
import RiskTierBadge from '../ui/RiskTierBadge';

interface Props {
  block: BlockRisk | null;
  onClose: () => void;
}

export default function ReasonsDrawer({ block, onClose }: Props) {
  if (!block) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-[#161921] border-l border-white/10 z-20 flex flex-col shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Risk Breakdown</span>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>

        <h3 className="text-base font-semibold text-white leading-tight">
          {block.block_name}
          <span className="text-white/40 font-normal text-sm"> · {block.district}</span>
        </h3>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-2xl font-mono font-bold text-red-400">{block.score}</span>
          <span className="text-white/30 text-sm">/100</span>
          <RiskTierBadge tier={block.tier} />
          <span className="ml-auto text-xs text-white/30 font-mono">Rank #{block.rank}</span>
        </div>

        <ProvenanceBadge tag={block.provenance_tag} size="xs" extraInfo="heuristic score" className="mt-2" />
      </div>

      {/* Scroll content */}
      <div className="flex-1 overflow-y-auto">
        {/* Risk Factors */}
        <div className="px-4 py-3 border-b border-white/5">
          <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Contributing Factors</h4>
          <div className="space-y-3">
            {block.reasons.map((r, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm text-white/80 leading-snug flex-1">{r.factor}</span>
                  <ProvenanceBadge tag={r.provenance_tag} size="xs" className="flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white/50">{r.value}</span>
                  {r.weight_pct && (
                    <>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500/60 rounded-full"
                          style={{ width: `${r.weight_pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-white/30">{r.weight_pct}%</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Population */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Population Exposed</span>
            <span className="text-sm font-mono font-bold text-white">{block.population.toLocaleString()}</span>
          </div>
        </div>

        {/* Routes */}
        <div className="px-4 py-3 border-b border-white/5">
          <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Supply Corridors</h4>

          {block.cut_routes.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1 font-medium">
                <AlertTriangle size={11} />
                <span>CUT / COMPROMISED</span>
              </div>
              {block.cut_routes.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-300/70 ml-3 mb-0.5">
                  <Route size={9} />
                  <span>{r}</span>
                  <ProvenanceBadge tag="OBSERVED" size="xs" />
                </div>
              ))}
            </div>
          )}

          {block.passable_routes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1 font-medium">
                <Route size={11} />
                <span>PASSABLE</span>
              </div>
              {block.passable_routes.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-300/70 ml-3 mb-0.5">
                  <span>·</span>
                  <span>{r}</span>
                  <ProvenanceBadge tag="OBSERVED" size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staging Recommendation */}
        {block.staging_rec && (
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-start gap-2">
              <Package size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-white/40 mb-0.5">Staging Recommendation</div>
                <div className="text-sm text-amber-300">{block.staging_rec}</div>
                <ProvenanceBadge tag="MODEL_ESTIMATE" size="xs" className="mt-1.5" />
              </div>
            </div>
          </div>
        )}

        {/* Interlock notice */}
        <div className="px-4 py-3">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded p-2.5 text-xs text-slate-400">
            <span className="font-bold text-slate-300">⚙ Decision Interlock Active.</span>
            {' '}This risk score is an operational prioritization index (0–100), not a probability. 
            Official IMD warnings govern all evacuation decisions. Human authority required for action dispatch.
          </div>
        </div>
      </div>
    </div>
  );
}
