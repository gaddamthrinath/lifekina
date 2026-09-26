import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Transaction, Category, Settings, TodoItem, NoteItem, CalendarReminder } from './types';

const DB_NAME        = 'lifekina-db';
const LEGACY_DB_NAME = 'privledger-db';
const DB_VERSION     = 4; // bumped: added reminders store

export interface LifekinaDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': string; 'by-category': string };
  };
  categories: {
    key: string;
    value: Category;
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  todos: {
    key: string;
    value: TodoItem;
    indexes: { 'by-completed': number; 'by-createdAt': number };
  };
  notes: {
    key: string;
    value: NoteItem;
    indexes: { 'by-pinned': number; 'by-createdAt': number };
  };
  reminders: {
    key: string;
    value: CalendarReminder;
    indexes: { 'by-date': string };
  };
}

let dbPromise: Promise<IDBPDatabase<LifekinaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LifekinaDB>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDB<LifekinaDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          // v1 → v2: recreate stores without type indexes
          if (oldVersion < 2) {
            if (db.objectStoreNames.contains('transactions')) db.deleteObjectStore('transactions');
            if (db.objectStoreNames.contains('categories'))   db.deleteObjectStore('categories');
            if (db.objectStoreNames.contains('settings'))     db.deleteObjectStore('settings');
          }

          // Transactions store
          if (!db.objectStoreNames.contains('transactions')) {
            const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
            txStore.createIndex('by-date',     'date');
            txStore.createIndex('by-category', 'categoryId');
          }

          // Categories store
          if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'id' });
          }

          // Settings store (key-value)
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          // Todos store (v3)
          if (!db.objectStoreNames.contains('todos')) {
            const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
            todoStore.createIndex('by-completed', 'completed');
            todoStore.createIndex('by-createdAt', 'createdAt');
          }

          // Notes store (v3)
          if (!db.objectStoreNames.contains('notes')) {
            const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
            noteStore.createIndex('by-pinned', 'isPinned');
            noteStore.createIndex('by-createdAt', 'createdAt');
          }

          // Reminders store (v4)
          if (!db.objectStoreNames.contains('reminders')) {
            const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
            reminderStore.createIndex('by-date', 'date');
          }
        },
      });

      // Seamless one-time data migration from legacy privledger-db if present
      try {
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          const txCount = await db.count('transactions');
          const catCount = await db.count('categories');
          if (txCount === 0 && catCount === 0) {
            const legacyDb = await openDB(LEGACY_DB_NAME).catch(() => null);
            if (legacyDb) {
              const storeNames = legacyDb.objectStoreNames;
              for (const storeName of ['categories', 'transactions', 'settings', 'todos', 'notes', 'reminders'] as const) {
                if (storeNames.contains(storeName)) {
                  const items = await legacyDb.getAll(storeName);
                  if (items && items.length > 0) {
                    const tx = db.transaction(storeName, 'readwrite');
                    for (const item of items) {
                      await tx.objectStore(storeName).put(item);
                    }
                    await tx.done;
                  }
                }
              }
              legacyDb.close();
            }
          }
        }
      } catch {
        // Silently continue if legacy migration is not needed
      }

      return db;
    })();
  }
  return dbPromise;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K] | undefined> {
  const db     = await getDB();
  const record = await db.get('settings', key as string);
  return record?.value as Settings[K] | undefined;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: key as string, value });
}

export async function getAllSettings(): Promise<Partial<Settings>> {
  const db     = await getDB();
  const all    = await db.getAll('settings');
  const result: Partial<Settings> = {};
  for (const record of all) {
    (result as Record<string, unknown>)[record.key] = record.value;
  }
  return result;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(tx: Transaction): Promise<void> {
  const db = await getDB();
  await db.add('transactions', tx);
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  const db = await getDB();
  await db.put('transactions', tx);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('transactions', id);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db  = await getDB();
  const txs = await db.getAll('transactions');
  return txs.sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    return dc !== 0 ? dc : b.time.localeCompare(a.time);
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function addCategory(cat: Category): Promise<void> {
  const db = await getDB();
  await db.add('categories', cat);
}

export async function updateCategory(cat: Category): Promise<void> {
  const db = await getDB();
  await db.put('categories', cat);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('categories', id);
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll('categories');
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export async function addTodo(todo: TodoItem): Promise<void> {
  const db = await getDB();
  await db.add('todos', todo);
}

export async function updateTodo(todo: TodoItem): Promise<void> {
  const db = await getDB();
  await db.put('todos', todo);
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('todos', id);
}

export async function getAllTodos(): Promise<TodoItem[]> {
  const db = await getDB();
  const items = await db.getAll('todos');
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function addNote(note: NoteItem): Promise<void> {
  const db = await getDB();
  await db.add('notes', note);
}

export async function updateNote(note: NoteItem): Promise<void> {
  const db = await getDB();
  await db.put('notes', note);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
}

export async function getAllNotes(): Promise<NoteItem[]> {
  const db = await getDB();
  const items = await db.getAll('notes');
  return items.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export async function addReminder(reminder: CalendarReminder): Promise<void> {
  const db = await getDB();
  await db.add('reminders', reminder);
}

export async function updateReminder(reminder: CalendarReminder): Promise<void> {
  const db = await getDB();
  await db.put('reminders', reminder);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('reminders', id);
}

export async function getAllReminders(): Promise<CalendarReminder[]> {
  const db = await getDB();
  const items = await db.getAll('reminders');
  return items.sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : a.time.localeCompare(b.time);
  });
}

// ─── Export / Import / Clear ──────────────────────────────────────────────────

export async function exportAllData() {
  const db           = await getDB();
  const transactions = await db.getAll('transactions');
  const categories   = await db.getAll('categories');
  const todos        = await db.getAll('todos');
  const notes        = await db.getAll('notes');
  const reminders    = await db.getAll('reminders');
  const settingsRaw  = await db.getAll('settings');
  const settings: Record<string, unknown> = {};
  for (const s of settingsRaw) settings[s.key] = s.value;
  return { version: '4.0.0', exportedAt: new Date().toISOString(), transactions, categories, todos, notes, reminders, settings };
}

export async function importAllData(data: {
  transactions?: Transaction[];
  categories?: Category[];
  todos?: TodoItem[];
  notes?: NoteItem[];
  reminders?: CalendarReminder[];
  settings?: Record<string, unknown>;
}): Promise<void> {
  const db  = await getDB();
  const stores = ['transactions', 'categories', 'settings', 'todos', 'notes', 'reminders'] as const;
  const txn = db.transaction(stores, 'readwrite');
  if (data.categories)   for (const c of data.categories)   await txn.objectStore('categories').put(c);
  if (data.transactions) for (const t of data.transactions)  await txn.objectStore('transactions').put(t);
  if (data.todos)        for (const td of data.todos)       await txn.objectStore('todos').put(td);
  if (data.notes)        for (const n of data.notes)        await txn.objectStore('notes').put(n);
  if (data.reminders)    for (const r of data.reminders)    await txn.objectStore('reminders').put(r);
  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      await txn.objectStore('settings').put({ key, value });
    }
  }
  await txn.done;
}

export async function clearAllData(): Promise<void> {
  const db  = await getDB();
  const stores = ['transactions', 'categories', 'settings', 'todos', 'notes', 'reminders'] as const;
  const txn = db.transaction(stores, 'readwrite');
  await txn.objectStore('transactions').clear();
  await txn.objectStore('categories').clear();
  await txn.objectStore('settings').clear();
  await txn.objectStore('todos').clear();
  await txn.objectStore('notes').clear();
  await txn.objectStore('reminders').clear();
  await txn.done;
}

