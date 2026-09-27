'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllTransactions,
  getAllTodos,
  getAllReminders,
  getAllCategories,
  getSetting,
} from '@/lib/db';
import { Transaction, TodoItem, CalendarReminder, Category } from '@/lib/types';
import { requestNotificationPermission, checkAndDispatchReminders } from '@/lib/notification';

import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import DayActivityDrawer from '@/components/calendar/DayActivityDrawer';
import AddReminderModal from '@/components/calendar/AddReminderModal';
import AddTaskModal from '@/components/calendar/AddTaskModal';
import AddEntryModal from '@/components/AddEntryModal';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // App Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // UI state
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'default'>('default');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'imported'>('all');

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const [txs, tds, rems, cats, symbol] = await Promise.all([
        getAllTransactions(),
        getAllTodos(),
        getAllReminders(),
        getAllCategories(),
        getSetting('currencySymbol'),
      ]);

      setTransactions(txs);
      setTodos(tds);
      setReminders(rems);
      setCategories(cats);
      if (symbol) setCurrencySymbol(symbol);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check notification status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    // Set background timer loop to check reminders every 20s
    const reminderInterval = setInterval(() => {
      checkAndDispatchReminders().then((count) => {
        if (count > 0) {
          loadData(); // refresh list if notified status updated
        }
      });
    }, 20000);

    return () => clearInterval(reminderInterval);
  }, [loadData]);

  // Request browser notification permission
  const handleRequestNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  // Nav Handlers
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDrawerOpen(true);
  };

  const handleOpenAddReminder = (dateStr?: string) => {
    setModalInitialDate(dateStr || selectedDate);
    setIsReminderModalOpen(true);
  };

  const handleOpenAddTask = (dateStr?: string) => {
    setModalInitialDate(dateStr || selectedDate);
    setIsTaskModalOpen(true);
  };

  const handleOpenAddExpense = (dateStr?: string) => {
    setModalInitialDate(dateStr || selectedDate);
    setIsExpenseModalOpen(true);
  };

  // Filter items by source (Local vs Synced)
  const filteredTransactions = transactions.filter((t) => {
    if (sourceFilter === 'local' && t.syncOrigin === 'imported') return false;
    if (sourceFilter === 'imported' && t.syncOrigin !== 'imported') return false;
    return true;
  });

  const filteredTodos = todos.filter((td) => {
    if (sourceFilter === 'local' && td.syncOrigin === 'imported') return false;
    if (sourceFilter === 'imported' && td.syncOrigin !== 'imported') return false;
    return true;
  });

  const filteredReminders = reminders.filter((r) => {
    if (sourceFilter === 'local' && r.syncOrigin === 'imported') return false;
    if (sourceFilter === 'imported' && r.syncOrigin !== 'imported') return false;
    return true;
  });

  // Filter items for selected day drawer
  const dayTransactions = filteredTransactions.filter((t) => t.date === selectedDate);
  const dayTodos = filteredTodos.filter(
    (td) => (td.dueDate || new Date(td.createdAt).toISOString().slice(0, 10)) === selectedDate
  );
  const dayReminders = filteredReminders.filter((r) => r.date === selectedDate);

  return (
    <div className="calendar-page-layout">
      {/* Calendar Header */}
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        notifPermission={notifPermission}
        onRequestNotif={handleRequestNotif}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
      />

      {/* Main Content Area (Grid + Drawer) */}
      <div className={`calendar-content-container ${drawerOpen ? 'drawer-active' : ''}`}>
        <CalendarGrid
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          currencySymbol={currencySymbol}
          viewMode={viewMode}
          transactions={filteredTransactions}
          todos={filteredTodos}
          reminders={filteredReminders}
          onSelectDate={handleSelectDate}
          onAddReminderForDate={handleOpenAddReminder}
        />

        {/* Selected Day Activity Drawer */}
        {drawerOpen && (
          <DayActivityDrawer
            selectedDate={selectedDate}
            currencySymbol={currencySymbol}
            transactions={dayTransactions}
            todos={dayTodos}
            reminders={dayReminders}
            categories={categories}
            onClose={() => setDrawerOpen(false)}
            onRefresh={loadData}
            onAddReminder={() => handleOpenAddReminder(selectedDate)}
            onAddTask={() => handleOpenAddTask(selectedDate)}
            onAddExpense={() => handleOpenAddExpense(selectedDate)}
          />
        )}
      </div>

      {/* Modal for setting reminders */}
      <AddReminderModal
        initialDate={modalInitialDate}
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSaved={loadData}
      />

      {/* Modal for setting tasks */}
      <AddTaskModal
        initialDate={modalInitialDate}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaved={loadData}
      />

      {/* Modal for adding expenses inline */}
      {isExpenseModalOpen && (
        <AddEntryModal
          onClose={() => {
            setIsExpenseModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
