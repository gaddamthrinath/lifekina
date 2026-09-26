'use client';

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface AddTaskModalProps {
  initialDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const STICKY_COLORS = [
  '#ffffff',
  '#fef9c3',
  '#dcfce7',
  '#e0f2fe',
  '#f3e8ff',
  '#ffe4e6',
  '#ffedd5',
];

export default function AddTaskModal({ initialDate, isOpen, onClose, onSaved }: AddTaskModalProps) {
  const { createTodo } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [cardColor, setCardColor] = useState(STICKY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (initialDate) {
      setDueDate(initialDate);
    }
  }, [initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        status: 'todo',
        color: cardColor,
      });
      setTitle('');
      setDescription('');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Create Task Card</div>
            <div className="modal-sub">Add a task card to your workflow calendar.</div>
          </div>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="fg">
              <label className="fg-label">Task Title <span className="fg-req">*</span></label>
              <input
                type="text"
                className="fi"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                onChange={(e) => setDescription(e.target.value)}
                maxLength={160}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fg">
                <label className="fg-label">Priority</label>
                <select className="fi" value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="fg">
                <label className="fg-label">Due Date</label>
                <input type="date" className="fi" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="fg" style={{ marginTop: 8 }}>
              <label className="fg-label">Sticky Note Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {STICKY_COLORS.map((c) => (
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
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving || !title.trim()}>
              <Check size={14} /> {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
