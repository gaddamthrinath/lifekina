'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, SortAsc, SortDesc, MoreVertical, Pencil, Trash2,
  ListFilter, Plus, Tag, Check, X, Filter, ChevronLeft, ChevronRight,
  TrendingDown, Receipt, Calculator, Calendar, ArrowLeftRight
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useApp } from '@/context/AppContext';
import AddEntryModal from '@/components/AddEntryModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import CategoryIcon from '@/components/CategoryIcon';
import { formatAmount } from '@/lib/currencies';
import { isoToLabel, formatTime12h } from '@/lib/utils';
import { Transaction, Category } from '@/lib/types';

type SortField = 'date' | 'amount';
type SortDir = 'asc' | 'desc';
type PeriodType = 'monthly' | 'weekly' | 'quarterly' | 'yearly';
interface MenuState { id: string; x: number; y: number; }

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

interface CatFormState { name: string; icon: string; color: string; }

const ITEMS_PER_PAGE = 10;

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

export default function EntriesPage() {
  const {
    transactions,
    removeTransaction,
    categories,
    createCategory,
    editCategory,
    removeCategory,
    getCategoryById,
    currencySymbol,
    settings,
  } = useApp();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentWeek = getWeekNumber(now);
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Period Filter States (Same as Dashboard)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [yearVal, setYearVal] = useState(currentYear);
  const [monthVal, setMonthVal] = useState(currentMonth);
  const [weekVal, setWeekVal] = useState(currentWeek);
  const [quarterVal, setQuarterVal] = useState(currentQuarter);

  // Search, Sort & Pagination
  const [search, setSearch] = useState('');
  const [sortF, setSortF] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'imported'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Menu State
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [delId, setDelId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Category Manager State
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState<CatFormState>({ name: '', icon: ICONS[0], color: COLORS[0] });
  const [catSaving, setCatSaving] = useState(false);
  const [catNameErr, setCatNameErr] = useState('');
  const [delCatId, setDelCatId] = useState<string | null>(null);

  const dateFormat = settings.dateFormat ?? 'MMM DD, YYYY';
  const fmt = (v: number) => formatAmount(v, currencySymbol);
  const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, periodType, yearVal, monthVal, weekVal, quarterVal, sortF, sortDir, sourceFilter]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const openMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ id, x: rect.right, y: rect.bottom + 4 });
  }, []);

  // Filter transactions by period, search query & sync origin source
  const filtered = useMemo(() =>
    transactions
      .filter(tx => {
        // Source Filter (Local vs Synced)
        if (sourceFilter === 'local' && tx.syncOrigin === 'imported') return false;
        if (sourceFilter === 'imported' && tx.syncOrigin !== 'imported') return false;

        // Period Filter
        const d = new Date(tx.date + 'T00:00:00');
        if (!isDateInPeriod(d, periodType, yearVal, monthVal, weekVal, quarterVal)) {
          return false;
        }

        // Search Query Filter
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const cat = getCategoryById(tx.categoryId);
        return (
          tx.description.toLowerCase().includes(q) ||
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (cat && cat.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortF === 'amount') return sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount;
        const d = b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
        return sortDir === 'desc' ? d : -d;
      }),
    [transactions, sourceFilter, periodType, yearVal, monthVal, weekVal, quarterVal, search, sortF, sortDir, getCategoryById]);

  // Total expenditure & stats for filtered set
  const totalAmount = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [filtered]);

  const avgAmount = useMemo(() => {
    return filtered.length > 0 ? Math.round(totalAmount / filtered.length) : 0;
  }, [filtered, totalAmount]);

  // Pagination slicing
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const toggleSort = (f: SortField) => {
    if (sortF === f) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortF(f); setSortDir('desc'); }
  };

  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', icon: ICONS[0], color: COLORS[0] });
    setCatNameErr('');
    setShowCatForm(true);
  };

  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setCatNameErr('');
    setShowCatForm(true);
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) {
      setCatNameErr('Category name is required');
      return;
    }
    setCatSaving(true);
    try {
      if (editingCat) {
        await editCategory({ ...editingCat, ...catForm, name: catForm.name.trim() });
      } else {
        await createCategory({ ...catForm, name: catForm.name.trim() });
      }
      setShowCatForm(false);
    } finally {
      setCatSaving(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Expenses</h1>
          <div className="pg-sub">Manage expenditure entries and expense categories.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setShowCatModal(true)}>
            <Tag size={15} /> Categories ({categories.length})
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(undefined); setModal(true); }} id="expenses-add-btn">
            <Plus size={16} strokeWidth={2.5} /> Add Expense
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="filter-bar-card">
        <div className="filter-bar-row">
          <div className="filter-bar-group">
            <span className="filter-control-label">
              <Filter size={13} /> Period:
            </span>
            <div className="period-segmented-wrap">
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
                  className={`period-pill-btn ${periodType === p.key ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-bar-group">
            {/* Year Selector */}
            <div className="filter-control-wrap">
              <span className="filter-control-label">Year:</span>
              <select
                className="filter-control-select"
                value={yearVal}
                onChange={e => setYearVal(Number(e.target.value))}
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            {periodType === 'monthly' && (
              <div className="filter-control-wrap">
                <span className="filter-control-label">Month:</span>
                <select
                  className="filter-control-select"
                  value={monthVal}
                  onChange={e => setMonthVal(Number(e.target.value))}
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
              <div className="filter-control-wrap">
                <span className="filter-control-label">Week:</span>
                <select
                  className="filter-control-select"
                  value={weekVal}
                  onChange={e => setWeekVal(Number(e.target.value))}
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quarter Selector */}
            {periodType === 'quarterly' && (
              <div className="filter-control-wrap">
                <span className="filter-control-label">Quarter:</span>
                <select
                  className="filter-control-select"
                  value={quarterVal}
                  onChange={e => setQuarterVal(Number(e.target.value))}
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
      </div>

      {/* Prominent Dedicated Header Stat Card for Total Amount */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px 20px', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Expenses
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#065f46', marginTop: 6, fontFamily: 'var(--font-heading)' }}>
            {fmt(totalAmount)}
          </div>
          <div style={{ fontSize: 12, color: '#047857', marginTop: 4, fontWeight: 500 }}>
            {periodType.toUpperCase()} Total ({filtered.length} entries)
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', padding: '16px 20px', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Entries
            </span>
            <Receipt size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 6, fontFamily: 'var(--font-heading)' }}>
            {filtered.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Recorded in selected period
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', padding: '16px 20px', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Average / Entry
            </span>
            <Calculator size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 6, fontFamily: 'var(--font-heading)' }}>
            {fmt(avgAmount)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Per expense record average
          </div>
        </div>
      </div>

      {/* Search & Sort Toolbar Card */}
      <div className="filter-bar-card" style={{ marginBottom: 16 }}>
        <div className="filter-bar-row">
          <div className="filter-search-box">
            <Search size={15} className="search-ico" />
            <input
              id="entries-search"
              className="filter-search-input"
              type="text"
              placeholder="Search by description, note, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-bar-group">
            {/* Source Filter Dropdown */}
            <select
              id="entries-source-filter"
              className="filter-select-standalone"
              style={{ minWidth: 165 }}
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as 'all' | 'local' | 'imported')}
            >
              <option value="all">Source: All Records</option>
              <option value="local">Created on this device</option>
              <option value="imported">Synced from another device</option>
            </select>

            <button
              className="filter-btn-compact btn btn-outline btn-sm"
              onClick={() => toggleSort('date')}
              style={{ fontWeight: sortF === 'date' ? 700 : 500, borderColor: sortF === 'date' ? 'var(--brand)' : undefined, color: sortF === 'date' ? 'var(--brand-dark)' : undefined }}
            >
              {sortF === 'date' && sortDir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
              Date
            </button>
            <button
              className="filter-btn-compact btn btn-outline btn-sm"
              onClick={() => toggleSort('amount')}
              style={{ fontWeight: sortF === 'amount' ? 700 : 500, borderColor: sortF === 'amount' ? 'var(--brand)' : undefined, color: sortF === 'amount' ? 'var(--brand-dark)' : undefined }}
            >
              {sortF === 'amount' ? (sortDir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />) : null}
              Amount
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Receipt size={24} />}
            title={search || sourceFilter !== 'all' ? 'No expenses match your filters' : 'No expenses for selected period'}
            description={search || sourceFilter !== 'all' ? 'Try adjusting your search terms or source filter.' : 'Adjust period filter or click "+ Add Expense" above to record an entry.'}
            action={
              !search && sourceFilter === 'all' ? (
                <button className="btn btn-primary" onClick={() => { setEditing(undefined); setModal(true); }}>
                  <Plus size={15} /> Add Expense
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Desktop Table View (>= 769px) */}
          <div className="desktop-expense-table">
            <div className="entry-table-head">
              <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>
                Date &amp; Time {sortF === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </span>
              <span>Description</span>
              <span>Category</span>
              <span style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('amount')}>
                Amount {sortF === 'amount' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </span>
              <span />
            </div>

            {/* Zebra Striped Table Rows */}
            {paginatedList.map((tx, idx) => {
              const cat = getCategoryById(tx.categoryId);
              const isOdd = idx % 2 !== 0;
              const isSynced = tx.syncOrigin === 'imported';

              return (
                <div
                  key={tx.id}
                  className="entry-row"
                  style={{
                    background: isOdd ? '#f8fafc' : '#ffffff',
                    borderBottom: '1px solid var(--border-sub)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
                      {isoToLabel(tx.date, dateFormat)}
                    </div>
                    <div className="entry-time">{formatTime12h(tx.time)}</div>
                  </div>

                  <div className="entry-main">
                    <div className="entry-ico" style={{ background: cat ? `${cat.color}15` : 'var(--bg-subtle)' }}>
                      {cat && <CategoryIcon name={cat.icon} size={16} color={cat.color} strokeWidth={2} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="entry-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} title={tx.description}>
                        <span>{tx.description}</span>
                        {isSynced && (
                          <span
                            title="Synced from another device"
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              background: 'var(--brand-light)',
                              color: 'var(--brand-dark)',
                              padding: '1px 6px',
                              borderRadius: 'var(--r-full)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <ArrowLeftRight size={10} /> Synced
                          </span>
                        )}
                      </div>
                      {tx.note && <div className="entry-note" title={tx.note}>{tx.note}</div>}
                    </div>
                  </div>

                  {cat ? (
                    <div>
                      <span className="cat-pill" style={{ background: `${cat.color}15`, color: cat.color }}>
                        <CategoryIcon name={cat.icon} size={11} color={cat.color} strokeWidth={2} />
                        {cat.name}
                      </span>
                    </div>
                  ) : <div />}

                  <div className="entry-amount-col">
                    <span className="entry-amount">{fmt(tx.amount)}</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <button className="ibtn" onClick={e => openMenu(e, tx.id)} aria-label="Options">
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile & Tablet Card Items (<= 768px) */}
          <div className="mobile-expense-list">
            {paginatedList.map((tx, idx) => {
              const cat = getCategoryById(tx.categoryId);
              const isSynced = tx.syncOrigin === 'imported';

              return (
                <div
                  key={tx.id}
                  className="mobile-expense-card"
                  style={{
                    borderBottom: idx === paginatedList.length - 1 ? 'none' : '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    {/* Left: Icon & Description & Metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        className="entry-ico"
                        style={{
                          background: cat ? `${cat.color}15` : 'var(--bg-subtle)',
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      >
                        {cat ? (
                          <CategoryIcon name={cat.icon} size={17} color={cat.color} strokeWidth={2} />
                        ) : (
                          <Tag size={17} color="var(--text-muted)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                            {tx.description}
                          </span>
                          {isSynced && (
                            <span
                              title="Synced from another device"
                              style={{
                                fontSize: 9.5,
                                fontWeight: 600,
                                background: 'var(--brand-light)',
                                color: 'var(--brand-dark)',
                                padding: '1px 5px',
                                borderRadius: 'var(--r-full)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              <ArrowLeftRight size={9} /> Synced
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: cat ? cat.color : 'var(--text-sub)' }}>
                            {cat?.name || 'Uncategorized'}
                          </span>
                          <span>•</span>
                          <span>{isoToLabel(tx.date, dateFormat)}</span>
                          <span>•</span>
                          <span>{formatTime12h(tx.time)}</span>
                        </div>

                        {tx.note && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.note}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                        {fmt(tx.amount)}
                      </span>
                      <button className="ibtn" onClick={e => openMenu(e, tx.id)} aria-label="Options" style={{ padding: 4 }}>
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls Footer */}
          <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${currentPage === p ? 'var(--brand-dark)' : 'var(--border-light)'}`,
                      background: currentPage === p ? 'var(--brand-dark)' : '#ffffff',
                      color: currentPage === p ? '#ffffff' : 'var(--text-sub)',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Menu */}
      {menu && (
        <div
          className="dropdown-menu"
          style={{ top: menu.y, right: `calc(100vw - ${menu.x}px)` }}
          onClick={e => e.stopPropagation()}
        >
          <button className="dropdown-item" onClick={() => { const tx = transactions.find(t => t.id === menu.id); if (tx) { setEditing(tx); setModal(true); } setMenu(null); }}>
            <Pencil size={14} /> Edit Expense
          </button>
          <button className="dropdown-item danger" onClick={() => { setDelId(menu.id); setMenu(null); }}>
            <Trash2 size={14} /> Delete Expense
          </button>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {modal && <AddEntryModal onClose={() => { setModal(false); setEditing(undefined); }} editingTransaction={editing} />}

      {/* Category Manager Modal */}
      {showCatModal && (
        <div className="modal-bg" onClick={() => setShowCatModal(false)}>
          <div className="modal-box" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Expense Categories</div>
                <div className="modal-sub">Create and edit category labels for your expenses.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={openAddCat}>
                  <Plus size={14} /> Add Category
                </button>
                <button className="ibtn" onClick={() => setShowCatModal(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.map(cat => {
                  const txCount = transactions.filter(t => t.categoryId === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CategoryIcon name={cat.icon} size={16} color={cat.color} strokeWidth={2} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{txCount} {txCount === 1 ? 'expense' : 'expenses'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ibtn" onClick={() => openEditCat(cat)}>
                          <Pencil size={14} />
                        </button>
                        <button className="ibtn" style={{ color: '#dc2626' }} onClick={() => setDelCatId(cat.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Create/Edit Form */}
      {showCatForm && (
        <div className="modal-bg" onClick={() => setShowCatForm(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{editingCat ? 'Edit Category' : 'New Category'}</div>
                <div className="modal-sub">Create or update an expense category.</div>
              </div>
              <button className="ibtn" onClick={() => setShowCatForm(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="fg">
                <label className="fg-label">Category Name <span className="fg-req">*</span></label>
                <input
                  id="cat-name-input"
                  className="fi"
                  type="text"
                  placeholder="e.g., Dining out, Transport, Subscriptions..."
                  value={catForm.name}
                  onChange={e => { setCatForm(f => ({ ...f, name: e.target.value })); setCatNameErr(''); }}
                  maxLength={30}
                  autoFocus
                />
                {catNameErr && <span className="fg-err">{catNameErr}</span>}
              </div>

              <div className="fg">
                <label className="fg-label">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', padding: 4, border: '1px solid var(--border-light)', borderRadius: 'var(--r-sm)' }}>
                  {ICONS.map(name => {
                    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>)[name];
                    if (!Icon) return null;
                    const sel = catForm.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setCatForm(f => ({ ...f, icon: name }))}
                        style={{
                          width: 32, height: 32,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 'var(--r-sm)',
                          border: `1.5px solid ${sel ? catForm.color : 'var(--border-light)'}`,
                          background: sel ? `${catForm.color}15` : 'var(--bg-surface)',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon size={14} color={sel ? catForm.color : 'var(--text-light)'} strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="fg">
                <label className="fg-label">Color Accent</label>
                <div className="swatches">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`swatch${catForm.color === c ? ' on' : ''}`}
                      style={{ background: c }}
                      onClick={() => setCatForm(f => ({ ...f, color: c }))}
                    >
                      {catForm.color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-outline btn-sm" onClick={() => setShowCatForm(false)} disabled={catSaving}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveCat} disabled={catSaving}>
                <Check size={14} /> {catSaving ? 'Saving…' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {delId && (
        <ConfirmDialog
          title="Delete expense"
          description="This action will permanently delete this expense record. It cannot be undone."
          confirmLabel="Delete Expense"
          onConfirm={async () => { await removeTransaction(delId); setDelId(null); }}
          onCancel={() => setDelId(null)}
        />
      )}

      {delCatId && (
        <ConfirmDialog
          title="Delete category"
          description="Transactions assigned to this category will remain, but will no longer have a linked category label."
          confirmLabel="Delete Category"
          onConfirm={async () => { await removeCategory(delCatId); setDelCatId(null); }}
          onCancel={() => setDelCatId(null)}
        />
      )}
    </div>
  );
}
