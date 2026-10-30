// ─────────────────────────────────────────────────────────────────────────────
// CommandDashboard — main disaster command view
// Layout: CycloneInfoBar | [Map canvas] | [Priority Queue + Tasks]
//          SituationBrief (collapsible)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import type { HazardEvent, BlockRisk, StrategicAsset, ResponseTask, SituationBrief } from '../types';
import {
  getHazardEvent,
  getBlockRisks,
  getStrategicAssets,
  getResponseTasks,
  getSituationBrief,
  getWarnings,
} from '../services/api';
import CycloneMap from '../components/map/CycloneMap';
import BlockRiskPanel from '../components/command/BlockRiskPanel';
import ReasonsDrawer from '../components/command/ReasonsDrawer';
import TaskQueue from '../components/command/TaskQueue';
import SituationBriefPanel from '../components/command/SituationBriefPanel';
import CycloneInfoBar from '../components/command/CycloneInfoBar';

export default function CommandDashboard() {
  const [event, setEvent] = useState<HazardEvent | null>(null);
  const [blocks, setBlocks] = useState<BlockRisk[]>([]);
  const [assets, setAssets] = useState<StrategicAsset[]>([]);
  const [tasks, setTasks] = useState<ResponseTask[]>([]);
  const [brief, setBrief] = useState<SituationBrief | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [windOffset, setWindOffset] = useState(0);
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'tasks'>('blocks');

  const warnings = getWarnings();
  const selectedBlock = blocks.find(b => b.id === selectedBlockId) ?? null;

  useEffect(() => {
    async function load() {
      const [ev, bl, as, ts, br] = await Promise.all([
        getHazardEvent(),
        getBlockRisks(0),
        getStrategicAssets(),
        getResponseTasks(),
        getSituationBrief(),
      ]);
      setEvent(ev);
      setBlocks(bl);
      setAssets(as);
      setTasks(ts);
      setBrief(br);
      setSelectedBlockId(bl[0]?.id ?? null);
    }
    load();
  }, []);

  async function handleWindOffsetChange(offset: number) {
    setWindOffset(offset);
    const updated = await getBlockRisks(offset);
    setBlocks(updated);
  }

  if (!event || !brief) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f1117]">
        <div className="text-white/40 text-sm font-mono animate-pulse">Loading Fani 2019 replay pack…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Cyclone info strip */}
      <CycloneInfoBar event={event} warning={warnings[0]} />

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT: Map canvas (takes remaining space) */}
        <div className="flex-1 relative overflow-hidden">
          <CycloneMap
            event={event}
            assets={assets}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onBlockClick={(id: string) => {
              setSelectedBlockId(id);
              setActiveTab('blocks');
            }}
          />

          {/* Reasons drawer overlays the map */}
          {selectedBlock && activeTab === 'blocks' && (
            <ReasonsDrawer
              block={selectedBlock}
              onClose={() => setSelectedBlockId(null)}
            />
          )}
        </div>

        {/* RIGHT: Tabbed panel (Priority Queue / Tasks) */}
        <div className="w-80 flex-shrink-0 border-l border-white/10 flex flex-col overflow-hidden bg-[#0f1117]">
          {/* Tab switcher */}
          <div className="flex-shrink-0 flex border-b border-white/10">
            {(['blocks', 'tasks'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-[#f4511e] bg-white/5'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'blocks' ? 'Priority Queue' : 'Response Tasks'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'blocks' ? (
              <BlockRiskPanel
                blocks={blocks}
                selectedId={selectedBlockId}
                onSelect={setSelectedBlockId}
                windOffset={windOffset}
                onWindOffsetChange={handleWindOffsetChange}
              />
            ) : (
              <TaskQueue
                tasks={tasks}
                onTasksChange={setTasks}
              />
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Situation Brief */}
      <SituationBriefPanel
        brief={brief}
        event={event}
        collapsed={briefCollapsed}
        onToggle={() => setBriefCollapsed(!briefCollapsed)}
      />
    </div>
  );
}
