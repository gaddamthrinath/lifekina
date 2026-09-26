When you deploy an update or change code, here is exactly how **code updates** and **user data** are handled:

---

### 1. How Users Receive Code & UI Updates

Because of the **Network-First strategy** and **Next.js asset hashing**, updates are automatic and seamless:

```
User Opens App (Online)
         │
         ▼
1. Browser fetches the latest code from the server
         │
         ├──► Success? ──► Serves new code & updates offline cache in background
         │
         └──► Offline? ──► Falls back to the cached version instantly
```

#### A. Network-First Strategy ([public/sw.js](file:///c:/Users/thrishali/Downloads/privledger/privledger/public/sw.js#L42-L68))
- Whenever the user has an internet connection, the Service Worker always attempts to fetch the newest version from the server first.
- When it fetches the new version, it automatically replaces the old cached copy in the browser's storage.

#### B. Cache-Busted Asset Hashes (Next.js)
- Next.js compiles every code change with a unique cryptographic hash in the filename (e.g., `main-a8f92b.js` &rarr; `main-c4e11d.js`).
- The browser will never use outdated JS or CSS because the filename itself changes with every code update.

#### C. Service Worker Versioning
When releasing a major update, you can simply bump the version in [public/sw.js](file:///c:/Users/thrishali/Downloads/privledger/privledger/public/sw.js#L2):
```js
// public/sw.js
const CACHE_NAME = 'lifekina-v3'; // Bumping this purges old caches automatically
```
During the `activate` event, the Service Worker automatically deletes older caches (`lifekina-v2`) and re-caches the new application shell.

---

### 2. What Happens to User Data During Code Changes?

> [!IMPORTANT]
> **User data is completely separated from the code.**
> Rebuilding the application, modifying React components, or deploying updates **never** deletes or resets the user's expenses, tasks, notes, or settings.

- **IndexedDB is Persistent**: Data stays safely on the user's device across all code deployments, app refreshes, and browser restarts.
- **If You Need to Change Database Structure in the Future**:
  If you ever add a new feature (e.g., a "Goals" or "Budgets" store), you only need to increment `DB_VERSION` in [src/lib/db.ts](file:///c:/Users/thrishali/Downloads/privledger/privledger/src/lib/db.ts#L6):
  ```ts
  // src/lib/db.ts
  const DB_VERSION = 5; // e.g. bumped from 4 to 5

  upgrade(db, oldVersion) {
    // Existing data in v1–v4 is untouched!
    if (!db.objectStoreNames.contains('budgets')) {
      db.createObjectStore('budgets', { keyPath: 'id' });
    }
  }
  ```
  The browser will run the migration automatically without losing any of the user's existing records.