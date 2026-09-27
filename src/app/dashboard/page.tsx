'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  TrendingDown, ArrowRight, CheckSquare, FileText,
  Tag, Receipt, CheckCircle2, Clock, Filter, Calendar,
  PieChart as PieIcon, BarChart3, Bookmark, ArrowLeftRight
} from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import EmptyState from '@/components/EmptyState';
import { formatAmount } from '@/lib/currencies';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

type DashboardTab = 'expenses' | 'tasks' | 'notes';
type PeriodType = 'monthly' | 'weekly' | 'quarterly' | 'yearly';

const TT_STYLE = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  fontSize: '12px',
  padding: '8px 12px',
};

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

export default function DashboardPage() {
  const {
    transactions,
    categories,
    todos,
    notes,
    currencySymbol,
    getCategoryById,
  } = useApp();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentWeek = getWeekNumber(now);
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Active Category/Tab Filter for Dashboard (Default: expenses)
  const [activeTab, setActiveTab] = useState<DashboardTab>('expenses');

  // Mounted state for reliable client-side SVG chart dimensions
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Source Filter State (All Sources / Created on this device / Synced from another device)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'imported'>('all');

  // Expense Period Filter States
  const [expPeriodType, setExpPeriodType] = useState<PeriodType>('monthly');
  const [expYear, setExpYear] = useState(currentYear);
  const [expMonth, setExpMonth] = useState(currentMonth);
  const [expWeek, setExpWeek] = useState(currentWeek);
  const [expQuarter, setExpQuarter] = useState(currentQuarter);

  // Task Period Filter States
  const [taskPeriodType, setTaskPeriodType] = useState<PeriodType>('monthly');
  const [taskYear, setTaskYear] = useState(currentYear);
  const [taskMonth, setTaskMonth] = useState(currentMonth);
  const [taskWeek, setTaskWeek] = useState(currentWeek);
  const [taskQuarter, setTaskQuarter] = useState(currentQuarter);

  // Notes Period Filter States
  const [notesPeriodType, setNotesPeriodType] = useState<PeriodType>('monthly');
  const [notesYear, setNotesYear] = useState(currentYear);
  const [notesMonth, setNotesMonth] = useState(currentMonth);
  const [notesWeek, setNotesWeek] = useState(currentWeek);
  const [notesQuarter, setNotesQuarter] = useState(currentQuarter);
  const [notesTagFilter, setNotesTagFilter] = useState<string>('all');

  const fmt = (v: number) => formatAmount(v, currencySymbol);
  const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. EXPENSES COMPUTATION FOR SELECTED EXPENSE PERIOD & SOURCE
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Source Filter
      if (sourceFilter === 'local' && t.syncOrigin === 'imported') return false;
      if (sourceFilter === 'imported' && t.syncOrigin !== 'imported') return false;

      const d = new Date(t.date + 'T00:00:00');
      return isDateInPeriod(d, expPeriodType, expYear, expMonth, expWeek, expQuarter);
    });
  }, [transactions, sourceFilter, expPeriodType, expYear, expMonth, expWeek, expQuarter]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const recentFilteredTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, 5);
  }, [filteredTransactions]);

  const expCatStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number; categoryName: string; categoryColor: string; categoryIcon: string }>();

    filteredTransactions.forEach(t => {
      const cat = getCategoryById(t.categoryId) || {
        id: 'cat-other',
        name: 'Other',
        color: '#6b7280',
        icon: 'Tag',
      };

      const key = cat.name.toLowerCase().trim();
      const existing = map.get(key) || {
        total: 0,
        count: 0,
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
      };

      map.set(key, {
        total: existing.total + t.amount,
        count: existing.count + 1,
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
      });
    });

    const stats: Array<{
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      categoryIcon: string;
      total: number;
      count: number;
      percentage: number;
    }> = [];

    map.forEach((stat, key) => {
      if (stat.total <= 0) return;
      const percentage = totalExpenses > 0 ? Math.round((stat.total / totalExpenses) * 100) : 0;
      stats.push({
        categoryId: key,
        categoryName: stat.categoryName,
        categoryColor: stat.categoryColor,
        categoryIcon: stat.categoryIcon,
        total: stat.total,
        count: stat.count,
        percentage,
      });
    });

    return stats.sort((a, b) => b.total - a.total);
  }, [filteredTransactions, getCategoryById, totalExpenses]);

  // Chart data for Expenses
  const expTrendChartData = useMemo(() => {
    if (expPeriodType === 'monthly') {
      const daysInM = new Date(expYear, expMonth, 0).getDate();
      const dayTotals = Array.from({ length: daysInM }, (_, i) => ({ label: `${i + 1}`, Expenses: 0 }));
      filteredTransactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const dayIdx = d.getDate() - 1;
        if (dayTotals[dayIdx]) dayTotals[dayIdx].Expenses += t.amount;
      });
      return dayTotals.map(d => ({ day: `Day ${d.label}`, Expenses: d.Expenses }));
    } else if (expPeriodType === 'weekly') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayTotals = days.map(d => ({ day: d, Expenses: 0 }));
      filteredTransactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const dayIdx = (d.getDay() + 6) % 7;
        if (dayTotals[dayIdx]) dayTotals[dayIdx].Expenses += t.amount;
      });
      return dayTotals;
    } else if (expPeriodType === 'quarterly') {
      const startM = (expQuarter - 1) * 3 + 1;
      const months = [startM, startM + 1, startM + 2];
      const monthTotals = months.map(m => ({
        day: new Date(expYear, m - 1).toLocaleDateString('en-US', { month: 'short' }),
        Expenses: 0,
      }));
      filteredTransactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const m = d.getMonth() + 1;
        const idx = m - startM;
        if (monthTotals[idx]) monthTotals[idx].Expenses += t.amount;
      });
      return monthTotals;
    } else {
      // Yearly
      const monthTotals = Array.from({ length: 12 }, (_, i) => ({
        day: new Date(expYear, i).toLocaleDateString('en-US', { month: 'short' }),
        Expenses: 0,
      }));
      filteredTransactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const m = d.getMonth();
        if (monthTotals[m]) monthTotals[m].Expenses += t.amount;
      });
      return monthTotals;
    }
  }, [filteredTransactions, expPeriodType, expYear, expMonth, expQuarter]);

  const pieChartData = expCatStats.map(c => ({
    name: c.categoryName,
    value: c.total,
    color: c.categoryColor,
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TASK COMPUTATION FOR SELECTED TASK PERIOD & SOURCE
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredTaskStats = useMemo(() => {
    const periodTodos = todos.filter(t => {
      // Source Filter
      if (sourceFilter === 'local' && t.syncOrigin === 'imported') return false;
      if (sourceFilter === 'imported' && t.syncOrigin !== 'imported') return false;

      const d = t.dueDate ? new Date(t.dueDate + 'T00:00:00') : new Date(t.createdAt);
      return isDateInPeriod(d, taskPeriodType, taskYear, taskMonth, taskWeek, taskQuarter);
    });

    const total = periodTodos.length;
    const completed = periodTodos.filter(t => t.completed || t.status === 'completed').length;
    const pending = total - completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const high = periodTodos.filter(t => t.priority === 'high');
    const highCompleted = high.filter(t => t.completed || t.status === 'completed').length;

    const med = periodTodos.filter(t => t.priority === 'medium');
    const medCompleted = med.filter(t => t.completed || t.status === 'completed').length;

    const low = periodTodos.filter(t => t.priority === 'low');
    const lowCompleted = low.filter(t => t.completed || t.status === 'completed').length;

    return {
      total,
      completed,
      pending,
      pct,
      highTotal: high.length,
      highCompleted,
      medTotal: med.length,
      medCompleted,
      lowTotal: low.length,
      lowCompleted,
    };
  }, [todos, sourceFilter, taskPeriodType, taskYear, taskMonth, taskWeek, taskQuarter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. NOTES COMPUTATION FOR SELECTED NOTES PERIOD & SOURCE
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredAllNotes = useMemo(() => {
    return notes.filter(n => {
      if (sourceFilter === 'local' && n.syncOrigin === 'imported') return false;
      if (sourceFilter === 'imported' && n.syncOrigin !== 'imported') return false;
      return true;
    });
  }, [notes, sourceFilter]);

  const allNoteTags = useMemo(() => {
    const tagsSet = new Set<string>();
    filteredAllNotes.forEach(n => n.tags?.forEach(t => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [filteredAllNotes]);

  const filteredPeriodNotes = useMemo(() => {
    return filteredAllNotes.filter(n => {
      const d = new Date(n.createdAt);
      const inPeriod = isDateInPeriod(d, notesPeriodType, notesYear, notesMonth, notesWeek, notesQuarter);
      const matchTag = notesTagFilter === 'all' || (n.tags && n.tags.includes(notesTagFilter));
      return inPeriod && matchTag;
    });
  }, [filteredAllNotes, notesPeriodType, notesYear, notesMonth, notesWeek, notesQuarter, notesTagFilter]);

  const notesStats = useMemo(() => {
    const totalInPeriod = filteredPeriodNotes.length;
    const pinnedInPeriod = filteredPeriodNotes.filter(n => n.isPinned).length;
    const taggedInPeriod = filteredPeriodNotes.filter(n => n.tags && n.tags.length > 0).length;

    return {
      totalInPeriod,
      pinnedInPeriod,
      taggedInPeriod,
      overallTotal: filteredAllNotes.length,
      overallPinned: filteredAllNotes.filter(n => n.isPinned).length,
    };
  }, [filteredPeriodNotes, filteredAllNotes]);

  const greeting = (() => {
    const h = now.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  // Render helper for filter bar
  const renderPeriodFilterBar = (
    periodType: PeriodType,
    setPeriodType: (p: PeriodType) => void,
    yearVal: number,
    setYearVal: (y: number) => void,
    monthVal: number,
    setMonthVal: (m: number) => void,
    weekVal: number,
    setWeekVal: (w: number) => void,
    quarterVal: number,
    setQuarterVal: (q: number) => void
  ) => (
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

          {/* Month Selector (if monthly) */}
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

          {/* Week Selector (if weekly) */}
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

          {/* Quarter Selector (if quarterly) */}
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
  );

  return (
    <div className="dashboard">
      <div className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="dashboard-eyebrow">
            {greeting}! Welcome to your central workspace overview.
          </div>
          <h1 className="dashboard-title">Your day, in one place.</h1>
          <div className="dashboard-period">A calm view of your spending, priorities, and ideas.</div>
        </div>

        {/* Global Dashboard Source Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            id="dashboard-source-filter"
            className="filter-select-standalone"
            style={{ minWidth: 175, fontWeight: 600 }}
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value as 'all' | 'local' | 'imported')}
          >
            <option value="all">Source: All Records</option>
            <option value="local">Created on this device</option>
            <option value="imported">Synced from another device</option>
          </select>
        </div>
      </div>

      {/* Category Tab Filter Selector (Expenses, Tasks, Notes) */}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard category filter">
        {[
          { key: 'expenses', label: `Expenses (${fmt(totalExpenses)})`, icon: Receipt },
          { key: 'tasks', label: `Daily Tasks (${filteredTaskStats.pending} pending)`, icon: CheckSquare },
          { key: 'notes', label: `Notes (${notesStats.totalInPeriod})`, icon: FileText },
        ].map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key as DashboardTab)}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
              role="tab"
              aria-selected={active}
            >
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </div>

      {/* Top 3 Summary Cards - Each Card reflects its OWN Period Filter Data */}
      <section className="dashboard-summary" aria-label="Personal summary">
        {/* Card 1: Expenses Summary Card */}
        <div
          className={`dashboard-summary-card ${activeTab === 'expenses' ? 'active-summary-card' : ''}`}
          onClick={() => setActiveTab('expenses')}
          title="Click to view Expenses statistics"
        >
          <div>
            <span className="summary-label">Expenses Summary</span>
            <div className="summary-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <TrendingDown size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="summary-value">{fmt(totalExpenses)}</div>
          <div className="summary-meta">
            {expPeriodType.toUpperCase()} expenditure ({filteredTransactions.length} entries)
          </div>
        </div>

        {/* Card 2: Pending Tasks Summary Card */}
        <div
          className={`dashboard-summary-card ${activeTab === 'tasks' ? 'active-summary-card' : ''}`}
          onClick={() => setActiveTab('tasks')}
          title="Click to view Task statistics"
        >
          <div>
            <span className="summary-label">Pending Tasks</span>
            <div className="summary-icon" style={{ background: '#fffbe6', color: '#d97706' }}>
              <CheckSquare size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="summary-value">{filteredTaskStats.pending}</div>
          <div className="summary-meta">
            {filteredTaskStats.completed} completed of {filteredTaskStats.total} ({taskPeriodType.toUpperCase()})
          </div>
        </div>

        {/* Card 3: Personal Notes Summary Card */}
        <div
          className={`dashboard-summary-card ${activeTab === 'notes' ? 'active-summary-card' : ''}`}
          onClick={() => setActiveTab('notes')}
          title="Click to view Notes statistics"
        >
          <div>
            <span className="summary-label">Personal Notes</span>
            <div className="summary-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <FileText size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="summary-value">{notesStats.totalInPeriod}</div>
          <div className="summary-meta">
            {notesStats.pinnedInPeriod} pinned ({notesPeriodType.toUpperCase()})
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         EXPENSES VIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <section className="dashboard-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Receipt size={18} color="var(--brand-dark)" /> Expense Analytics &amp; Trends
                </h3>
                <div className="dashboard-panel-subtitle">
                  Filter spending trends over monthly, weekly, quarterly, or yearly views
                </div>
              </div>
              <Link href="/entries" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                View All Expense Entries <ArrowRight size={14} />
              </Link>
            </div>

            {/* Time Period Filter Bar for Expenses */}
            {renderPeriodFilterBar(
              expPeriodType, setExpPeriodType,
              expYear, setExpYear,
              expMonth, setExpMonth,
              expWeek, setExpWeek,
              expQuarter, setExpQuarter
            )}

            {!isMounted ? (
              <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Loading chart visualization...
              </div>
            ) : expTrendChartData.length === 0 || totalExpenses === 0 ? (
              <EmptyState
                icon={<Receipt size={24} />}
                title="No expenses for selected period"
                description="Adjust your period filter or add expenses in the Expenses section to track spending trends."
              />
            ) : (
              <div style={{ width: '100%', height: 260, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                  <LineChart data={expTrendChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={expPeriodType === 'monthly' ? 2 : 0}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={TT_STYLE} formatter={(v: any) => [fmt(Number(v ?? 0)), 'Expenses']} />
                    <Line type="monotone" dataKey="Expenses" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Side-by-Side: Top Categories Bar Chart & Pie Chart */}
          <div className="dashboard-split">
            {/* Left: Top Categories Bar Chart */}
            <section className="dashboard-panel">
              <h3 style={{ margin: 0 }}>Top Categories</h3>
              <div className="dashboard-panel-subtitle" style={{ marginBottom: 18 }}>
                Category spending distribution bar chart for selected period
              </div>

              {!isMounted ? (
                <div style={{ width: '100%', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Loading category chart...
                </div>
              ) : expCatStats.length === 0 ? (
                <EmptyState
                  icon={<Tag size={20} />}
                  title="No category data"
                  description="Category breakdown will appear once expenses are recorded."
                  compact={true}
                />
              ) : (
                <div style={{ width: '100%', height: 250, minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                    <BarChart data={expCatStats} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="categoryName"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                      />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={TT_STYLE} formatter={(v: any) => [fmt(Number(v ?? 0)), 'Spending']} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {expCatStats.map((entry, idx) => (
                          <Cell key={`bar-${idx}`} fill={entry.categoryColor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Right: Category Pie Chart */}
            <section className="dashboard-panel">
              <h3 style={{ margin: 0 }}>Spending Mix</h3>
              <div className="dashboard-panel-subtitle" style={{ marginBottom: 18 }}>
                Where your money went in the selected period
              </div>

              {!isMounted ? (
                <div style={{ width: '100%', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Loading spending mix...
                </div>
              ) : pieChartData.length === 0 ? (
                <EmptyState
                  icon={<PieIcon size={20} />}
                  title="No spending mix data"
                  description="Record expenses in this period to view your pie distribution."
                  compact={true}
                />
              ) : (
                <div style={{ width: '100%', height: 250, minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TT_STYLE} formatter={(v: any) => [fmt(Number(v ?? 0)), 'Amount']} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Recent Activity Section for Expenses with Sync Origin Badges */}
          {recentFilteredTransactions.length > 0 && (
            <section className="dashboard-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                  Recent Expenses in Selected Period ({recentFilteredTransactions.length})
                </h3>
                <Link href="/entries" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  View All <ArrowRight size={13} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentFilteredTransactions.map((tx) => {
                  const cat = getCategoryById(tx.categoryId);
                  const isSynced = tx.syncOrigin === 'imported';

                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 6,
                        background: '#ffffff',
                        border: '1px solid var(--border-light)',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: cat ? `${cat.color}18` : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Tag size={15} color={cat?.color || 'var(--text-muted)'} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
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
                                  flexShrink: 0,
                                }}
                              >
                                <ArrowLeftRight size={9} /> Synced
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {tx.date} • {cat?.name || 'Uncategorized'}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', flexShrink: 0, fontFamily: 'var(--font-heading)' }}>
                        {fmt(tx.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Call to Action Navigation Link for Expenses */}
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed var(--border-strong)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)', marginRight: 12 }}>
              Need to record, edit or review full expense entries?
            </span>
            <Link href="/entries" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Open Full Expense Manager <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
         DAILY TASKS VIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <section className="dashboard-panel" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={18} color="var(--brand-dark)" /> Daily Task Dashboard &amp; Statistics
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Task performance metrics across monthly, weekly, quarterly, and yearly filters
              </div>
            </div>

            <Link href="/tasks" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Manage All Tasks <ArrowRight size={14} />
            </Link>
          </div>

          {/* Task Time Period Filter Bar */}
          {renderPeriodFilterBar(
            taskPeriodType, setTaskPeriodType,
            taskYear, setTaskYear,
            taskMonth, setTaskMonth,
            taskWeek, setTaskWeek,
            taskQuarter, setTaskQuarter
          )}

          {/* Task Statistics Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 16px', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Completed Tasks</span>
                <CheckCircle2 size={18} color="#16a34a" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#14532d', marginTop: 4 }}>
                {filteredTaskStats.completed}
              </div>
              <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 2 }}>
                {filteredTaskStats.pct}% of period total
              </div>
            </div>

            <div style={{ background: '#fffbe6', border: '1px solid #fef08a', padding: '14px 16px', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>In Progress / Pending</span>
                <Clock size={18} color="#d97706" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#713f12', marginTop: 4 }}>
                {filteredTaskStats.pending}
              </div>
              <div style={{ fontSize: 11.5, color: '#a16207', marginTop: 2 }}>
                Awaiting completion
              </div>
            </div>

            <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', padding: '14px 16px', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>Total Tasks</span>
                <Calendar size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0c4a6e', marginTop: 4 }}>
                {filteredTaskStats.total}
              </div>
              <div style={{ fontSize: 11.5, color: '#0369a1', marginTop: 2 }}>
                Recorded in selected period
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', padding: '14px 16px', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completion Rate</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-dark)' }}>{filteredTaskStats.pct}%</span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
                <div style={{ width: `${filteredTaskStats.pct}%`, height: '100%', background: 'var(--brand-dark)', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                Overall rate for period
              </div>
            </div>
          </div>

          {/* Priority Breakdown Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>High Priority</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                  {filteredTaskStats.highCompleted} / {filteredTaskStats.highTotal} Completed
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                {filteredTaskStats.highTotal > 0 ? Math.round((filteredTaskStats.highCompleted / filteredTaskStats.highTotal) * 100) : 0}%
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Medium Priority</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                  {filteredTaskStats.medCompleted} / {filteredTaskStats.medTotal} Completed
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                {filteredTaskStats.medTotal > 0 ? Math.round((filteredTaskStats.medCompleted / filteredTaskStats.medTotal) * 100) : 0}%
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Low Priority</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                  {filteredTaskStats.lowCompleted} / {filteredTaskStats.lowTotal} Completed
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                {filteredTaskStats.lowTotal > 0 ? Math.round((filteredTaskStats.lowCompleted / filteredTaskStats.lowTotal) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Call to Action Navigation Link for Tasks */}
          <div style={{ marginTop: 20, textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed var(--border-strong)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)', marginRight: 12 }}>
              Need to add, edit or check off full task items?
            </span>
            <Link href="/tasks" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Open Full Task Manager <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
         NOTES VIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <section className="dashboard-panel" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#0284c7" /> Personal Notes Dashboard &amp; Statistics
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Notes statistics filtered by period, year, and tag classification
              </div>
            </div>
            <Link href="/notes" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Manage All Notes <ArrowRight size={14} />
            </Link>
          </div>

          {/* Notes Time Period Filter Bar */}
          {renderPeriodFilterBar(
            notesPeriodType, setNotesPeriodType,
            notesYear, setNotesYear,
            notesMonth, setNotesMonth,
            notesWeek, setNotesWeek,
            notesQuarter, setNotesQuarter
          )}

          {/* Notes Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ padding: '16px', background: '#e0f2fe', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Period Notes Count</span>
                <FileText size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0c4a6e', marginTop: 4 }}>{notesStats.totalInPeriod}</div>
              <div style={{ fontSize: 11.5, color: '#0369a1', marginTop: 2 }}>
                Created in selected period ({notesStats.overallTotal} total)
              </div>
            </div>

            <div style={{ padding: '16px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Pinned Notes</span>
                <Bookmark size={18} color="#d97706" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#78350f', marginTop: 4 }}>{notesStats.pinnedInPeriod}</div>
              <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 2 }}>
                Pinned in period ({notesStats.overallPinned} total)
              </div>
            </div>

            <div style={{ padding: '16px', background: '#f3e8ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Tagged Notes</span>
                <Tag size={18} color="#9333ea" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#581c87', marginTop: 4 }}>{notesStats.taggedInPeriod}</div>
              <div style={{ fontSize: 11.5, color: '#6b21a8', marginTop: 2 }}>
                Classified with tags in period
              </div>
            </div>

            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Total Categories</span>
                <BarChart3 size={18} color="#16a34a" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#14532d', marginTop: 4 }}>{allNoteTags.length}</div>
              <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 2 }}>
                Unique note tags total
              </div>
            </div>
          </div>

          {/* Tag Filter Selector Bar */}
          <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-light)', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' }}>Tag Filter Breakdown:</span>
              <select
                className="fi"
                value={notesTagFilter}
                onChange={e => setNotesTagFilter(e.target.value)}
                style={{ fontSize: 12, height: 34, minWidth: 140 }}
              >
                <option value="all">All Tags ({notes.length} notes)</option>
                {allNoteTags.map(t => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {filteredPeriodNotes.length} notes stats for target period &amp; tag
            </div>
          </div>

          {/* Call to Action Navigation Link for Notes */}
          <div style={{ marginTop: 20, textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed var(--border-strong)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)', marginRight: 12 }}>
              Want to create, read, edit or organize full notes?
            </span>
            <Link href="/notes" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Open Full Notes Manager <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
