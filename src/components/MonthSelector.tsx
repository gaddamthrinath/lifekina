'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatMonthYear, getPrevMonth, getNextMonth } from '@/lib/utils';

interface Props { year: number; month: number; onChange: (y: number, m: number) => void; }

export default function MonthSelector({ year, month, onChange }: Props) {
  const now = new Date();
  const atMax = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  return (
    <div className="month-sel">
      <Calendar size={13} color="var(--t4)" strokeWidth={2} />
      <span className="month-sel-label">{formatMonthYear(year, month)}</span>
      <button className="month-nav-btn" onClick={() => { const p = getPrevMonth(year, month); onChange(p.year, p.month); }} aria-label="Previous month">
        <ChevronLeft size={14} strokeWidth={2} />
      </button>
      <button className="month-nav-btn" onClick={() => { if (atMax) return; const n = getNextMonth(year, month); onChange(n.year, n.month); }} disabled={atMax} aria-label="Next month">
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
