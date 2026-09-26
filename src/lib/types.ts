// EntryType is always 'expense' — this is a pure expense tracker
export type EntryType = 'expense';

export type ThemeType = 'light';

export type DateFormatType = 'MMM DD, YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY';

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // hex color
  createdAt: number;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  description: string;
  note: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM 24h
  createdAt: number;
}

export interface Settings {
  currency: string;
  currencySymbol: string;
  dateFormat: DateFormatType;
  isOnboarded: boolean;
  lastUsedCategoryId: string;
  webAuthnEnabled?: boolean;
  webAuthnCredentialId?: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export interface TransactionFilters {
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MonthStats {
  totalExpenses: number;
  transactionCount: number;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyTotal {
  date: string;
  expenses: number;
}

export interface TaskTimelineEvent {
  status: 'todo' | 'in-progress' | 'completed';
  timestamp: number;
  label: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string; // Optional short description (max 160 chars)
  completed: boolean;
  status?: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // YYYY-MM-DD
  categoryId?: string;
  color?: string; // Sticky note background color
  createdAt: number;
  inProgressAt?: number; // Timestamp when task moved to in-progress
  completedAt?: number; // Timestamp when task moved to completed
  timeline?: TaskTimelineEvent[]; // Full transition history
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned?: boolean;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarReminder {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM 24h
  priority?: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  notified?: boolean;
  createdAt: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  todos?: TodoItem[];
  notes?: NoteItem[];
  reminders?: CalendarReminder[];
  settings: Partial<Settings>;
}

