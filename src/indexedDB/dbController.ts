/**
 * Database controller: table(name), transaction(storeNames, mode, callback, options).
 * @module indexedDB/dbController
 */

import type { IndexedDBConfig, TransactionOptions } from './types';
import type { ITableController } from './tableController';
import { createTableController, createTransactionTableController } from './tableController';

/** Transaction context passed to the callback: provides table(name) bound to this transaction. */
export interface TransactionContext {
  /** Returns a table controller bound to this transaction. Use for all ops inside the callback. */
  table: (name: string) => ITableController;
}

/**
 * Database controller built from an open IDBDatabase.
 * Exposes table(name) and transaction(...).
 */
export interface IDBController {
  /** Underlying IDBDatabase (read-only). */
  readonly db: IDBDatabase;
  /** Returns true if an object store with the given name exists. */
  hasTable: (name: string) => boolean;
  /** Returns a table controller for the given store (each op opens its own transaction). */
  table: (name: string) => ITableController;
  /**
   * Runs a callback inside a single transaction. All operations in the callback use the same transaction.
   * @param storeNames - Object store names to include in the transaction.
   * @param mode - 'readonly' | 'readwrite'.
   * @param callback - Async or sync function receiving { table(name) }. Return value is ignored; await all ops inside.
   * @param options - Optional onSuccess/onError callbacks.
   * @returns Promise that resolves when the transaction completes (after all requests and the callback).
   */
  transaction: <T = void>(
    storeNames: string[],
    mode: IDBTransactionMode,
    callback: (tx: TransactionContext) => T | Promise<T>,
    options?: TransactionOptions
  ) => Promise<void>;
}

function withTransactionCallbacks(
  promise: Promise<void>,
  options?: TransactionOptions
): Promise<void> {
  if (!options) return promise;
  return promise
    .then(() => options.onSuccess?.())
    .catch((err: DOMException) => {
      options.onError?.(err);
      throw err;
    });
}

/**
 * Creates a database controller from an open IDBDatabase instance.
 */
export function createDBController(db: IDBDatabase, _config: IndexedDBConfig): IDBController {
  return {
    get db(): IDBDatabase {
      return db;
    },

    hasTable(name: string): boolean {
      return db.objectStoreNames.contains(name);
    },

    table(name: string): ITableController {
      return createTableController(db, name);
    },

    transaction<T = void>(
      storeNames: string[],
      mode: IDBTransactionMode,
      callback: (tx: TransactionContext) => T | Promise<T>,
      options?: TransactionOptions
    ): Promise<void> {
      const tx = db.transaction(storeNames, mode);
      const txContext: TransactionContext = {
        table: (tableName: string) => createTransactionTableController(tx, tableName),
      };
      const txPromise = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new DOMException('Transaction failed'));
      });
      const callbackResult = callback(txContext);
      const promise = Promise.resolve(callbackResult).then(() => txPromise);
      return withTransactionCallbacks(promise, options);
    },
  };
}
