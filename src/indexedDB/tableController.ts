/**
 * Table controller: insert, update, delete, exists, query, upsert, bulkInsert, clear, count.
 * Works in standalone mode (opens its own transaction per op) or bound to a transaction.
 * @module indexedDB/tableController
 */

import type { OperationCallbacks } from "./types";
import { requestToPromise } from "./requestToPromise";

/** Runs optional callbacks and returns the result. */
function withCallbacks<T>(
  promise: Promise<T>,
  options?: OperationCallbacks<T>
): Promise<T> {
  if (!options) return promise;
  return promise
    .then((result) => {
      options.onSuccess?.(result);
      return result;
    })
    .catch((err: DOMException) => {
      options.onError?.(err);
      throw err;
    });
}

/**
 * Standalone table controller: opens a new transaction for each operation.
 */
function createStandaloneController(
  db: IDBDatabase,
  tableName: string
): ITableController {
  function getStore(mode: IDBTransactionMode): IDBObjectStore {
    const tx = db.transaction([tableName], mode);
    return tx.objectStore(tableName);
  }

  return {
    insert<T>(
      data: T,
      options?: OperationCallbacks<IDBValidKey>
    ): Promise<IDBValidKey> {
      const store = getStore("readwrite");
      return withCallbacks(requestToPromise(store.add(data)), options);
    },

    update<T>(
      key: IDBValidKey,
      updates: Partial<T>,
      options?: OperationCallbacks<void>
    ): Promise<void> {
      const store = getStore("readwrite");
      const getReq = store.get(key);
      return withCallbacks(
        requestToPromise(getReq)
          .then((existing) => {
            if (existing === undefined) {
              throw new DOMException("Key not found", "NotFoundError");
            }
            const merged = { ...existing, ...updates } as T;
            return requestToPromise(store.put(merged));
          })
          .then(() => undefined),
        options
      );
    },

    delete(
      key: IDBValidKey,
      options?: OperationCallbacks<void>
    ): Promise<void> {
      const store = getStore("readwrite");
      return withCallbacks(
        requestToPromise(store.delete(key)).then(() => undefined),
        options
      );
    },

    exists(key: IDBValidKey): Promise<boolean> {
      const store = getStore("readonly");
      return requestToPromise(store.getKey(key)).then((k) => k !== undefined);
    },

    query<T>(
      filterFn: (item: T) => boolean,
      options?: OperationCallbacks<T[]>
    ): Promise<T[]> {
      const store = getStore("readonly");
      const request = store.openCursor();
      const results: T[] = [];
      return withCallbacks(
        new Promise<T[]>((resolve, reject) => {
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              if (filterFn(cursor.value as T)) results.push(cursor.value as T);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          request.onerror = () =>
            reject(request.error ?? new DOMException("Unknown error"));
        }),
        options
      );
    },

    upsert<T>(
      data: T,
      options?: OperationCallbacks<IDBValidKey>
    ): Promise<IDBValidKey> {
      const store = getStore("readwrite");
      return withCallbacks(requestToPromise(store.put(data)), options);
    },

    bulkInsert<T>(
      items: T[],
      options?: OperationCallbacks<IDBValidKey[]>
    ): Promise<IDBValidKey[]> {
      const store = getStore("readwrite");
      const keys: IDBValidKey[] = [];
      if (items.length === 0) {
        return withCallbacks(Promise.resolve(keys), options);
      }
      let completed = 0;
      const promise = new Promise<IDBValidKey[]>((resolve, reject) => {
        const onDone = () => {
          completed++;
          if (completed === items.length) resolve(keys);
        };
        items.forEach((item, i) => {
          const req = store.add(item);
          req.onsuccess = () => {
            keys[i] = req.result;
            onDone();
          };
          req.onerror = () =>
            reject(req.error ?? new DOMException("Unknown error"));
        });
      });
      return withCallbacks(promise, options);
    },

    clear(options?: OperationCallbacks<void>): Promise<void> {
      const store = getStore("readwrite");
      return withCallbacks(
        requestToPromise(store.clear()).then(() => undefined),
        options
      );
    },

    count(options?: OperationCallbacks<number>): Promise<number> {
      const store = getStore("readonly");
      return withCallbacks(requestToPromise(store.count()), options ?? {});
    },
  };
}

/**
 * Transaction-scoped table controller: uses the given transaction (no new transaction).
 */
function createTransactionController(
  tx: IDBTransaction,
  tableName: string
): ITableController {
  function getStore(): IDBObjectStore {
    return tx.objectStore(tableName);
  }

  return {
    insert<T>(
      data: T,
      options?: OperationCallbacks<IDBValidKey>
    ): Promise<IDBValidKey> {
      const store = getStore();
      return withCallbacks(requestToPromise(store.add(data)), options);
    },

    update<T>(
      key: IDBValidKey,
      updates: Partial<T>,
      options?: OperationCallbacks<void>
    ): Promise<void> {
      const store = getStore();
      return withCallbacks(
        requestToPromise(store.get(key))
          .then((existing) => {
            if (existing === undefined) {
              throw new DOMException("Key not found", "NotFoundError");
            }
            const merged = { ...existing, ...updates } as T;
            return requestToPromise(store.put(merged));
          })
          .then(() => undefined),
        options
      );
    },

    delete(
      key: IDBValidKey,
      options?: OperationCallbacks<void>
    ): Promise<void> {
      const store = getStore();
      return withCallbacks(
        requestToPromise(store.delete(key)).then(() => undefined),
        options
      );
    },

    exists(key: IDBValidKey): Promise<boolean> {
      const store = getStore();
      return requestToPromise(store.getKey(key)).then((k) => k !== undefined);
    },

    query<T>(
      filterFn: (item: T) => boolean,
      options?: OperationCallbacks<T[]>
    ): Promise<T[]> {
      const store = getStore();
      const request = store.openCursor();
      const results: T[] = [];
      return withCallbacks(
        new Promise<T[]>((resolve, reject) => {
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              if (filterFn(cursor.value as T)) results.push(cursor.value as T);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          request.onerror = () =>
            reject(request.error ?? new DOMException("Unknown error"));
        }),
        options
      );
    },

    upsert<T>(
      data: T,
      options?: OperationCallbacks<IDBValidKey>
    ): Promise<IDBValidKey> {
      const store = getStore();
      return withCallbacks(requestToPromise(store.put(data)), options);
    },

    bulkInsert<T>(
      items: T[],
      options?: OperationCallbacks<IDBValidKey[]>
    ): Promise<IDBValidKey[]> {
      const store = getStore();
      const keys: IDBValidKey[] = [];
      if (items.length === 0) {
        return withCallbacks(Promise.resolve(keys), options);
      }
      let completed = 0;
      const promise = new Promise<IDBValidKey[]>((resolve, reject) => {
        items.forEach((item, i) => {
          const req = store.add(item);
          req.onsuccess = () => {
            keys[i] = req.result;
            completed++;
            if (completed === items.length) resolve(keys);
          };
          req.onerror = () =>
            reject(req.error ?? new DOMException("Unknown error"));
        });
      });
      return withCallbacks(promise, options);
    },

    clear(options?: OperationCallbacks<void>): Promise<void> {
      const store = getStore();
      return withCallbacks(
        requestToPromise(store.clear()).then(() => undefined),
        options
      );
    },

    count(options?: OperationCallbacks<number>): Promise<number> {
      const store = getStore();
      return withCallbacks(requestToPromise(store.count()), options ?? {});
    },
  };
}

/** Public interface for a table controller (standalone or transaction-scoped). */
export interface ITableController {
  insert<T>(
    data: T,
    options?: OperationCallbacks<IDBValidKey>
  ): Promise<IDBValidKey>;
  update<T>(
    key: IDBValidKey,
    updates: Partial<T>,
    options?: OperationCallbacks<void>
  ): Promise<void>;
  delete(key: IDBValidKey, options?: OperationCallbacks<void>): Promise<void>;
  exists(key: IDBValidKey): Promise<boolean>;
  query<T>(
    filterFn: (item: T) => boolean,
    options?: OperationCallbacks<T[]>
  ): Promise<T[]>;
  upsert<T>(
    data: T,
    options?: OperationCallbacks<IDBValidKey>
  ): Promise<IDBValidKey>;
  bulkInsert<T>(
    items: T[],
    options?: OperationCallbacks<IDBValidKey[]>
  ): Promise<IDBValidKey[]>;
  clear(options?: OperationCallbacks<void>): Promise<void>;
  count(options?: OperationCallbacks<number>): Promise<number>;
}

export function createTableController(
  db: IDBDatabase,
  tableName: string
): ITableController {
  return createStandaloneController(db, tableName);
}

export function createTransactionTableController(
  tx: IDBTransaction,
  tableName: string
): ITableController {
  return createTransactionController(tx, tableName);
}
