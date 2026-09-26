'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Tag, Check, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import CategoryIcon from '@/components/CategoryIcon';
import EmptyState from '@/components/EmptyState';
import { formatAmount } from '@/lib/currencies';
import { Category } from '@/lib/types';

const ICONS = [
  'UtensilsCrossed', 'Car', 'ShoppingBag', 'FileText', 'Heart', 'BookOpen', 'Tv',
  'Banknote', 'Laptop', 'TrendingUp', 'Gift', 'Home', 'Plane', 'Coffee', 'Dumbbell',
  'Music', 'ShoppingCart', 'Wifi', 'Smartphone', 'Fuel', 'Bus', 'Train',
  'Stethoscope', 'GraduationCap', 'Gamepad2', 'Camera', 'MoreHorizontal',
];

const COLORS = [
  '#f97316', '#3b82f6', '#a855f7', '#ef4444', '#ec4899', '#14b8a6',
  '#f59e0b', '#6b7280', '#22c55e', '#10b981', '#06b6d4', '#f43f5e',
  '#8b5cf6', '#0ea5e9', '#84cc16', '#e11d48',
];

interface FormState { name: string; icon: string; color: string; }

export default function CategoriesPage() {
  const { categories, createCategory, editCategory, removeCategory, transactions, currencySymbol } = useApp();
  const [delId, setDelId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', icon: ICONS[0], color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [nameErr, setNameErr] = useState('');

  const fmt = (v: number) => formatAmount(v, currencySymbol);

  const catStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const tx of transactions) {
      const s = map.get(tx.categoryId) ?? { count: 0, total: 0 };
      map.set(tx.categoryId, { count: s.count + 1, total: s.total + tx.amount });
    }
    return map;
  }, [transactions]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', icon: ICONS[0], color: COLORS[0] });
    setNameErr('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setNameErr('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setNameErr('Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await editCategory({ ...editing, ...form, name: form.name.trim() });
      } else {
        await createCategory({ ...form, name: form.name.trim() });
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Categories</h1>
          <div className="pg-sub">Organize and group your expenses effectively.</div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-primary" onClick={openAdd} id="add-cat-btn">
            <Plus size={16} strokeWidth={2.5} /> Add Category
          </button>
        </div>
      </div>

      {/* Category Counter Banner */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 500 }}>
        {categories.length} {categories.length === 1 ? 'Expense Category' : 'Expense Categories'} configured
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Tag size={28} />}
            title="No categories configured"
            description="Add your first category to group and analyze your spending."
            action={
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <Plus size={14} /> Add Category
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="ct-head">
            <div />
            <div>Category Name</div>
            <div>Transactions</div>
            <div>Total Spend</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {categories.map(cat => {
            const s = catStats.get(cat.id) ?? { count: 0, total: 0 };
            return (
              <div key={cat.id} className="ct-row">
                {/* Icon */}
                <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CategoryIcon name={cat.icon} size={16} color={cat.color} strokeWidth={2} />
                </div>

                {/* Name */}
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>

                {/* Count */}
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{s.count} {s.count === 1 ? 'entry' : 'entries'}</span>

                {/* Total */}
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{s.total > 0 ? fmt(s.total) : '—'}</span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button className="ibtn" onClick={() => openEdit(cat)} aria-label="Edit" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button
                    className="ibtn"
                    onClick={() => setDelId(cat.id)}
                    aria-label="Delete"
                    title="Delete"
                    style={{ color: 'var(--exp)', background: 'var(--exp-bg)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showForm && (
        <div className="modal-bg" onClick={() => setShowForm(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{editing ? 'Edit Category' : 'New Category'}</div>
                <div className="modal-sub">Create or update an expense category.</div>
              </div>
              <button className="ibtn" onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Category Name */}
              <div className="fg">
                <label className="fg-label">Category Name <span className="fg-req">*</span></label>
                <input
                  id="cat-name"
                  className="fi"
                  type="text"
                  placeholder="e.g., Dining out, Transport, Subscriptions..."
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameErr(''); }}
                  maxLength={30}
                  autoFocus
                />
                {nameErr && <span className="fg-err">{nameErr}</span>}
              </div>

              {/* Icon Picker */}
              <div className="fg">
                <label className="fg-label">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 150, overflowY: 'auto', padding: 4, border: '1px solid var(--border-light)', borderRadius: 'var(--r-sm)' }}>
                  {ICONS.map(name => {
                    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>)[name];
                    if (!Icon) return null;
                    const sel = form.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, icon: name }))}
                        style={{
                          width: 34, height: 34,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 'var(--r-sm)',
                          border: `1.5px solid ${sel ? form.color : 'var(--border-light)'}`,
                          background: sel ? `${form.color}15` : 'var(--bg-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                        title={name}
                      >
                        <Icon size={15} color={sel ? form.color : 'var(--text-light)'} strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="fg">
                <label className="fg-label">Color Accent</label>
                <div className="swatches">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`swatch${form.color === c ? ' on' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      title={c}
                    >
                      {form.color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-light)', marginTop: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: `${form.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CategoryIcon name={form.icon} size={18} color={form.color} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{form.name || 'Category Preview'}</span>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} id="save-cat-btn">
                <Check size={14} /> {saving ? 'Saving…' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {delId && (
        <ConfirmDialog
          title="Delete category"
          description="Transactions assigned to this category will remain, but will no longer have a linked category label."
          confirmLabel="Delete Category"
          onConfirm={async () => { await removeCategory(delId); setDelId(null); }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  );
}
