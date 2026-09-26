'use client';

import React from 'react';
import { Transaction, TodoItem, CalendarReminder } from '@/lib/types';
import { Receipt, CheckSquare, Bell, Plus } from 'lucide-react';

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: string;
  currencySymbol: string;
  viewMode: 'month' | 'week';
  transactions: Transaction[];
  todos: TodoItem[];
  reminders: CalendarReminder[];
  onSelectDate: (dateStr: string) => void;
  onAddReminderForDate: (dateStr: string) => void;
}

interface DayCellData {
  dateObj: Date;
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  dayExpenses: number;
  expenseCount: number;
  taskCount: number;
  taskCompletedCount: number;
  reminderCount: number;
  reminderList: CalendarReminder[];
}

export default function CalendarGrid({
  currentMonth,
  selectedDate,
  currencySymbol,
  viewMode,
  transactions,
  todos,
  reminders,
  onSelectDate,
  onAddReminderForDate,
}: CalendarGridProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Group data by YYYY-MM-DD
  const dataByDate = React.useMemo(() => {
    const txMap = new Map<string, { total: number; count: number }>();
    transactions.forEach((tx) => {
      const existing = txMap.get(tx.date) || { total: 0, count: 0 };
      txMap.set(tx.date, {
        total: existing.total + tx.amount,
        count: existing.count + 1,
      });
    });

    const todoMap = new Map<string, { total: number; completed: number }>();
    todos.forEach((td) => {
      const dateKey = td.dueDate || new Date(td.createdAt).toISOString().slice(0, 10);
      const existing = todoMap.get(dateKey) || { total: 0, completed: 0 };
      todoMap.set(dateKey, {
        total: existing.total + 1,
        completed: existing.completed + (td.completed ? 1 : 0),
      });
    });

    const remMap = new Map<string, CalendarReminder[]>();
    reminders.forEach((r) => {
      const existing = remMap.get(r.date) || [];
      existing.push(r);
      remMap.set(r.date, existing);
    });

    return { txMap, todoMap, remMap };
  }, [transactions, todos, reminders]);

  // Generate Days
  const days: DayCellData[] = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    if (viewMode === 'week') {
      // Find Sunday or Monday of current week
      const anchorDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
      const dayOfWeek = anchorDate.getDay();
      const startOfWeek = new Date(anchorDate);
      startOfWeek.setDate(anchorDate.getDate() - dayOfWeek);

      const weekDays: DayCellData[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const txData = dataByDate.txMap.get(dateStr);
        const todoData = dataByDate.todoMap.get(dateStr);
        const remList = dataByDate.remMap.get(dateStr) || [];

        weekDays.push({
          dateObj: d,
          dateStr,
          dayNum: d.getDate(),
          isCurrentMonth: d.getMonth() === month,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate,
          dayExpenses: txData?.total || 0,
          expenseCount: txData?.count || 0,
          taskCount: todoData?.total || 0,
          taskCompletedCount: todoData?.completed || 0,
          reminderCount: remList.length,
          reminderList: remList,
        });
      }
      return weekDays;
    }

    // Month View Grid (42 cells: 6 rows x 7 days)
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun

    const gridStart = new Date(year, month, 1 - startingDayOfWeek);
    const monthDays: DayCellData[] = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const txData = dataByDate.txMap.get(dateStr);
      const todoData = dataByDate.todoMap.get(dateStr);
      const remList = dataByDate.remMap.get(dateStr) || [];

      monthDays.push({
        dateObj: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === month,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayExpenses: txData?.total || 0,
        expenseCount: txData?.count || 0,
        taskCount: todoData?.total || 0,
        taskCompletedCount: todoData?.completed || 0,
        reminderCount: remList.length,
        reminderList: remList,
      });
    }

    return monthDays;
  }, [currentMonth, selectedDate, viewMode, dataByDate, todayStr]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-grid-container">
      {/* Weekday Labels Header */}
      <div className="cal-weekdays-header">
        {weekdays.map((wd) => (
          <div key={wd} className="weekday-col-title">
            {wd}
          </div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className={`cal-days-grid ${viewMode === 'week' ? 'week-view' : ''}`}>
        {days.map((cell) => {
          const hasActivity = cell.dayExpenses > 0 || cell.taskCount > 0 || cell.reminderCount > 0;

          return (
            <div
              key={cell.dateStr}
              className={`cal-day-cell ${cell.isCurrentMonth ? 'in-month' : 'out-month'} ${cell.isToday ? 'is-today' : ''} ${cell.isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectDate(cell.dateStr)}
            >
              <div className="day-cell-top">
                <span className={`day-number-badge ${cell.isToday ? 'today-badge' : ''}`}>{cell.dayNum}</span>

                <button
                  type="button"
                  className="quick-add-cell-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddReminderForDate(cell.dateStr);
                  }}
                  title="Add reminder for this day"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Activity Indicator Chips */}
              <div className="day-cell-activities">
                {/* Reminders Chip */}
                {cell.reminderCount > 0 && (
                  <div className="act-chip reminder-chip" title={`${cell.reminderCount} reminder(s)`}>
                    <Bell size={11} />
                    <span className="chip-text">
                      {cell.reminderList[0]?.title}
                      {cell.reminderCount > 1 ? ` (+${cell.reminderCount - 1})` : ''}
                    </span>
                  </div>
                )}

                {/* Expense Chip */}
                {cell.dayExpenses > 0 && (
                  <div className="act-chip expense-chip" title={`Spent ${currencySymbol}${cell.dayExpenses.toFixed(2)}`}>
                    <Receipt size={11} />
                    <span className="chip-text">
                      {currencySymbol}
                      {cell.dayExpenses >= 1000 ? `${(cell.dayExpenses / 1000).toFixed(1)}k` : cell.dayExpenses.toFixed(0)}
                    </span>
                  </div>
                )}

                {/* Task Chip */}
                {cell.taskCount > 0 && (
                  <div
                    className={`act-chip task-chip ${cell.taskCompletedCount === cell.taskCount ? 'done' : ''}`}
                    title={`${cell.taskCompletedCount}/${cell.taskCount} tasks done`}
                  >
                    <CheckSquare size={11} />
                    <span className="chip-text">
                      {cell.taskCompletedCount}/{cell.taskCount} Tasks
                    </span>
                  </div>
                )}
              </div>

              {/* Selected Highlight Bar */}
              {cell.isSelected && <div className="cell-active-indicator" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
