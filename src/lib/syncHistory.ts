import { getDB } from './db';
import { SyncHistoryEntry, SyncSummary, ExportedSyncStats } from './types';

const SYNC_HISTORY_KEY = 'sync_history';
const MAX_HISTORY_ENTRIES = 5;

/**
 * Formats timestamp to a human-readable date & time (e.g., "Sep 27, 2026, 12:45 PM")
 */
export function formatSyncDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateStr} • ${timeStr}`;
}

/**
 * Retrieves the last 5 sync history records from IndexedDB
 */
export async function getSyncHistory(): Promise<SyncHistoryEntry[]> {
  try {
    const db = await getDB();
    const record = await db.get('settings', SYNC_HISTORY_KEY);
    if (!record || !Array.isArray(record.value)) {
      return [];
    }
    return record.value as SyncHistoryEntry[];
  } catch (err) {
    console.error('Failed to get sync history:', err);
    return [];
  }
}

/**
 * Saves a new sync event and retains strictly the last 5 records
 */
export async function recordSyncHistory(
  role: 'host' | 'joiner',
  imported: SyncSummary,
  exported: ExportedSyncStats
): Promise<SyncHistoryEntry> {
  const timestamp = Date.now();
  const newEntry: SyncHistoryEntry = {
    id: `sync_${timestamp}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    formattedDate: formatSyncDateTime(timestamp),
    role,
    imported,
    exported,
  };

  try {
    const db = await getDB();
    const existing = await getSyncHistory();
    // Prepend new entry and cap at MAX_HISTORY_ENTRIES
    const updatedHistory = [newEntry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
    
    await db.put('settings', {
      key: SYNC_HISTORY_KEY,
      value: updatedHistory,
    });
  } catch (err) {
    console.error('Failed to record sync history:', err);
  }

  return newEntry;
}

/**
 * Clears the sync history logs
 */
export async function clearSyncHistory(): Promise<void> {
  try {
    const db = await getDB();
    await db.put('settings', {
      key: SYNC_HISTORY_KEY,
      value: [],
    });
  } catch (err) {
    console.error('Failed to clear sync history:', err);
  }
}
