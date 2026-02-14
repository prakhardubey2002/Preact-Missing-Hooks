/**
 * useWasmCompute – run WebAssembly computation off the main thread via a Web Worker.
 * Flow: Preact Component → useWasmCompute() → Web Worker → WASM Module → Return result.
 * @module useWasmCompute
 */

import { useState, useCallback, useRef, useEffect } from "preact/hooks";

const WASM_WORKER_SCRIPT = `
self.onmessage = async (e) => {
  const d = e.data;
  if (d.type === 'init') {
    try {
      const res = await fetch(d.wasmUrl);
      const buf = await res.arrayBuffer();
      const mod = await WebAssembly.instantiate(buf, d.importObject || {});
      self.wasmInstance = mod.instance;
      self.exportName = d.exportName || 'compute';
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', error: (err && err.message) || String(err) });
    }
    return;
  }
  if (d.type === 'compute') {
    try {
      const fn = self.wasmInstance.exports[self.exportName];
      if (typeof fn !== 'function') {
        self.postMessage({ type: 'error', error: 'Export "' + self.exportName + '" is not a function' });
        return;
      }
      const result = fn(d.input);
      self.postMessage({ type: 'result', result: result });
    } catch (err) {
      self.postMessage({ type: 'error', error: (err && err.message) || String(err) });
    }
  }
};
`;

export interface UseWasmComputeOptions {
  /** URL of the .wasm module to load in the worker. */
  wasmUrl: string;
  /** Name of the exported function to call for compute (default: 'compute'). */
  exportName?: string;
  /** Optional custom worker script URL. If provided, worker must handle init (wasmUrl, exportName) and compute(input) messages. */
  workerUrl?: string;
  /** Optional import object for WebAssembly.instantiate (only used when using default inline worker; must be serializable). */
  importObject?: WebAssembly.Imports;
}

export interface UseWasmComputeReturn<TInput = number, TResult = number> {
  /** Invoke the WASM export with the given input. Resolves with the return value when ready. */
  compute: (input: TInput) => Promise<TResult>;
  /** Last result from a successful compute call. */
  result: TResult | undefined;
  /** True while WASM is loading or a compute is in progress. */
  loading: boolean;
  /** Error message if environment is unsupported, init failed, or compute failed. */
  error: string | null;
  /** True when the WASM module is loaded and compute can be called. */
  ready: boolean;
}

function isSSR(): boolean {
  return typeof window === "undefined";
}

function isWorkerSupported(): boolean {
  return typeof Worker !== "undefined";
}

function isWebAssemblySupported(): boolean {
  return (
    typeof WebAssembly !== "undefined" &&
    typeof WebAssembly.instantiate === "function"
  );
}

function createWorker(workerUrl?: string): Worker {
  if (workerUrl) {
    return new Worker(workerUrl);
  }
  const blob = new Blob([WASM_WORKER_SCRIPT], {
    type: "application/javascript",
  });
  const url = URL.createObjectURL(blob);
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return w;
}

/**
 * Runs WebAssembly computation in a Web Worker. Validates environment (browser, Worker, WebAssembly)
 * and returns a stable compute function plus result/loading/error/ready state.
 *
 * @param options - wasmUrl, optional exportName, optional workerUrl, optional importObject.
 * @returns { compute, result, loading, error, ready }.
 *
 * @example
 * const { compute, result, loading, error, ready } = useWasmCompute({ wasmUrl: '/add.wasm', exportName: 'add' });
 * // When ready: compute(2).then(sum => ...); result will update with the last return value.
 */
export function useWasmCompute<TInput = number, TResult = number>(
  options: UseWasmComputeOptions
): UseWasmComputeReturn<TInput, TResult> {
  const { wasmUrl, exportName = "compute", workerUrl, importObject } = options;

  const [result, setResult] = useState<TResult | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const pendingResolveRef = useRef<((value: TResult) => void) | null>(null);
  const pendingRejectRef = useRef<((reason: Error) => void) | null>(null);

  useEffect(() => {
    if (isSSR()) {
      setError("useWasmCompute is not available during SSR");
      setLoading(false);
      return;
    }
    if (!isWorkerSupported()) {
      setError("Worker is not supported in this environment");
      setLoading(false);
      return;
    }
    if (!isWebAssemblySupported()) {
      setError("WebAssembly is not supported in this environment");
      setLoading(false);
      return;
    }

    setError(null);
    setReady(false);
    const worker = createWorker(workerUrl);
    workerRef.current = worker;

    const onMessage = (e: MessageEvent) => {
      const { type, result: msgResult, error: msgError } = e.data ?? {};
      if (type === "ready") {
        setReady(true);
        setLoading(false);
        return;
      }
      if (type === "error") {
        setError(msgError ?? "Unknown error");
        setLoading(false);
        if (pendingRejectRef.current) {
          pendingRejectRef.current(new Error(msgError));
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
        return;
      }
      if (type === "result") {
        setResult(msgResult);
        setLoading(false);
        if (pendingResolveRef.current) {
          pendingResolveRef.current(msgResult);
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      }
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage({
      type: "init",
      wasmUrl,
      exportName,
      importObject: importObject ?? {},
    });

    return () => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
      workerRef.current = null;
      if (pendingRejectRef.current) {
        pendingRejectRef.current(new Error("Worker terminated"));
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
      }
    };
  }, [wasmUrl, exportName, workerUrl, importObject]);

  const compute = useCallback(
    (input: TInput): Promise<TResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !ready) {
          reject(new Error("WASM not ready"));
          return;
        }
        if (error) {
          reject(new Error(error));
          return;
        }
        pendingResolveRef.current = resolve;
        pendingRejectRef.current = reject;
        setLoading(true);
        workerRef.current.postMessage({ type: "compute", input });
      });
    },
    [ready, error]
  );

  return { compute, result, loading, error, ready };
}
