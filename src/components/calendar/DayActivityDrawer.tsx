'use client';

import React from 'react';
import { X, Receipt, CheckSquare, Bell, Plus, CheckCircle2, Circle, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Transaction, TodoItem, CalendarReminder, Category } from '@/lib/types';
import { deleteReminder, updateReminder, updateTodo, deleteTodo } from '@/lib/db';
import Link from 'next/link';

interface DayActivityDrawerProps {
  selectedDate: string; // YYYY-MM-DD
  currencySymbol: string;
  transactions: Transaction[];
  todos: TodoItem[];
  reminders: CalendarReminder[];
  categories: Category[];
  onClose: () => void;
  onRefresh: () => void;
  onAddReminder: () => void;
  onAddTask: () => void;
  onAddExpense: () => void;
}

export default function DayActivityDrawer({
  selectedDate,
  currencySymbol,
  transactions,
  todos,
  reminders,
  categories,
  onClose,
  onRefresh,
  onAddReminder,
  onAddTask,
  onAddExpense,
}: DayActivityDrawerProps) {

  // Format readable title
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const formattedTitle = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const totalDayExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const handleToggleTodo = async (todo: TodoItem) => {
    const nextCompleted = !todo.completed;
    const updated: TodoItem = {
      ...todo,
      completed: nextCompleted,
      status: nextCompleted ? 'completed' : 'todo',
      completedAt: nextCompleted ? Date.now() : undefined,
    };
    await updateTodo(updated);
    onRefresh();
  };

  const handleToggleReminder = async (reminder: CalendarReminder) => {
    const updated: CalendarReminder = {
      ...reminder,
      isCompleted: !reminder.isCompleted,
    };
    await updateReminder(updated);
    onRefresh();
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteReminder(id);
    onRefresh();
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
    onRefresh();
  };

  return (
    <div className="day-drawer-panel">
      <div className="day-drawer-header">
        <div>
          <div className="day-drawer-badge">Day Overview</div>
          <h2 className="day-drawer-title">{formattedTitle}</h2>
        </div>
        <button type="button" className="icon-btn-ghost" onClick={onClose} aria-label="Close drawer">
          <X size={20} />
        </button>
      </div>

      <div className="day-drawer-body">
        {/* Day Stats Pill */}
        <div className="day-stats-banner">
          <div className="day-stat-card">
            <span className="stat-label">Spent Today</span>
            <span className="stat-val" style={{ color: totalDayExpenses > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {currencySymbol}{totalDayExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="day-stat-card">
            <span className="stat-label">Tasks Due</span>
            <span className="stat-val">{todos.length}</span>
          </div>
          <div className="day-stat-card">
            <span className="stat-label">Reminders</span>
            <span className="stat-val" style={{ color: '#6366f1' }}>{reminders.length}</span>
          </div>
        </div>

        {/* Quick Add Bar */}
        <div className="day-quick-actions">
          <button type="button" className="quick-btn reminder-quick" onClick={onAddReminder}>
            <Bell size={15} />
            <span>Add Reminder</span>
          </button>
          <button type="button" className="quick-btn expense-quick" onClick={onAddExpense}>
            <Receipt size={15} />
            <span>Add Expense</span>
          </button>
          <button type="button" className="quick-btn task-quick" onClick={onAddTask}>
            <CheckSquare size={15} />
            <span>Add Task</span>
          </button>
        </div>


        {/* SECTION 1: Reminders */}
        <div className="drawer-section">
          <div className="section-title-row">
            <div className="sec-title">
              <Bell size={16} color="#6366f1" />
              <span>Reminders ({reminders.length})</span>
            </div>
          </div>

          {reminders.length === 0 ? (
            <div className="section-empty">No reminders scheduled for this date.</div>
          ) : (
            <div className="items-list">
              {reminders.map((rem) => (
                <div key={rem.id} className={`activity-card reminder-item ${rem.isCompleted ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className="toggle-check"
                    onClick={() => handleToggleReminder(rem)}
                    title={rem.isCompleted ? 'Mark pending' : 'Mark completed'}
                  >
                    {rem.isCompleted ? <CheckCircle2 size={18} color="#10b981" /> : <Circle size={18} color="var(--text-tertiary)" />}
                  </button>

                  <div className="item-details">
                    <div className="item-title-row">
                      <span className={`item-name ${rem.isCompleted ? 'line-through' : ''}`}>{rem.title}</span>
                      <span className={`prio-pill prio-${rem.priority || 'medium'}`}>{rem.priority || 'med'}</span>
                    </div>

                    <div className="item-meta">
                      <span className="time-tag">
                        <Clock size={12} />
                        {rem.time}
                      </span>
                      {rem.description && <span className="item-desc">{rem.description}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-btn-ghost delete-item-btn"
                    onClick={() => handleDeleteReminder(rem.id)}
                    title="Delete reminder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Tasks Due / Added */}
        <div className="drawer-section">
          <div className="section-title-row">
            <div className="sec-title">
              <CheckSquare size={16} color="#3b82f6" />
              <span>Tasks ({todos.length})</span>
            </div>
          </div>

          {todos.length === 0 ? (
            <div className="section-empty">No tasks set for this date.</div>
          ) : (
            <div className="items-list">
              {todos.map((todo) => (
                <div key={todo.id} className={`activity-card task-item ${todo.completed ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className="toggle-check"
                    onClick={() => handleToggleTodo(todo)}
                    title={todo.completed ? 'Mark incomplete' : 'Mark done'}
                  >
                    {todo.completed ? <CheckCircle2 size={18} color="#10b981" /> : <Circle size={18} color="var(--text-tertiary)" />}
                  </button>

                  <div className="item-details">
                    <div className="item-title-row">
                      <span className={`item-name ${todo.completed ? 'line-through' : ''}`}>{todo.title}</span>
                      {todo.priority && <span className={`prio-pill prio-${todo.priority}`}>{todo.priority}</span>}
                    </div>

                    {todo.description && <p className="item-desc">{todo.description}</p>}
                  </div>

                  <button
                    type="button"
                    className="icon-btn-ghost delete-item-btn"
                    onClick={() => handleDeleteTodo(todo.id)}
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: Expenses */}
        <div className="drawer-section">
          <div className="section-title-row">
            <div className="sec-title">
              <Receipt size={16} color="#ef4444" />
              <span>Expenses ({transactions.length})</span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="section-empty">No expenses logged for this date.</div>
          ) : (
            <div className="items-list">
              {transactions.map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                return (
                  <div key={tx.id} className="activity-card expense-item">
                    <div
                      className="cat-badge-dot"
                      style={{ backgroundColor: cat?.color || 'var(--brand-dark)' }}
                      title={cat?.name || 'Expense'}
                    />
                    <div className="item-details">
                      <div className="item-title-row">
                        <span className="item-name">{tx.description || cat?.name || 'Expense'}</span>
                        <span className="expense-amt">
                          -{currencySymbol}{tx.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="item-meta">
                        <span className="time-tag">
                          <Clock size={12} />
                          {tx.time}
                        </span>
                        {cat?.name && <span className="cat-tag-pill">{cat.name}</span>}
                        {tx.note && <span className="item-desc">{tx.note}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
