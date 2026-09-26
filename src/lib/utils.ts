import { DateFormatType } from './types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getTodayISO(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(isoDate: string, format: DateFormatType): string {
  const [year, month, day] = isoDate.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (format === 'MMM DD, YYYY') {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
  if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  }
  return `${month}/${day}/${year}`;
}

export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function getPrevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function groupTransactionsByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const existing = map.get(item.date) ?? [];
    existing.push(item);
    map.set(item.date, existing);
  }
  return map;
}

export function formatTime12h(time: string): string {
  const [hourStr, min] = time.split(':');
  const hour = Number(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isoToLabel(isoDate: string, format: DateFormatType): string {
  const today = getTodayISO();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';

  const [year, month, day] = isoDate.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dayName}, ${formatDate(isoDate, format)}`;
}
