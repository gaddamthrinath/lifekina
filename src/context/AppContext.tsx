'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  Transaction,
  Category,
  Settings,
  CategoryStats,
  MonthStats,
  DailyTotal,
  TransactionFilters,
  TodoItem,
  TaskTimelineEvent,
  NoteItem,
} from '@/lib/types';
import {
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  setSetting,
  getAllSettings,
  exportAllData,
  importAllData,
  clearAllData,
} from '@/lib/db';
import { generateId, getMonthRange, getDaysInMonth } from '@/lib/utils';
import { getCurrencyByCode } from '@/lib/currencies';

import LockScreen from '@/components/LockScreen';

// Default expense categories with standardized universal IDs
export const DEFAULT_CATEGORIES: Array<{ id: string; name: string; icon: string; color: string }> = [
  { id: 'cat-food', name: 'Food', icon: 'UtensilsCrossed', color: '#f97316' },
  { id: 'cat-transport', name: 'Transport', icon: 'Car', color: '#3b82f6' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#a855f7' },
  { id: 'cat-bills', name: 'Bills', icon: 'FileText', color: '#ef4444' },
  { id: 'cat-health', name: 'Health', icon: 'Heart', color: '#ec4899' },
  { id: 'cat-education', name: 'Education', icon: 'BookOpen', color: '#14b8a6' },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'Tv', color: '#f59e0b' },
  { id: 'cat-other', name: 'Other', icon: 'MoreHorizontal', color: '#6b7280' },
];

interface AppContextValue {
  // Data
  transactions: Transaction[];
  categories: Category[];
  todos: TodoItem[];
  notes: NoteItem[];
  settings: Partial<Settings>;
  isLoading: boolean;
  isLocked: boolean;
  unlockApp: () => void;
  lockApp: () => void;

  // Settings helpers
  currencySymbol: string;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;

  // Transactions
  createTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  editTransaction: (tx: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  getFilteredTransactions: (filters: TransactionFilters) => Transaction[];

  // Categories
  createCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
  editCategory: (cat: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  getCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;

  // Todos
  createTodo: (data: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => Promise<void>;
  editTodo: (todo: TodoItem) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  moveTodoStatus: (id: string, status: 'todo' | 'in-progress' | 'completed') => Promise<void>;
  removeTodo: (id: string) => Promise<void>;

  // Notes
  createNote: (data: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editNote: (note: NoteItem) => Promise<void>;
  togglePinNote: (id: string) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  // Analytics helpers
  getMonthStats: (year: number, month: number) => MonthStats;
  getCategoryStats: (year: number, month: number) => CategoryStats[];
  getDailyTotals: (year: number, month: number) => DailyTotal[];
  getInsights: (year: number, month: number) => string[];

  // Data management
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  clearData: () => Promise<void>;
  reloadAll: () => Promise<void>;

  // Onboarding
  isOnboarded: boolean;
  completeOnboarding: (
    currency: string,
    dateFormat: Settings['dateFormat'],
    webAuthnEnabled?: boolean,
    webAuthnCredentialId?: string
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const initialized = useRef(false);

  const loadAll = useCallback(async () => {
    const [txs, cats, tds, nts, s] = await Promise.all([
      getAllTransactions(),
      getAllCategories(),
      getAllTodos(),
      getAllNotes(),
      getAllSettings(),
    ]);
    setTransactions(txs);
    setCategories(cats);
    setTodos(tds);
    setNotes(nts);
    const typedSettings = s as Partial<Settings>;
    setSettings(typedSettings);
    setIsOnboarded(!!typedSettings.isOnboarded);

    // Lock screen logic: Check if biometric security is enabled and tab session is unauthenticated
    const isAuthRequired = !!typedSettings.webAuthnEnabled;
    const isTabAuthed = typeof window !== 'undefined' && (sessionStorage.getItem('lifekina_authed') === 'true' || sessionStorage.getItem('privledger_authed') === 'true');
    setIsLocked(isAuthRequired && !isTabAuthed);
  }, []);

  const unlockApp = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lifekina_authed', 'true');
    }
    setIsLocked(false);
  }, []);

  const lockApp = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('lifekina_authed');
      sessionStorage.removeItem('privledger_authed');
    }
    setIsLocked(true);
  }, []);

  // Seed default categories & perform self-healing migration for existing transactions
  const seedCategories = useCallback(async () => {
    const existing = await getAllCategories();
    const existingMapByName = new Map<string, Category>(existing.map(c => [c.name.toLowerCase().trim(), c]));
    const existingMapById = new Map<string, Category>(existing.map(c => [c.id, c]));

    // 1. Ensure all default categories exist with standard universal IDs
    for (const def of DEFAULT_CATEGORIES) {
      const matchByName = existingMapByName.get(def.name.toLowerCase().trim());
      const matchById = existingMapById.get(def.id);

      if (!matchByName && !matchById) {
        const newCat: Category = { ...def, createdAt: Date.now() };
        await addCategory(newCat);
        existingMapById.set(def.id, newCat);
        existingMapByName.set(def.name.toLowerCase().trim(), newCat);
      }
    }

    // 2. Self-Healing Migration: Check all existing transactions to ensure categoryId references a valid category
    const allCategoriesNow = await getAllCategories();
    const validCatIds = new Set(allCategoriesNow.map(c => c.id));
    const catNameMap = new Map<string, string>(allCategoriesNow.map(c => [c.name.toLowerCase().trim(), c.id]));
    const defaultOtherId = catNameMap.get('other') || 'cat-other';

    const allTxs = await getAllTransactions();
    for (const tx of allTxs) {
      if (!validCatIds.has(tx.categoryId)) {
        const lowerCatId = (tx.categoryId || '').toLowerCase().trim();
        let targetCatId: string | undefined;

        for (const [name, id] of catNameMap.entries()) {
          if (lowerCatId.includes(name) || name.includes(lowerCatId) || lowerCatId === id.toLowerCase()) {
            targetCatId = id;
            break;
          }
        }

        const repairedCatId = targetCatId || defaultOtherId;
        await updateTransaction({ ...tx, categoryId: repairedCatId });
      }
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        await seedCategories();
        await loadAll();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadAll, seedCategories]);

  const currencySymbol = getCurrencyByCode(settings.currency ?? 'INR')?.symbol ?? '₹';

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    await setSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── Transactions ─────────────────────────────────────────────────────────────

  const createTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tx: Transaction = { ...data, id: generateId(), createdAt: Date.now() };
    await addTransaction(tx);
    await setSetting('lastUsedCategoryId', data.categoryId);
    setSettings(prev => ({ ...prev, lastUsedCategoryId: data.categoryId }));
    setTransactions(prev => [tx, ...prev].sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.time.localeCompare(a.time);
    }));
  }, []);

  const editTransaction = useCallback(async (tx: Transaction) => {
    await updateTransaction(tx);
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t).sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.time.localeCompare(a.time);
    }));
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const getFilteredTransactions = useCallback((filters: TransactionFilters): Transaction[] => {
    return transactions.filter(tx => {
      if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
      if (filters.dateFrom && tx.date < filters.dateFrom) return false;
      if (filters.dateTo && tx.date > filters.dateTo) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!tx.description.toLowerCase().includes(q) && !tx.note.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [transactions]);

  // ─── Categories ──────────────────────────────────────────────────────────────

  const createCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt'>) => {
    const cat: Category = { ...data, id: generateId(), createdAt: Date.now() };
    await addCategory(cat);
    setCategories(prev => [...prev, cat]);
  }, []);

  const editCategory = useCallback(async (cat: Category) => {
    await updateCategory(cat);
    setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCategories = useCallback((): Category[] => categories, [categories]);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    if (!id) return categories.find(c => c.id === 'cat-other' || c.name.toLowerCase() === 'other') || categories[0];
    const exact = categories.find(c => c.id === id);
    if (exact) return exact;

    // Match by standard ID name or lowercase title
    const normalizedKey = id.replace(/^cat-/, '').toLowerCase().trim();
    const byName = categories.find(c => c.name.toLowerCase().trim() === normalizedKey || c.id.toLowerCase().trim() === normalizedKey);
    if (byName) return byName;

    // Fallback to static default definition
    const def = DEFAULT_CATEGORIES.find(c => c.id === id || c.name.toLowerCase().trim() === normalizedKey);
    if (def) return { ...def, createdAt: 0 };

    return categories.find(c => c.id === 'cat-other' || c.name.toLowerCase() === 'other') || categories[0];
  }, [categories]);

  // ─── Todos ───────────────────────────────────────────────────────────────────

  const createTodo = useCallback(async (data: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => {
    const now = Date.now();
    const status = data.status || 'todo';
    const initialEvent: TaskTimelineEvent = {
      status,
      timestamp: now,
      label: status === 'in-progress' ? 'Task Created (In Progress)' : status === 'completed' ? 'Task Created (Completed)' : 'Task Created (To Do)',
    };
    const item: TodoItem = {
      ...data,
      id: generateId(),
      completed: status === 'completed',
      status,
      createdAt: now,
      inProgressAt: status === 'in-progress' ? now : undefined,
      completedAt: status === 'completed' ? now : undefined,
      timeline: [initialEvent],
    };
    await addTodo(item);
    setTodos(prev => [item, ...prev]);
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    const item = todos.find(t => t.id === id);
    if (!item) return;
    const isNowCompleted = !item.completed;
    const now = Date.now();
    const newStatus: 'todo' | 'in-progress' | 'completed' = isNowCompleted ? 'completed' : 'todo';
    const existingTimeline: TaskTimelineEvent[] = item.timeline && item.timeline.length > 0
      ? item.timeline
      : [{ status: item.status || 'todo', timestamp: item.createdAt, label: 'Task Created' }];
    const newEvent: TaskTimelineEvent = { status: newStatus, timestamp: now, label: isNowCompleted ? 'Marked as Completed' : 'Re-opened to To Do' };

    const updated: TodoItem = {
      ...item,
      completed: isNowCompleted,
      status: newStatus,
      completedAt: isNowCompleted ? now : undefined,
      timeline: [...existingTimeline, newEvent],
    };
    await updateTodo(updated);
    setTodos(prev => prev.map(t => t.id === id ? updated : t));
  }, [todos]);

  const moveTodoStatus = useCallback(async (id: string, status: 'todo' | 'in-progress' | 'completed') => {
    const item = todos.find(t => t.id === id);
    if (!item) return;
    if (item.status === status) return;

    const now = Date.now();
    let eventLabel = 'Moved back to To Do';
    if (status === 'in-progress') eventLabel = 'Moved to In Progress';
    if (status === 'completed') eventLabel = 'Marked as Completed';

    const existingTimeline: TaskTimelineEvent[] = item.timeline && item.timeline.length > 0
      ? item.timeline
      : [{ status: item.status || 'todo', timestamp: item.createdAt, label: 'Task Created' }];

    const newEvent: TaskTimelineEvent = { status, timestamp: now, label: eventLabel };

    const updated: TodoItem = {
      ...item,
      status,
      completed: status === 'completed',
      inProgressAt: status === 'in-progress' && !item.inProgressAt ? now : item.inProgressAt,
      completedAt: status === 'completed' ? now : (status === 'todo' || status === 'in-progress' ? undefined : item.completedAt),
      timeline: [...existingTimeline, newEvent],
    };
    await updateTodo(updated);
    setTodos(prev => prev.map(t => t.id === id ? updated : t));
  }, [todos]);

  const editTodo = useCallback(async (todo: TodoItem) => {
    const updated: TodoItem = {
      ...todo,
      completed: todo.status === 'completed',
    };
    await updateTodo(updated);
    setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
  }, []);

  const removeTodo = useCallback(async (id: string) => {
    await deleteTodo(id);
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Notes ───────────────────────────────────────────────────────────────────

  const createNote = useCallback(async (data: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const item: NoteItem = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await addNote(item);
    setNotes(prev => [item, ...prev]);
  }, []);

  const editNote = useCallback(async (note: NoteItem) => {
    const updated = { ...note, updatedAt: Date.now() };
    await updateNote(updated);
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
  }, []);

  const togglePinNote = useCallback(async (id: string) => {
    const item = notes.find(n => n.id === id);
    if (!item) return;
    const updated: NoteItem = { ...item, isPinned: !item.isPinned, updatedAt: Date.now() };
    await updateNote(updated);
    setNotes(prev => prev.map(n => n.id === id ? updated : n).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    }));
  }, [notes]);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // ─── Analytics ───────────────────────────────────────────────────────────────

  const getMonthStats = useCallback((year: number, month: number): MonthStats => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxs = transactions.filter(tx => tx.date.startsWith(prefix));
    const totalExpenses = monthTxs.reduce((s, t) => s + t.amount, 0);
    return { totalExpenses, transactionCount: monthTxs.length };
  }, [transactions]);

  const getCategoryStats = useCallback((year: number, month: number): CategoryStats[] => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxs = transactions.filter(tx => tx.date.startsWith(prefix));
    const total = monthTxs.reduce((s, t) => s + t.amount, 0);

    const amtMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const tx of monthTxs) {
      amtMap.set(tx.categoryId, (amtMap.get(tx.categoryId) ?? 0) + tx.amount);
      countMap.set(tx.categoryId, (countMap.get(tx.categoryId) ?? 0) + 1);
    }

    return Array.from(amtMap.entries())
      .map(([categoryId, catTotal]) => {
        const cat = categories.find(c => c.id === categoryId);
        return {
          categoryId,
          categoryName: cat?.name ?? 'Unknown',
          categoryColor: cat?.color ?? '#6b7280',
          categoryIcon: cat?.icon ?? 'MoreHorizontal',
          total: catTotal,
          count: countMap.get(categoryId) ?? 0,
          percentage: total > 0 ? Math.round((catTotal / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  const getDailyTotals = useCallback((year: number, month: number): DailyTotal[] => {
    const days = getDaysInMonth(year, month);
    const result: DailyTotal[] = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTxs = transactions.filter(tx => tx.date === dateStr);
      result.push({ date: dateStr, expenses: dayTxs.reduce((s, t) => s + t.amount, 0) });
    }
    return result;
  }, [transactions]);

  const getInsights = useCallback((year: number, month: number): string[] => {
    const insights: string[] = [];
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxs = transactions.filter(tx => tx.date.startsWith(prefix));

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevTxs = transactions.filter(tx => tx.date.startsWith(prevPrefix));

    const totalThis = monthTxs.reduce((s, t) => s + t.amount, 0);
    const totalPrev = prevTxs.reduce((s, t) => s + t.amount, 0);

    if (totalPrev > 0 && totalThis > 0) {
      const diff = Math.round(((totalThis - totalPrev) / totalPrev) * 100);
      if (diff < 0) insights.push(`You spent ${Math.abs(diff)}% less than last month.`);
      else if (diff > 0) insights.push(`You spent ${diff}% more than last month.`);
    }

    const catStats = getCategoryStats(year, month);
    const prevCatStats = getCategoryStats(prevYear, prevMonth);
    if (catStats.length > 0 && prevCatStats.length > 0) {
      const top = catStats[0];
      const prevTop = prevCatStats.find(c => c.categoryId === top.categoryId);
      if (prevTop && prevTop.total > 0) {
        const diff = Math.round(((top.total - prevTop.total) / prevTop.total) * 100);
        if (diff > 0) insights.push(`Your ${top.categoryName} spending is ${diff}% higher than last month.`);
        else if (diff < 0) insights.push(`You spent ${Math.abs(diff)}% less on ${top.categoryName} than last month.`);
      }
    }

    const { from, to } = getMonthRange(year, month);
    const days = getDaysInMonth(year, month);
    let freeDays = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dateStr > to || dateStr < from) continue;
      if (!monthTxs.some(tx => tx.date === dateStr)) freeDays++;
    }
    if (freeDays > 0) insights.push(`You had ${freeDays} expense-free days this month.`);

    const largest = [...monthTxs].sort((a, b) => b.amount - a.amount)[0];
    if (largest) {
      const cat = getCategoryById(largest.categoryId);
      insights.push(`Largest expense: ${largest.description}${cat ? ` (${cat.name})` : ''}.`);
    }

    return insights.slice(0, 4);
  }, [transactions, getCategoryStats, getCategoryById]);

  // ─── Data Management ──────────────────────────────────────────────────────────

  const exportData = useCallback(async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifekina-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    await importAllData(data);
    await loadAll();
  }, [loadAll]);

  const clearData = useCallback(async () => {
    await clearAllData();
    setTransactions([]);
    setCategories([]);
    setTodos([]);
    setNotes([]);
    setSettings({});
    setIsOnboarded(false);
    await seedCategories();
    await loadAll();
  }, [loadAll, seedCategories]);

  // ─── Onboarding ──────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(async (
    currency: string,
    dateFormat: Settings['dateFormat'],
    webAuthnEnabled = false,
    webAuthnCredentialId?: string
  ) => {
    const currencyData = getCurrencyByCode(currency);
    await setSetting('currency', currency);
    await setSetting('currencySymbol', currencyData?.symbol ?? currency);
    await setSetting('dateFormat', dateFormat);
    await setSetting('webAuthnEnabled', webAuthnEnabled);
    if (webAuthnCredentialId) {
      await setSetting('webAuthnCredentialId', webAuthnCredentialId);
    }
    await setSetting('isOnboarded', true);
    setSettings(prev => ({
      ...prev,
      currency,
      currencySymbol: currencyData?.symbol ?? currency,
      dateFormat,
      webAuthnEnabled,
      webAuthnCredentialId,
      isOnboarded: true,
    }));
    setIsOnboarded(true);
  }, []);

  const value: AppContextValue = {
    transactions,
    categories,
    todos,
    notes,
    settings,
    isLoading,
    isLocked,
    unlockApp,
    lockApp,
    currencySymbol,
    updateSetting,
    createTransaction,
    editTransaction,
    removeTransaction,
    getFilteredTransactions,
    createCategory,
    editCategory,
    removeCategory,
    getCategories,
    getCategoryById,
    createTodo,
    editTodo,
    toggleTodo,
    moveTodoStatus,
    removeTodo,
    createNote,
    editNote,
    togglePinNote,
    removeNote,
    getMonthStats,
    getCategoryStats,
    getDailyTotals,
    getInsights,
    exportData,
    importData,
    clearData,
    reloadAll: loadAll,
    isOnboarded,
    completeOnboarding,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {isLocked && isOnboarded && (
        <LockScreen
          webAuthnEnabled={settings.webAuthnEnabled}
          webAuthnCredentialId={settings.webAuthnCredentialId}
          onUnlock={unlockApp}
          onResetData={clearData}
        />
      )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
