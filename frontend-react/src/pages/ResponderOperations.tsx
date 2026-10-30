// ─────────────────────────────────────────────────────────────────────────────
// ResponderOperations — field terminal view: mission + next action
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { MapPin, Route, Package, Phone, AlertTriangle } from 'lucide-react';
import type { ResponseTask, BlockRisk, StrategicAsset } from '../types';
import { getResponseTasks, getBlockRisks, getStrategicAssets, updateTaskStatus } from '../services/api';
import ProvenanceBadge from '../components/ui/ProvenanceBadge';
import RiskTierBadge from '../components/ui/RiskTierBadge';

export default function ResponderOperations() {
  const [tasks, setTasks] = useState<ResponseTask[]>([]);
  const [blocks, setBlocks] = useState<BlockRisk[]>([]);
  const [assets, setAssets] = useState<StrategicAsset[]>([]);
  const [selectedTask, setSelectedTask] = useState<ResponseTask | null>(null);

  useEffect(() => {
    async function load() {
      const [t, b, a] = await Promise.all([getResponseTasks(), getBlockRisks(0), getStrategicAssets()]);
      setTasks(t);
      setBlocks(b);
      setAssets(a);
      setSelectedTask(t.find((item: ResponseTask) => ['APPROVED', 'IN_PROGRESS'].includes(item.status)) ?? t[0] ?? null);
    }
    load();
  }, []);

  const activeTask = selectedTask;
  const targetBlock = blocks.find(b => b.block_name === activeTask?.target_block);
  const activeTasks = tasks.filter(t => ['PENDING', 'APPROVED', 'IN_PROGRESS'].includes(t.status));

  async function markComplete(taskId: string) {
    const updated = await updateTaskStatus(taskId, 'COMPLETED', 'Marked complete by field responder');
    setTasks(updated);
    setSelectedTask(updated.find((item: ResponseTask) => item.id === taskId) ?? null);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1117]">
      {/* Field header */}
      <div className="flex-shrink-0 bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/40 rounded flex items-center justify-center">
            <span className="text-emerald-400 text-lg">🪖</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Responder Field Terminal</div>
            <div className="text-xs text-emerald-300/60">NDRF 3rd Battalion · Cyclone FANI Response</div>
          </div>
          <ProvenanceBadge tag="SIMULATED" size="xs" extraInfo="field simulation" className="ml-auto" />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Active mission */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTask ? (
            <>
              {/* Primary mission card */}
              <div className="bg-[#161921] border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-emerald-400 font-mono uppercase tracking-widest mb-1">
                      Active Mission — {activeTask.id}
                    </div>
                    <h2 className="text-base font-bold text-white leading-snug">{activeTask.title}</h2>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
                    activeTask.status === 'IN_PROGRESS' ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' :
                    'bg-blue-950/80 text-blue-300 border-blue-500/40'
                  }`}>
                    {activeTask.status}
                  </span>
                </div>
                {activeTask.description && (
                  <p className="text-sm text-white/70 mb-3 leading-relaxed">{activeTask.description}</p>
                )}
                <ProvenanceBadge tag="SIMULATED" size="xs" extraInfo="mock dispatch" />
              </div>

              {/* Target block hazard */}
              {targetBlock && (
                <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={13} className="text-red-400" />
                    <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Target Area Hazard</h3>
                    <RiskTierBadge tier={targetBlock.tier} />
                    <ProvenanceBadge tag="MODEL_ESTIMATE" size="xs" className="ml-auto" />
                  </div>
                  <div className="text-base font-bold text-white mb-1">{targetBlock.block_name}, {targetBlock.district}</div>
                  <div className="text-2xl font-mono font-bold text-red-400 mb-3">{targetBlock.score}<span className="text-white/30 text-sm">/100</span></div>

                  {/* Routes */}
                  <div className="space-y-2">
                    {targetBlock.cut_routes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1 font-medium">
                          <AlertTriangle size={10} /> ROUTE WARNING
                        </div>
                        {targetBlock.cut_routes.map((r: string, i: number) => (
                          <div key={i} className="text-xs text-amber-300/70 ml-3 mb-0.5">⚠ {r}</div>
                        ))}
                      </div>
                    )}
                    {targetBlock.passable_routes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1 font-medium">
                          <Route size={10} /> USE ROUTE
                        </div>
                        {targetBlock.passable_routes.map((r: string, i: number) => (
                          <div key={i} className="text-xs text-emerald-300/70 ml-3 mb-0.5">✓ {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Primary action button */}
              {activeTask.status !== 'COMPLETED' && (
                <button
                  onClick={() => markComplete(activeTask.id)}
                  className="w-full py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-bold rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                  ✓ MARK TASK COMPLETE
                </button>
              )}
              {activeTask.status === 'COMPLETED' && (
                <div className="w-full py-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-lg text-center">
                  ✓ TASK COMPLETED
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-white/30 text-sm">
              No active tasks assigned.
            </div>
          )}

          {/* Nearby assets */}
          <div className="bg-[#161921] border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={13} className="text-white/40" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-white/50">Nearby Staging Assets</h3>
              <ProvenanceBadge tag="OBSERVED" size="xs" />
            </div>
            <div className="space-y-2">
              {assets.filter(a => ['ndrf_base', 'relief_depot'].includes(a.type)).slice(0, 4).map(a => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <span className="text-base">{a.type === 'ndrf_base' ? '🪖' : '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 truncate">{a.name}</div>
                    <div className="text-white/30 font-mono">{a.distance_to_eye_km} km from eye</div>
                  </div>
                  <span className={`text-[10px] font-mono ${a.exposed ? 'text-red-400' : 'text-emerald-400'}`}>
                    {a.exposed ? 'EXPOSED' : 'SAFE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Task list for selection */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-white/10">
            <div className="text-xs font-mono text-white/40 uppercase tracking-widest">All Active Tasks ({activeTasks.length})</div>
          </div>
          {activeTasks.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTask(t)}
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors text-xs ${
                selectedTask?.id === t.id ? 'bg-white/8 border-l-2 border-l-emerald-500' : 'hover:bg-white/5'
              }`}
            >
              <div className="font-medium text-white truncate">{t.title}</div>
              <div className="text-white/40 mt-0.5 font-mono">{t.id} · {t.status}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
