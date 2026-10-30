// ─────────────────────────────────────────────────────────────────────────────
// TaskQueue — response task list with status controls, audit trail, create new
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Clock, CheckCircle, AlertTriangle, XCircle, PlayCircle } from 'lucide-react';
import type { ResponseTask, TaskStatus } from '../../types';
import ProvenanceBadge from '../ui/ProvenanceBadge';
import { updateTaskStatus, createTask } from '../../services/api';

const STATUS_STYLES: Record<TaskStatus, string> = {
  PENDING:     'bg-slate-800 text-slate-300 border-slate-600',
  APPROVED:    'bg-blue-950/80 text-blue-300 border-blue-500/60',
  IN_PROGRESS: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
  COMPLETED:   'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
  CANCELLED:   'bg-slate-900/80 text-slate-500 border-slate-700',
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  PENDING:     <Clock size={11} />,
  APPROVED:    <CheckCircle size={11} />,
  IN_PROGRESS: <PlayCircle size={11} />,
  COMPLETED:   <CheckCircle size={11} />,
  CANCELLED:   <XCircle size={11} />,
};

interface Props {
  tasks: ResponseTask[];
  onTasksChange: (tasks: ResponseTask[]) => void;
}

export default function TaskQueue({ tasks, onTasksChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  async function handleStatusChange(id: string, status: TaskStatus) {
    const updated = await updateTaskStatus(id, status, `Status changed to ${status} via Command Dashboard`);
    onTasksChange(updated);
  }

  async function handleCreateTask() {
    if (!newTitle.trim()) return;
    const task = await createTask({
      title: newTitle,
      description: newDesc,
      status: 'PENDING',
      provenance_tag: 'SIMULATED',
    });
    onTasksChange([task, ...tasks]);
    setNewTitle('');
    setNewDesc('');
    setShowNewForm(false);
  }

  const statusCounts = {
    active: tasks.filter(t => ['PENDING', 'APPROVED', 'IN_PROGRESS'].includes(t.status)).length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Response Tasks</h2>
              <ProvenanceBadge tag="SIMULATED" size="xs" />
            </div>
            <p className="text-white/40 text-xs mt-0.5">
              {statusCounts.active} active · {statusCounts.completed} completed
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-white/20 text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors"
          >
            <Plus size={12} />
            <span>New</span>
          </button>
        </div>

        {/* New task form */}
        {showNewForm && (
          <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
            <input
              type="text"
              placeholder="Task title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
            <textarea
              placeholder="Description (optional)..."
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateTask}
                className="px-3 py-1 bg-[#f4511e] text-white text-xs font-medium rounded hover:bg-[#c43f16] transition-colors"
              >
                Create [SIMULATED]
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-3 py-1 text-white/40 text-xs hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`border-b border-white/5 ${task.status === 'CANCELLED' ? 'opacity-50' : ''}`}
          >
            {/* Task row */}
            <div className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono flex-shrink-0 mt-0.5 ${STATUS_STYLES[task.status]}`}>
                  {STATUS_ICONS[task.status]}
                  {task.status}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium leading-snug">{task.title}</div>
                  {task.assigned_to && (
                    <div className="text-xs text-white/40 mt-0.5">→ {task.assigned_to}</div>
                  )}
                  {task.target_block && (
                    <div className="text-xs text-white/30 mt-0.5">Block: {task.target_block}</div>
                  )}
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                >
                  {expandedId === task.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Quick action buttons */}
              {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                <div className="flex items-center gap-1.5 mt-2 ml-0">
                  {task.status === 'PENDING' && (
                    <button
                      onClick={() => handleStatusChange(task.id, 'APPROVED')}
                      className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded hover:bg-blue-500/30 transition-colors font-mono"
                    >
                      APPROVE
                    </button>
                  )}
                  {task.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                      className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded hover:bg-amber-500/30 transition-colors font-mono"
                    >
                      DISPATCH
                    </button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                      className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded hover:bg-emerald-500/30 transition-colors font-mono"
                    >
                      COMPLETE
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange(task.id, 'CANCELLED')}
                    className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 transition-colors font-mono"
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>

            {/* Expanded audit log */}
            {expandedId === task.id && (
              <div className="px-4 pb-3 space-y-2">
                {task.description && (
                  <p className="text-xs text-white/50 pl-2 border-l border-white/10">{task.description}</p>
                )}
                <div className="bg-black/30 rounded p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-white/30 mb-2">
                    <Clock size={10} />
                    <span className="font-mono uppercase tracking-wider">Audit Trail</span>
                  </div>
                  {task.audit_log.map((entry, i) => (
                    <div key={i} className="flex gap-2 text-xs py-0.5">
                      <span className="text-white/20 font-mono flex-shrink-0 w-16 truncate">
                        {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-amber-400/80 font-mono flex-shrink-0">{entry.action}</span>
                      {entry.note && <span className="text-white/40 truncate">{entry.note}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <ProvenanceBadge tag={task.provenance_tag} size="xs" />
                  <AlertTriangle size={9} className="text-white/20" />
                  <span className="text-white/20">All dispatches are simulated for demonstration.</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
