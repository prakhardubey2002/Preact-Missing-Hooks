import { useState, useCallback, useRef, useEffect } from "preact/hooks";

/** Lower number = higher priority. Default priority when not specified. */
const DEFAULT_PRIORITY = 1;

export type ThreadedWorkerMode = "sequential" | "parallel";

export interface UseThreadedWorkerOptions {
  /** Sequential: single worker, priority-ordered. Parallel: worker pool. */
  mode: ThreadedWorkerMode;
  /** Max concurrent workers. Only used when mode is "parallel". Default 4. */
  concurrency?: number;
}

export interface RunOptions {
  /** 1 = highest priority. Lower number runs first. FIFO within same priority. */
  priority?: number;
}

interface QueuedTask<TData, TResult> {
  data: TData;
  priority: number;
  sequence: number;
  resolve: (value: TResult) => void;
  reject: (reason: unknown) => void;
}

export interface UseThreadedWorkerReturn<TData, TResult> {
  /** Enqueue work. Returns a Promise that resolves with the worker result. */
  run: (data: TData, options?: RunOptions) => Promise<TResult>;
  /** True while any task is queued or running. */
  loading: boolean;
  /** Result of the most recently completed successful task. */
  result: TResult | undefined;
  /** Error from the most recently failed task. */
  error: unknown;
  /** Number of tasks currently queued + running. */
  queueSize: number;
  /** Clear all pending (not yet started) tasks. Running tasks continue. */
  clearQueue: () => void;
  /** Stop accepting new work and clear pending queue. Running tasks finish. */
  terminate: () => void;
}

/**
 * Production-grade hook to run async work in a queue with optional priority
 * and either sequential or parallel execution.
 *
 * @param workerFn - Async function to run for each task (e.g. API call, heavy compute).
 * @param options - mode: "sequential" | "parallel", concurrency (parallel only).
 * @returns run, loading, result, error, queueSize, clearQueue, terminate.
 */
export function useThreadedWorker<TData, TResult>(
  workerFn: (data: TData) => Promise<TResult>,
  options: UseThreadedWorkerOptions
): UseThreadedWorkerReturn<TData, TResult> {
  const { mode, concurrency = 4 } = options;
  const maxConcurrent = mode === "sequential" ? 1 : Math.max(1, concurrency);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TResult | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [queueSize, setQueueSize] = useState(0);

  const queueRef = useRef<QueuedTask<TData, TResult>[]>([]);
  const sequenceRef = useRef(0);
  const activeCountRef = useRef(0);
  const terminatedRef = useRef(false);
  const workerFnRef = useRef(workerFn);
  workerFnRef.current = workerFn;

  const updateQueueSize = useCallback(() => {
    setQueueSize(queueRef.current.length + activeCountRef.current);
  }, []);

  const processNext = useCallback(() => {
    if (terminatedRef.current) return;
    if (activeCountRef.current >= maxConcurrent) return;
    if (queueRef.current.length === 0) {
      if (activeCountRef.current === 0) setLoading(false);
      updateQueueSize();
      return;
    }

    // Sort by priority (asc), then by sequence (FIFO within same priority).
    queueRef.current.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.sequence - b.sequence;
    });
    const task = queueRef.current.shift()!;
    activeCountRef.current += 1;
    setLoading(true);
    updateQueueSize();

    const fn = workerFnRef.current;
    fn(task.data)
      .then((value) => {
        setResult(value);
        setError(undefined);
        task.resolve(value);
      })
      .catch((err) => {
        setError(err);
        task.reject(err);
      })
      .finally(() => {
        activeCountRef.current -= 1;
        updateQueueSize();
        processNext();
      });

    // Fill remaining slots (parallel mode).
    if (queueRef.current.length > 0 && activeCountRef.current < maxConcurrent) {
      processNext();
    }
  }, [maxConcurrent, updateQueueSize]);

  const run = useCallback(
    (data: TData, runOptions?: RunOptions): Promise<TResult> => {
      if (terminatedRef.current) {
        return Promise.reject(new Error("Worker is terminated"));
      }
      const priority = runOptions?.priority ?? DEFAULT_PRIORITY;
      const sequence = ++sequenceRef.current;
      const promise = new Promise<TResult>((resolve, reject) => {
        queueRef.current.push({ data, priority, sequence, resolve, reject });
      });
      updateQueueSize();
      setLoading(true);
      queueMicrotask(processNext);
      return promise;
    },
    [processNext, updateQueueSize]
  );

  const clearQueue = useCallback(() => {
    const pending = queueRef.current;
    queueRef.current = [];
    pending.forEach((t) => t.reject(new Error("Task cleared from queue")));
    updateQueueSize();
    if (activeCountRef.current === 0) setLoading(false);
  }, [updateQueueSize]);

  const terminate = useCallback(() => {
    terminatedRef.current = true;
    clearQueue();
  }, [clearQueue]);

  // Reset terminated on unmount so the same hook instance can't be "revived" without options change.
  useEffect(() => {
    return () => {
      terminatedRef.current = true;
    };
  }, []);

  return {
    run,
    loading,
    result,
    error,
    queueSize,
    clearQueue,
    terminate,
  };
}
