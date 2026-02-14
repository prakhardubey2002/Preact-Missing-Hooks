/**
 * IndexedDB hook system – public API.
 * @module indexedDB
 */

export type {
  IndexedDBConfig,
  TableSchema,
  OperationCallbacks,
  TransactionOptions,
} from "./types";
export { requestToPromise } from "./requestToPromise";
export type { ITableController } from "./tableController";
export type { IDBController, TransactionContext } from "./dbController";
export { createDBController } from "./dbController";
export { openDB } from "./openDB";
