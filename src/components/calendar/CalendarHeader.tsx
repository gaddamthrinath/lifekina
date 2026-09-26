'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Bell, BellOff, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  notifPermission: NotificationPermission | 'default';
  onRequestNotif: () => void;
  viewMode: 'month' | 'week';
  onToggleViewMode: (mode: 'month' | 'week') => void;
}


export default function CalendarHeader({
  currentMonth,
  onPrevMonth,
  onNextMonth,
  notifPermission,
  onRequestNotif,
  viewMode,
  onToggleViewMode,
}: CalendarHeaderProps) {
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar-top-bar">
      <div className="cal-title-area">
        <div className="cal-icon-wrapper">
          <CalendarIcon size={22} color="#6366f1" />
        </div>
        <div>
          <h1 className="cal-page-heading">{monthName}</h1>
          <p className="cal-page-sub">Track daily activity, expenses, tasks &amp; browser reminders</p>
        </div>
      </div>

      <div className="cal-controls-group">
        {/* View Mode Selector */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => onToggleViewMode('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => onToggleViewMode('week')}
          >
            Week
          </button>
        </div>

        {/* Month Nav buttons */}
        <div className="month-nav-btn-group">
          <button type="button" className="icon-btn-secondary" onClick={onPrevMonth} title="Previous Month">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="icon-btn-secondary" onClick={onNextMonth} title="Next Month">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Notification Status Icon Badge */}
        {notifPermission === 'granted' ? (
          <div className="notif-badge granted" title="Browser notifications enabled">
            <Bell size={15} color="#10b981" />
          </div>
        ) : (
          <button type="button" className="notif-badge request" onClick={onRequestNotif} title="Enable browser notifications">
            <BellOff size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

