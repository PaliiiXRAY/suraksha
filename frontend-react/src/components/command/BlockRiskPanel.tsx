// ─────────────────────────────────────────────────────────────────────────────
// BlockRiskPanel — priority queue of blocks with rank, score, tier
// Click any row to open the reasons drawer
// ─────────────────────────────────────────────────────────────────────────────
import { ChevronRight, AlertTriangle, MapPin, Users, Route } from 'lucide-react';
import type { BlockRisk } from '../../types';
import ProvenanceBadge from '../ui/ProvenanceBadge';
import RiskTierBadge from '../ui/RiskTierBadge';

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-green-400';
};

const SCORE_BAR_COLOR = (score: number) => {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
};

interface Props {
  blocks: BlockRisk[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  windOffset: number;
  onWindOffsetChange: (v: number) => void;
}

export default function BlockRiskPanel({ blocks, selectedId, onSelect, windOffset, onWindOffsetChange }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Priority Action Queue</h2>
          <ProvenanceBadge tag="MODEL_ESTIMATE" size="xs" />
        </div>
        <p className="text-white/40 text-xs">Area-wise risk ranking · {blocks.length} blocks · Click row to inspect</p>

        {/* What-if slider */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/50 font-mono">What-if Wind Offset</span>
            <span className={`font-mono font-bold ${windOffset > 0 ? 'text-orange-400' : windOffset < 0 ? 'text-green-400' : 'text-white/40'}`}>
              {windOffset > 0 ? '+' : ''}{windOffset} km/h
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            step={5}
            value={windOffset}
            onChange={e => onWindOffsetChange(parseInt(e.target.value))}
            className="w-full accent-orange-500 h-1.5"
          />
          {windOffset !== 0 && (
            <div className="flex items-center gap-1 mt-1 text-rose-400 text-xs font-mono">
              <AlertTriangle size={10} />
              <span>SIMULATED scenario — scores adjusted by {windOffset > 0 ? '+' : ''}{windOffset} km/h wind perturbation</span>
            </div>
          )}
        </div>
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto">
        {blocks.map(block => (
          <button
            key={block.id}
            onClick={() => onSelect(block.id)}
            className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors group ${
              selectedId === block.id ? 'bg-white/8 border-l-2 border-l-white/30' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Rank number */}
                <span className={`flex-shrink-0 w-6 h-6 rounded text-center text-xs font-mono font-bold flex items-center justify-center ${
                  block.rank === 1 ? 'bg-red-500/20 text-red-400' :
                  block.rank === 2 ? 'bg-orange-500/20 text-orange-400' :
                  block.rank === 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/50'
                }`}>
                  {block.rank}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{block.block_name}</div>
                  <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                    <MapPin size={9} />
                    <span>{block.district}</span>
                    <Users size={9} className="ml-1" />
                    <span>{(block.population / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-lg font-mono font-bold ${SCORE_COLOR(block.score)}`}>
                  {block.score}
                </span>
                <RiskTierBadge tier={block.tier} />
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${SCORE_BAR_COLOR(block.score)}`}
                style={{ width: `${block.score}%` }}
              />
            </div>

            {/* Quick reason preview */}
            {block.reasons[0] && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-white/30">
                <span>↳</span>
                <span className="truncate">{block.reasons[0].factor}</span>
                <ProvenanceBadge tag={block.reasons[0].provenance_tag} size="xs" className="flex-shrink-0" />
              </div>
            )}

            {/* Cut routes warning */}
            {block.cut_routes.length > 0 && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-400/80">
                <Route size={9} />
                <span className="truncate">{block.cut_routes[0]}</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-white/20">{block.reasons.length} factors</span>
              <ChevronRight size={12} className={`text-white/20 group-hover:text-white/50 transition-colors ${selectedId === block.id ? 'text-white/50' : ''}`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
