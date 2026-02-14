/**
 * Preact hook for IndexedDB: open database, create stores/indexes, return a database controller.
 * Uses a singleton connection per (name, version).
 * @module useIndexedDB
 */

import { useState, useEffect, useRef } from "preact/hooks";
import type { IndexedDBConfig } from "./indexedDB/types";
import { openDB } from "./indexedDB/openDB";
import { createDBController } from "./indexedDB/dbController";
import type { IDBController } from "./indexedDB/dbController";

export type { IndexedDBConfig, IDBController } from "./indexedDB";

export interface UseIndexedDBReturn {
  /** Database controller (table, transaction). Null until the database is open. */
  db: IDBController | null;
  /** True once the database is open and ready. */
  isReady: boolean;
  /** Error from opening the database, if any. */
  error: DOMException | null;
}

/**
 * Opens an IndexedDB database and returns a controller for tables and transactions.
 * Handles onupgradeneeded: creates object stores and indexes from config.
 * Connection is a singleton per (config.name, config.version).
 *
 * @param config - Database name, version, and table schemas (keyPath, autoIncrement, indexes).
 * @returns { db, isReady, error }. Use db.table(name) and db.transaction(...) when isReady is true.
 *
 * @example
 * const { db, isReady, error } = useIndexedDB({
 *   name: 'my-db',
 *   version: 1,
 *   tables: {
 *     users: { keyPath: 'id', autoIncrement: true, indexes: ['email'] },
 *   },
 * })
 * if (isReady && db) {
 *   const users = db.table('users')
 *   await users.insert({ email: 'a@b.com' })
 *   await db.transaction(['users'], 'readwrite', (tx) => tx.table('users').insert({ email: 'b@b.com' }))
 * }
 */
export function useIndexedDB(config: IndexedDBConfig): UseIndexedDBReturn {
  const [db, setDb] = useState<IDBController | null>(null);
  const [error, setError] = useState<DOMException | null>(null);
  const [isReady, setIsReady] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setIsReady(false);
    setDb(null);

    const { name, version, tables } = configRef.current;
    openDB({ name, version, tables })
      .then((database) => {
        if (cancelled) {
          database.close();
          return;
        }
        const controller = createDBController(database, configRef.current);
        setDb(controller);
        setIsReady(true);
      })
      .catch((err: DOMException) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [config.name, config.version]);

  return { db, isReady, error };
}

/*
 * Usage example:
 *
 * const { db, isReady, error } = useIndexedDB({
 *   name: 'my-app-db',
 *   version: 1,
 *   tables: {
 *     users: { keyPath: 'id', autoIncrement: true, indexes: ['email'] },
 *     settings: { keyPath: 'key' },
 *   },
 * })
 *
 * if (error) return <div>Failed to open database</div>
 * if (!isReady || !db) return <div>Loading...</div>
 *
 * const users = db.table('users')
 * await users.insert({ email: 'a@b.com', name: 'Alice' })
 * await users.update(1, { name: 'Alice Smith' })
 * const found = await users.query((u) => u.email.startsWith('a@'))
 * const n = await users.count()
 * await users.delete(1)
 * await users.upsert({ id: 2, email: 'b@b.com' })
 * await users.bulkInsert([{ email: 'c@b.com' }, { email: 'd@b.com' }])
 * await users.clear({ onSuccess: () => console.log('cleared') })
 *
 * await db.transaction(['users', 'settings'], 'readwrite', async (tx) => {
 *   await tx.table('users').insert({ email: 'e@b.com' })
 *   await tx.table('settings').upsert({ key: 'theme', value: 'dark' })
 * }, { onSuccess: () => console.log('transaction done') })
 */
