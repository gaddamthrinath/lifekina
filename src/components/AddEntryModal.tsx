'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Transaction } from '@/lib/types';
import { getTodayISO, getCurrentTime } from '@/lib/utils';
import CategoryIcon from './CategoryIcon';

interface Props {
  onClose: () => void;
  editingTransaction?: Transaction;
}

export default function AddEntryModal({ onClose, editingTransaction }: Props) {
  const { createTransaction, editTransaction, getCategories, settings, currencySymbol } = useApp();
  const categories = getCategories();

  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : '');
  const [date, setDate] = useState(editingTransaction?.date ?? getTodayISO());
  const [time, setTime] = useState(editingTransaction?.time ?? getCurrentTime());
  const [categoryId, setCategoryId] = useState<string>(() => {
    if (editingTransaction?.categoryId) return editingTransaction.categoryId;
    const lastId = settings.lastUsedCategoryId;
    if (lastId && categories.some(c => c.id === lastId)) return lastId;
    return categories[0]?.id ?? '';
  });

  const [description, setDescription] = useState(editingTransaction?.description ?? '');
  const [note, setNote] = useState(editingTransaction?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      e.amount = 'Enter a valid positive amount';
    }
    if (!categoryId) {
      e.cat = 'Select a category';
    }
    if (!description.trim()) {
      e.desc = 'Enter a description';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = {
        amount: Number(amount),
        categoryId,
        description: description.trim(),
        note: note.trim(),
        date,
        time,
      };
      if (editingTransaction) {
        await editTransaction({ ...editingTransaction, ...data });
      } else {
        await createTransaction(data);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="modal-title">{editingTransaction ? 'Edit Expense' : 'Add Expense'}</div>
            <div className="modal-sub">Record an expense in your Lifekina workspace.</div>
          </div>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Amount */}
          <div className="fg">
            <label className="fg-label">Amount <span className="fg-req">*</span></label>
            <div className="amount-wrap">
              <span className="amount-sym">{currencySymbol}</span>
              <input
                ref={amountRef}
                id="entry-amount"
                className="fi amount-fi"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            {errors.amount && <span className="fg-err">{errors.amount}</span>}
          </div>

          {/* Date & Time */}
          <div className="fg-row">
            <div className="fg">
              <label className="fg-label">Date <span className="fg-req">*</span></label>
              <input
                id="entry-date"
                className="fi"
                type="date"
                value={date}
                max={getTodayISO()}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="fg-label">Time</label>
              <input
                id="entry-time"
                className="fi"
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="fg">
            <label className="fg-label">Category <span className="fg-req">*</span></label>
            <div className="cat-grid-sel">
              {categories.map(cat => {
                const sel = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`cat-item-btn${sel ? ' on' : ''}`}
                    onClick={() => setCategoryId(cat.id)}
                    style={{
                      borderColor: sel ? cat.color : undefined,
                      background: sel ? `${cat.color}15` : undefined,
                    }}
                  >
                    <div className="cat-item-ico" style={{ background: `${cat.color}${sel ? '25' : '15'}` }}>
                      <CategoryIcon name={cat.icon} size={14} color={cat.color} strokeWidth={2} />
                    </div>
                    <span className="cat-item-name" style={{ color: sel ? cat.color : undefined }}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.cat && <span className="fg-err">{errors.cat}</span>}
          </div>

          {/* Description */}
          <div className="fg">
            <label className="fg-label">Description <span className="fg-req">*</span></label>
            <input
              id="entry-desc"
              className="fi"
              type="text"
              placeholder="e.g., Grocery shopping, Gas station, Rent..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={250}
            />
            {errors.desc && <span className="fg-err">{errors.desc}</span>}
          </div>

          {/* Note */}
          <div className="fg">
            <label className="fg-label">Note <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              id="entry-note"
              className="fta"
              placeholder="Additional details..."
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} id="save-entry-btn">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
