/**
 * Opens IndexedDB and runs onupgradeneeded to create stores and indexes.
 * Singleton per (name, version).
 * @module indexedDB/openDB
 */

import type { IndexedDBConfig, TableSchema } from "./types";

const connectionCache = new Map<string, Promise<IDBDatabase>>();

/**
 * Opens the database and creates/upgrades object stores and indexes from config.
 * Uses a singleton cache per (name, version); repeated calls with the same config reuse the same connection.
 */
export function openDB(config: IndexedDBConfig): Promise<IDBDatabase> {
  const key = `${config.name}_v${config.version}`;
  let promise = connectionCache.get(key);
  if (promise) return promise;
  promise = _openDB(config);
  connectionCache.set(key, promise);
  return promise;
}

function _openDB(config: IndexedDBConfig): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(config.name, config.version);
    request.onerror = () =>
      reject(request.error ?? new DOMException("Failed to open database"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tables = config.tables;
      for (const tableName of Object.keys(tables)) {
        const schema = tables[tableName] as TableSchema;
        if (!db.objectStoreNames.contains(tableName)) {
          const store = db.createObjectStore(tableName, {
            keyPath: schema.keyPath,
            autoIncrement: schema.autoIncrement ?? false,
          });
          if (schema.indexes) {
            for (const indexName of schema.indexes) {
              store.createIndex(indexName, indexName, { unique: false });
            }
          }
        }
      }
    };
  });
}
