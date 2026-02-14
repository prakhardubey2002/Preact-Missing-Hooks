/**
 * Wraps an IDBRequest in a Promise.
 * @module indexedDB/requestToPromise
 */

/**
 * Converts an IDBRequest to a Promise. Rejects with the request's error on failure.
 * @param request - Native IndexedDB request.
 * @returns Promise that resolves with the request result or rejects with DOMException.
 */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new DOMException("Unknown IndexedDB error"));
  });
}
