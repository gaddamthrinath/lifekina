'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CheckSquare, Plus, Trash2, Calendar, Clock, CheckCircle2,
  X, Check, Search, Filter, Pencil, History, Play, CheckCircle
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TodoItem } from '@/lib/types';

type KanbanStatus = 'todo' | 'in-progress' | 'completed';
type PeriodType = 'monthly' | 'weekly' | 'quarterly' | 'yearly';

interface ColumnDef {
  id: KanbanStatus;
  title: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', badgeBg: '#f1f5f9', badgeColor: '#475569', borderColor: '#cbd5e1', icon: Clock },
  { id: 'in-progress', title: 'In Progress', badgeBg: '#fffbe6', badgeColor: '#d97706', borderColor: '#fde68a', icon: CheckSquare },
  { id: 'completed', title: 'Completed', badgeBg: '#ecfdf5', badgeColor: '#059669', borderColor: '#a7f3d0', icon: CheckCircle2 },
];

const STICKY_COLORS = [
  '#ffffff', // Clean White
  '#fef9c3', // Soft Pastel Yellow
  '#dcfce7', // Soft Mint Green
  '#e0f2fe', // Soft Sky Blue
  '#f3e8ff', // Soft Lavender Purple
  '#ffe4e6', // Soft Rose Pink
  '#ffedd5', // Soft Warm Peach
];

// Helper: Calculate ISO week number of a date
function getWeekNumber(date: Date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// Helper: Check if date is in specified period
function isDateInPeriod(
  dateObj: Date,
  periodType: PeriodType,
  year: number,
  month: number,
  week: number,
  quarter: number
): boolean {
  if (isNaN(dateObj.getTime())) return false;
  if (dateObj.getFullYear() !== year) return false;

  if (periodType === 'monthly') {
    return (dateObj.getMonth() + 1) === month;
  } else if (periodType === 'weekly') {
    return getWeekNumber(dateObj) === week;
  } else if (periodType === 'quarterly') {
    const q = Math.ceil((dateObj.getMonth() + 1) / 3);
    return q === quarter;
  } else if (periodType === 'yearly') {
    return true;
  }
  return true;
}

// Helper: Format duration in human readable string
function formatDuration(ms: number) {
  if (!ms || ms <= 0) return '0m';
  const mins = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${Math.max(1, mins)}m`;
}

function formatTimestamp(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TasksKanbanPage() {
  const { todos, createTodo, editTodo, moveTodoStatus, removeTodo } = useApp();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentWeek = getWeekNumber(now);
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Period Filter States
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [yearVal, setYearVal] = useState(currentYear);
  const [monthVal, setMonthVal] = useState(currentMonth);
  const [weekVal, setWeekVal] = useState(currentWeek);
  const [quarterVal, setQuarterVal] = useState(currentQuarter);

  // Search State
  const [search, setSearch] = useState('');

  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanStatus | null>(null);

  // Modal (Create / Edit) State
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoItem['priority']>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [cardColor, setCardColor] = useState(STICKY_COLORS[0]);
  const [targetStatus, setTargetStatus] = useState<KanbanStatus>('todo');
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  // Task Timeline & Details Modal State
  const [detailTodo, setDetailTodo] = useState<TodoItem | null>(null);

  const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Sync detailTodo state when todos update
  useEffect(() => {
    if (detailTodo) {
      const updated = todos.find(t => t.id === detailTodo.id);
      if (updated) setDetailTodo(updated);
    }
  }, [todos, detailTodo]);

  // Filter Tasks based on Period and Search Filters
  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      const d = t.dueDate ? new Date(t.dueDate + 'T00:00:00') : new Date(t.createdAt);
      if (!isDateInPeriod(d, periodType, yearVal, monthVal, weekVal, quarterVal)) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
      }

      return true;
    });
  }, [todos, periodType, yearVal, monthVal, weekVal, quarterVal, search]);

  // Categorize Tasks into Kanban Columns
  const tasksByColumn = useMemo(() => {
    const map: Record<KanbanStatus, TodoItem[]> = {
      'todo': [],
      'in-progress': [],
      'completed': [],
    };

    for (const t of filteredTodos) {
      if (t.completed || t.status === 'completed') {
        map['completed'].push(t);
      } else if (t.status === 'in-progress') {
        map['in-progress'].push(t);
      } else {
        map['todo'].push(t);
      }
    }
    return map;
  }, [filteredTodos]);

  const handleOpenAdd = (status: KanbanStatus = 'todo') => {
    setEditingTodo(null);
    setTargetStatus(status);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(new Date().toISOString().split('T')[0]);
    const autoColor = STICKY_COLORS[(todos.length + 1) % STICKY_COLORS.length];
    setCardColor(autoColor);
    setShowModal(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, t: TodoItem) => {
    e.stopPropagation();
    if (t.status === 'in-progress' || t.status === 'completed' || t.completed) {
      return;
    }
    setEditingTodo(t);
    setTargetStatus('todo');
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    setDueDate(t.dueDate || new Date().toISOString().split('T')[0]);
    setCardColor(t.color || STICKY_COLORS[0]);
    setShowModal(true);
  };

  const handleOpenDetail = (t: TodoItem) => {
    setDetailTodo(t);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editingTodo) {
        await editTodo({
          ...editingTodo,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          status: 'todo',
          color: cardColor,
        });
      } else {
        await createTodo({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          status: targetStatus,
          color: cardColor,
        });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, colId: KanbanStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      await moveTodoStatus(id, colId);
      setDraggedTaskId(null);
    }
  };

  const getPriorityStyle = (p: TodoItem['priority']) => {
    switch (p) {
      case 'high': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'High' };
      case 'medium': return { bg: '#fffbe6', color: '#d97706', border: '#fde68a', label: 'Medium' };
      case 'low': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Low' };
    }
  };

  const computeTaskDurations = (t: TodoItem) => {
    const timeline = t.timeline || [];

    const createdTs = t.createdAt;
    const inProgEvent = timeline.find(e => e.status === 'in-progress');
    const inProgTs = t.inProgressAt || (inProgEvent ? inProgEvent.timestamp : null);

    const compEvent = timeline.filter(e => e.status === 'completed').pop();
    const compTs = t.completedAt || (compEvent ? compEvent.timestamp : null);

    const timeInToDo = inProgTs ? (inProgTs - createdTs) : (compTs ? (compTs - createdTs) : (Date.now() - createdTs));

    let timeInProgress = 0;
    if (inProgTs) {
      timeInProgress = compTs ? (compTs - inProgTs) : (Date.now() - inProgTs);
    }

    const totalCompletionTime = compTs ? (compTs - createdTs) : (Date.now() - createdTs);

    return {
      createdTs,
      inProgTs,
      compTs,
      timeInToDo: Math.max(0, timeInToDo),
      timeInProgress: Math.max(0, timeInProgress),
      totalCompletionTime: Math.max(0, totalCompletionTime),
    };
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="pg-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="pg-title" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
            Daily Tasks &amp; Checklist
          </h1>
          <div className="pg-sub" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Organize tasks with period filters, card timelines, and persistent sticky note colors.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => handleOpenAdd('todo')} style={{ borderRadius: 6 }}>
            <Plus size={16} /> New Task Card
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-light)', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} /> Period:
          </span>
          {[
            { key: 'monthly', label: 'Monthly' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'quarterly', label: 'Quarterly' },
            { key: 'yearly', label: 'Yearly' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriodType(p.key as PeriodType)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: periodType === p.key ? 'var(--brand-dark)' : '#ffffff',
                color: periodType === p.key ? '#ffffff' : 'var(--text-sub)',
                border: `1px solid ${periodType === p.key ? 'var(--brand-dark)' : 'var(--border-light)'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Year:</span>
            <select
              className="fi"
              value={yearVal}
              onChange={e => setYearVal(Number(e.target.value))}
              style={{ padding: '4px 8px', fontSize: 12, height: 32, width: 85 }}
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          {periodType === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Month:</span>
              <select
                className="fi"
                value={monthVal}
                onChange={e => setMonthVal(Number(e.target.value))}
                style={{ padding: '4px 8px', fontSize: 12, height: 32, width: 110 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Week Selector */}
          {periodType === 'weekly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Week:</span>
              <select
                className="fi"
                value={weekVal}
                onChange={e => setWeekVal(Number(e.target.value))}
                style={{ padding: '4px 8px', fontSize: 12, height: 32, width: 95 }}
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quarter Selector */}
          {periodType === 'quarterly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Quarter:</span>
              <select
                className="fi"
                value={quarterVal}
                onChange={e => setQuarterVal(Number(e.target.value))}
                style={{ padding: '4px 8px', fontSize: 12, height: 32, width: 85 }}
              >
                <option value={1}>Q1 (Jan-Mar)</option>
                <option value={2}>Q2 (Apr-Jun)</option>
                <option value={3}>Q3 (Jul-Sep)</option>
                <option value={4}>Q4 (Oct-Dec)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Compact Search Bar Controls (Reduced Width) */}
      <div style={{ background: '#ffffff', borderRadius: 6, padding: '12px 16px', border: '1px solid var(--border-light)', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 240, flexShrink: 0 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            className="fi"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, borderRadius: 6, fontSize: 13, width: '100%' }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Showing {filteredTodos.length} tasks in Kanban Board
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const ColumnIcon = col.icon;
          const tasks = tasksByColumn[col.id];
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                background: isOver ? '#f1f5f9' : '#f8fafc',
                borderRadius: 6,
                border: isOver ? '2px dashed var(--brand)' : '1px solid var(--border-light)',
                padding: 14,
                maxHeight: '75vh',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ColumnIcon size={16} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                    {col.title}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: col.badgeBg, color: col.badgeColor, border: `1px solid ${col.borderColor}` }}>
                    {tasks.length}
                  </span>
                </div>

                <button className="ibtn" onClick={() => handleOpenAdd(col.id)} title={`Add card to ${col.title}`} style={{ background: '#ffffff', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                  <Plus size={15} />
                </button>
              </div>

              {/* Column Cards Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                {tasks.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', border: '1.5px dashed var(--border-strong)', borderRadius: 6, color: 'var(--text-light)', fontSize: 12, background: '#ffffff' }}>
                    Drop task card here or click + above
                  </div>
                ) : (
                  tasks.map(t => {
                    const pStyle = getPriorityStyle(t.priority);
                    const bg = t.color || '#ffffff';
                    const canEdit = !t.completed && (!t.status || t.status === 'todo');

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={e => handleDragStart(e, t.id)}
                        onClick={() => handleOpenDetail(t)}
                        style={{
                          background: bg,
                          borderRadius: 6,
                          padding: '12px 14px',
                          border: '1px solid var(--border-light)',
                          boxShadow: 'var(--shadow-xs)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.35 }}>
                            {t.title}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {canEdit && (
                              <button
                                className="ibtn"
                                style={{ color: 'var(--text-sub)', opacity: 0.8 }}
                                onClick={e => handleOpenEdit(e, t)}
                                title="Edit Task"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              className="ibtn"
                              style={{ color: '#dc2626', opacity: 0.8 }}
                              onClick={e => { e.stopPropagation(); setDelId(t.id); }}
                              title="Delete Task"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {t.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {t.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}`, textTransform: 'uppercase' }}>
                            {pStyle.label}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--brand-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <History size={12} /> Timeline
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TASK DETAIL & TIMELINE MODAL */}
      {detailTodo && (
        <div className="modal-bg" onClick={() => setDetailTodo(null)}>
          <div className="modal-box" style={{ maxWidth: 560, background: detailTodo.color || '#ffffff' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={18} color="var(--brand-dark)" /> {detailTodo.title}
                </div>
                <div className="modal-sub">Task details, duration metrics, and full timeline history.</div>
              </div>
              <button className="ibtn" onClick={() => setDetailTodo(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {detailTodo.description && (
                <div style={{ fontSize: 13.5, color: 'var(--text-main)', marginBottom: 16, padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                  {detailTodo.description}
                </div>
              )}



              {/* Duration Metrics Grid */}
              {(() => {
                const durations = computeTaskDurations(detailTodo);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                    <div style={{ background: 'rgba(255,255,255,0.85)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time in To Do</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                        {formatDuration(durations.timeInToDo)}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.85)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>In Progress Time</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
                        {formatDuration(durations.timeInProgress)}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.85)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Total Completion</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#047857', marginTop: 2 }}>
                        {formatDuration(durations.totalCompletionTime)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Full Timeline History Audit Log */}
              <div style={{ background: 'rgba(255,255,255,0.9)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <History size={14} color="var(--brand-dark)" /> Task Timeline &amp; State Changes:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', paddingLeft: 12, borderLeft: '2px solid var(--border-strong)' }}>
                  {(detailTodo.timeline && detailTodo.timeline.length > 0
                    ? detailTodo.timeline
                    : [{ status: detailTodo.status || 'todo', timestamp: detailTodo.createdAt, label: 'Task Created' }]
                  ).map((ev, i) => (
                    <div key={i} style={{ position: 'relative', paddingLeft: 10 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: -18,
                          top: 3,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: ev.status === 'completed' ? '#059669' : ev.status === 'in-progress' ? '#d97706' : 'var(--brand-dark)',
                          boxShadow: '0 0 0 3px #ffffff',
                        }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                        {ev.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {formatTimestamp(ev.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-outline btn-sm" onClick={() => setDetailTodo(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{editingTodo ? 'Edit Task Card' : 'New Task Card'}</div>
                <div className="modal-sub">{editingTodo ? 'Update task title, description, priority, or sticky note color.' : 'Add a task card to your workflow board.'}</div>
              </div>
              <button className="ibtn" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="fg">
                  <label className="fg-label">Task Title <span className="fg-req">*</span></label>
                  <input
                    type="text"
                    className="fi"
                    placeholder="What needs to be done?"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={80}
                    autoFocus
                    required
                  />
                </div>

                <div className="fg">
                  <label className="fg-label">Description (Optional)</label>
                  <textarea
                    className="fta"
                    rows={3}
                    placeholder="Add extra details or notes..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={160}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="fg">
                    <label className="fg-label">Priority</label>
                    <select className="fi" value={priority} onChange={e => setPriority(e.target.value as TodoItem['priority'])}>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div className="fg">
                    <label className="fg-label">Due Date</label>
                    <input type="date" className="fi" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* Sticky Note Color Selector */}
                <div className="fg" style={{ marginTop: 8 }}>
                  <label className="fg-label">Sticky Note Color Accent</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {STICKY_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCardColor(c)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: c,
                          border: `2px solid ${cardColor === c ? 'var(--brand)' : '#cbd5e1'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        {cardColor === c && <Check size={13} color="#000" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" type="submit" disabled={saving || !title.trim()}>
                  <Check size={14} /> {saving ? 'Saving...' : editingTodo ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {delId && (
        <ConfirmDialog
          title="Delete task card"
          description="Are you sure you want to delete this task card? This action cannot be undone."
          confirmLabel="Delete Task"
          onConfirm={async () => { await removeTodo(delId); setDelId(null); }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  );
}
