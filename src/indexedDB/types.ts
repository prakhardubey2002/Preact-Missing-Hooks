/**
 * IndexedDB hook system – shared types.
 * @module indexedDB/types
 */

/** Table schema for a single object store. */
export interface TableSchema {
  /** Key path (e.g. `"id"` or `["a", "b"]`). */
  keyPath: string | string[];
  /** Use auto-increment primary key. */
  autoIncrement?: boolean;
  /** Optional index names to create (each indexes the keyPath by default). */
  indexes?: string[];
}

/** Configuration passed to useIndexedDB. */
export interface IndexedDBConfig {
  /** Database name. */
  name: string;
  /** Schema version (increment to trigger onupgradeneeded). */
  version: number;
  /** Map of table name → store schema (keyPath, autoIncrement, indexes). */
  tables: {
    [tableName: string]: TableSchema;
  };
}

/** Optional callbacks for any operation. */
export interface OperationCallbacks<T = unknown> {
  onSuccess?: (result: T) => void;
  onError?: (error: DOMException) => void;
}

/** Options for transaction. */
export type TransactionOptions = OperationCallbacks<void>;
