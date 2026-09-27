import { getDB } from './db';
import {
  SyncPayload,
  SyncSummary,
  ExportedSyncStats,
  Transaction,
  Category,
  TodoItem,
  NoteItem,
  CalendarReminder,
} from './types';

/**
 * Calculates total count of records being exported
 */
export function getExportStatsFromPayload(payload: SyncPayload): ExportedSyncStats {
  const transactionsCount = payload.transactions?.length || 0;
  const categoriesCount = payload.categories?.length || 0;
  const todosCount = payload.todos?.length || 0;
  const notesCount = payload.notes?.length || 0;
  const remindersCount = payload.reminders?.length || 0;

  return {
    transactionsCount,
    categoriesCount,
    todosCount,
    notesCount,
    remindersCount,
    totalCount: transactionsCount + categoriesCount + todosCount + notesCount + remindersCount,
  };
}

/**
 * Builds the complete local sync payload from IndexedDB
 */
export async function getLocalSyncPayload(): Promise<{ payload: SyncPayload; stats: ExportedSyncStats }> {
  const db = await getDB();
  const transactions = await db.getAll('transactions');
  const categories = await db.getAll('categories');
  const todos = await db.getAll('todos');
  const notes = await db.getAll('notes');
  const reminders = await db.getAll('reminders');
  const settingsRaw = await db.getAll('settings');

  const settings: Record<string, unknown> = {};
  for (const s of settingsRaw) {
    settings[s.key] = s.value;
  }

  const payload: SyncPayload = {
    version: '4.0.0',
    timestamp: Date.now(),
    transactions: transactions || [],
    categories: categories || [],
    todos: todos || [],
    notes: notes || [],
    reminders: reminders || [],
    settings,
  };

  const stats = getExportStatsFromPayload(payload);

  return { payload, stats };
}

/**
 * Merges a remote SyncPayload into local IndexedDB without destroying local data.
 * Applies intelligent conflict resolution and tags imported items with syncOrigin: 'imported'.
 */
export async function mergeRemoteSyncPayload(incoming: SyncPayload): Promise<SyncSummary> {
  const db = await getDB();
  const syncTimestamp = Date.now();

  const summary: SyncSummary = {
    transactionsAdded: 0,
    transactionsUpdated: 0,
    categoriesAdded: 0,
    todosAdded: 0,
    todosUpdated: 0,
    notesAdded: 0,
    notesUpdated: 0,
    remindersAdded: 0,
    remindersUpdated: 0,
    totalChanges: 0,
  };

  const stores = ['transactions', 'categories', 'settings', 'todos', 'notes', 'reminders'] as const;
  const tx = db.transaction(stores, 'readwrite');

  // 1. Merge Categories & Build Remap Dictionary
  const categoryRemap = new Map<string, string>();
  if (Array.isArray(incoming.categories)) {
    const catStore = tx.objectStore('categories');
    const localCategories = await catStore.getAll();
    const localCatMap = new Map<string, Category>(localCategories.map(c => [c.id, c]));
    const localCatByName = new Map<string, Category>(localCategories.map(c => [c.name.toLowerCase().trim(), c]));

    for (const remoteCat of incoming.categories) {
      if (!remoteCat?.id || !remoteCat?.name) continue;
      const existingById = localCatMap.get(remoteCat.id);
      const existingByName = localCatByName.get(remoteCat.name.toLowerCase().trim());

      if (existingById) {
        categoryRemap.set(remoteCat.id, existingById.id);
        if (existingById.name !== remoteCat.name || existingById.color !== remoteCat.color || existingById.icon !== remoteCat.icon) {
          if ((remoteCat.createdAt || 0) >= (existingById.createdAt || 0)) {
            await catStore.put({
              ...remoteCat,
              syncOrigin: 'imported',
              syncedAt: syncTimestamp,
            });
          }
        }
      } else if (existingByName) {
        // Map remote category ID to matching local category ID
        categoryRemap.set(remoteCat.id, existingByName.id);
      } else {
        // Save new custom category locally
        const itemToSave: Category = {
          ...remoteCat,
          syncOrigin: 'imported',
          syncedAt: syncTimestamp,
        };
        await catStore.put(itemToSave);
        localCatMap.set(remoteCat.id, itemToSave);
        localCatByName.set(remoteCat.name.toLowerCase().trim(), itemToSave);
        categoryRemap.set(remoteCat.id, remoteCat.id);
        summary.categoriesAdded++;
      }
    }
  }

  // 2. Merge Transactions with resolved Category IDs
  if (Array.isArray(incoming.transactions)) {
    const txStore = tx.objectStore('transactions');
    const localTransactions = await txStore.getAll();
    const localTxMap = new Map<string, Transaction>(localTransactions.map(t => [t.id, t]));

    for (const remoteTx of incoming.transactions) {
      if (!remoteTx?.id) continue;
      const resolvedCategoryId = categoryRemap.get(remoteTx.categoryId) || remoteTx.categoryId;
      const local = localTxMap.get(remoteTx.id);
      if (!local) {
        const itemToSave: Transaction = {
          ...remoteTx,
          categoryId: resolvedCategoryId,
          syncOrigin: 'imported',
          syncedAt: syncTimestamp,
        };
        await txStore.put(itemToSave);
        localTxMap.set(remoteTx.id, itemToSave);
        summary.transactionsAdded++;
      } else {
        const hasDiff =
          local.amount !== remoteTx.amount ||
          local.categoryId !== resolvedCategoryId ||
          local.description !== remoteTx.description ||
          local.note !== remoteTx.note ||
          local.date !== remoteTx.date ||
          local.time !== remoteTx.time;

        if (hasDiff && (remoteTx.createdAt || 0) >= (local.createdAt || 0)) {
          await txStore.put({
            ...remoteTx,
            categoryId: resolvedCategoryId,
            syncOrigin: 'imported',
            syncedAt: syncTimestamp,
          });
          summary.transactionsUpdated++;
        }
      }
    }
  }

  // 3. Merge Todos
  if (Array.isArray(incoming.todos)) {
    const todoStore = tx.objectStore('todos');
    const localTodos = await todoStore.getAll();
    const localTodoMap = new Map<string, TodoItem>(localTodos.map(t => [t.id, t]));

    for (const remoteTodo of incoming.todos) {
      if (!remoteTodo?.id) continue;
      const local = localTodoMap.get(remoteTodo.id);
      if (!local) {
        const itemToSave: TodoItem = {
          ...remoteTodo,
          syncOrigin: 'imported',
          syncedAt: syncTimestamp,
        };
        await todoStore.put(itemToSave);
        localTodoMap.set(remoteTodo.id, itemToSave);
        summary.todosAdded++;
      } else {
        const localScore = (local.completedAt || local.inProgressAt || local.createdAt || 0) + (local.timeline?.length || 0);
        const remoteScore = (remoteTodo.completedAt || remoteTodo.inProgressAt || remoteTodo.createdAt || 0) + (remoteTodo.timeline?.length || 0);

        const hasDiff =
          local.completed !== remoteTodo.completed ||
          local.status !== remoteTodo.status ||
          local.title !== remoteTodo.title ||
          local.description !== remoteTodo.description ||
          local.priority !== remoteTodo.priority ||
          local.dueDate !== remoteTodo.dueDate;

        if (hasDiff && remoteScore >= localScore) {
          await todoStore.put({
            ...remoteTodo,
            syncOrigin: 'imported',
            syncedAt: syncTimestamp,
          });
          summary.todosUpdated++;
        }
      }
    }
  }

  // 4. Merge Notes
  if (Array.isArray(incoming.notes)) {
    const noteStore = tx.objectStore('notes');
    const localNotes = await noteStore.getAll();
    const localNoteMap = new Map<string, NoteItem>(localNotes.map(n => [n.id, n]));

    for (const remoteNote of incoming.notes) {
      if (!remoteNote?.id) continue;
      const local = localNoteMap.get(remoteNote.id);
      if (!local) {
        const itemToSave: NoteItem = {
          ...remoteNote,
          syncOrigin: 'imported',
          syncedAt: syncTimestamp,
        };
        await noteStore.put(itemToSave);
        localNoteMap.set(remoteNote.id, itemToSave);
        summary.notesAdded++;
      } else {
        const remoteTime = remoteNote.updatedAt || remoteNote.createdAt || 0;
        const localTime = local.updatedAt || local.createdAt || 0;

        const hasDiff =
          local.title !== remoteNote.title ||
          local.content !== remoteNote.content ||
          local.isPinned !== remoteNote.isPinned ||
          local.color !== remoteNote.color ||
          JSON.stringify(local.tags) !== JSON.stringify(remoteNote.tags);

        if (hasDiff && remoteTime >= localTime) {
          await noteStore.put({
            ...remoteNote,
            syncOrigin: 'imported',
            syncedAt: syncTimestamp,
          });
          summary.notesUpdated++;
        }
      }
    }
  }

  // 5. Merge Reminders
  if (Array.isArray(incoming.reminders)) {
    const reminderStore = tx.objectStore('reminders');
    const localReminders = await reminderStore.getAll();
    const localReminderMap = new Map<string, CalendarReminder>(localReminders.map(r => [r.id, r]));

    for (const remoteReminder of incoming.reminders) {
      if (!remoteReminder?.id) continue;
      const local = localReminderMap.get(remoteReminder.id);
      if (!local) {
        const itemToSave: CalendarReminder = {
          ...remoteReminder,
          syncOrigin: 'imported',
          syncedAt: syncTimestamp,
        };
        await reminderStore.put(itemToSave);
        localReminderMap.set(remoteReminder.id, itemToSave);
        summary.remindersAdded++;
      } else {
        const remoteTime = remoteReminder.createdAt || 0;
        const localTime = local.createdAt || 0;

        const hasDiff =
          local.title !== remoteReminder.title ||
          local.description !== remoteReminder.description ||
          local.date !== remoteReminder.date ||
          local.time !== remoteReminder.time ||
          local.isCompleted !== remoteReminder.isCompleted ||
          local.priority !== remoteReminder.priority;

        if (hasDiff && remoteTime >= localTime) {
          await reminderStore.put({
            ...remoteReminder,
            syncOrigin: 'imported',
            syncedAt: syncTimestamp,
          });
          summary.remindersUpdated++;
        }
      }
    }
  }

  // 6. Merge Settings
  if (incoming.settings && typeof incoming.settings === 'object') {
    const settingsStore = tx.objectStore('settings');
    const localSettingsRaw = await settingsStore.getAll();
    const localSettingsMap = new Map<string, unknown>(localSettingsRaw.map(s => [s.key, s.value]));

    for (const [key, value] of Object.entries(incoming.settings)) {
      if (key === 'sync_history') continue; // Do not overwrite local sync history
      if (!localSettingsMap.has(key) || localSettingsMap.get(key) === undefined || localSettingsMap.get(key) === null) {
        await settingsStore.put({ key, value });
      }
    }
  }

  await tx.done;

  summary.totalChanges =
    summary.transactionsAdded +
    summary.transactionsUpdated +
    summary.categoriesAdded +
    summary.todosAdded +
    summary.todosUpdated +
    summary.notesAdded +
    summary.notesUpdated +
    summary.remindersAdded +
    summary.remindersUpdated;

  return summary;
}
