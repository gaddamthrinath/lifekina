'use client';

import React, { useState } from 'react';
import { X, Bell, Clock, AlertCircle } from 'lucide-react';
import { CalendarReminder } from '@/lib/types';
import { addReminder } from '@/lib/db';

interface AddReminderModalProps {
  initialDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddReminderModal({ initialDate, isOpen, onClose, onSaved }: AddReminderModalProps) {
  const defaultDate = initialDate || new Date().toISOString().slice(0, 10);
  const defaultTime = new Date().toTimeString().slice(0, 5);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial date if passed
  React.useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const newReminder: CalendarReminder = {
        id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time,
        priority,
        isCompleted: false,
        notified: false,
        createdAt: Date.now(),
      };

      await addReminder(newReminder);
      setTitle('');
      setDescription('');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to create reminder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 className="modal-title">Set Calendar Reminder</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Get browser alerts &amp; sound chimes for this event
              </p>
            </div>
          </div>
          <button type="button" className="icon-btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Reminder Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Doctor appointment, Pay Electricity bill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Time (24h)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="time"
                  className="form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Priority Level</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['low', 'medium', 'high'] as const).map((p) => {
                const isSelected = priority === p;
                const colors = {
                  low: { bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981', text: '#059669' },
                  medium: { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#d97706' },
                  high: { bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444', text: '#dc2626' },
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? colors[p].border : 'var(--border-subtle)'}`,
                      background: isSelected ? colors[p].bg : 'transparent',
                      color: isSelected ? colors[p].text : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: '0.82rem',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Note / Description (Optional)</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Add details, links, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Setting...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
