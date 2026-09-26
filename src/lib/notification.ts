'use client';

import { getAllReminders, updateReminder } from './db';
import { CalendarReminder } from './types';

// Play a pleasant audio chime when a reminder fires
export function playReminderChime() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Arpeggio chime
    playNote(523.25, 0, 0.4);   // C5
    playNote(659.25, 0.15, 0.4); // E5
    playNote(783.99, 0.3, 0.6);  // G5
    playNote(1046.50, 0.45, 0.8); // C6
  } catch {
    // Ignore audio autoplay restrictions
  }
}

// Request Notification Permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

// Trigger a browser notification
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
    notif.onclick = () => {
      window.focus();
    };
  }
}

// Check and trigger pending reminders for current time
export async function checkAndDispatchReminders(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  
  try {
    const reminders = await getAllReminders();
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    let dispatchedCount = 0;

    for (const reminder of reminders) {
      if (reminder.isCompleted || reminder.notified) continue;

      // Check if reminder is due (matching date and time <= current time)
      const isToday = reminder.date === currentDate;
      const isPastOrPresentTime = reminder.time <= currentTime;

      if (isToday && isPastOrPresentTime) {
        // Send Notification
        sendBrowserNotification(`Reminder: ${reminder.title}`, {
          body: reminder.description || `Scheduled for ${reminder.time} today`,
          tag: reminder.id,
        });

        // Play chime
        playReminderChime();

        // Mark as notified in IndexedDB
        const updated: CalendarReminder = {
          ...reminder,
          notified: true,
        };
        await updateReminder(updated);
        dispatchedCount++;
      }
    }

    return dispatchedCount;
  } catch (err) {
    console.error('Error checking reminders:', err);
    return 0;
  }
}
