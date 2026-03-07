import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export interface UsePollOptions {
  /** Polling interval in milliseconds. Default: 1000 */
  intervalMs?: number;
  /** Run the poll function immediately when the hook mounts. Default: true */
  immediate?: boolean;
  /** When false, do not start or continue polling. Default: true */
  enabled?: boolean;
}

export interface UsePollResult<T> {
  /** Last resolved data when poll returned done: true */
  data: T | null;
  /** True once the poll function returned { done: true } */
  done: boolean;
  /** Error from the last failed poll call */
  error: Error | null;
  /** Number of times the poll function has been invoked */
  pollCount: number;
  /** Manually start polling (e.g. after reset). Only has effect when not already polling. */
  start: () => void;
  /** Stop polling. */
  stop: () => void;
}

/**
 * Polls an async function at a fixed interval until it returns { done: true, data? }.
 * Useful for waiting on a backend job, readiness checks, or until a condition is met.
 *
 * @param pollFn - Async function called each tick. Return { done: true, data? } to stop and set result.
 * @param options - intervalMs, immediate, enabled
 * @returns { data, done, error, pollCount, start, stop }
 *
 * @example
 * ```tsx
 * const { data, done, pollCount } = usePoll(
 *   async () => {
 *     const res = await fetch('/api/status');
 *     const json = await res.json();
 *     return json.ready ? { done: true, data: json } : { done: false };
 *   },
 *   { intervalMs: 500, immediate: true }
 * );
 * return done ? <div>Ready: {JSON.stringify(data)}</div> : <div>Polling… ({pollCount})</div>;
 * ```
 */
export function usePoll<T>(
  pollFn: () => Promise<{ done: boolean; data?: T }>,
  options: UsePollOptions = {}
): UsePollResult<T> {
  const { intervalMs = 1000, immediate = true, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollFnRef = useRef(pollFn);
  pollFnRef.current = pollFn;

  const stop = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const tick = useCallback(async () => {
    try {
      setError(null);
      const result = await pollFnRef.current();
      setPollCount((n) => n + 1);
      if (result.done) {
        stop();
        setDone(true);
        if (result.data !== undefined) {
          setData(result.data);
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      stop();
    }
  }, [stop]);

  const start = useCallback(() => {
    if (!enabled || running) return;
    setRunning(true);
    if (immediate) {
      tick();
    }
    intervalRef.current = setInterval(tick, intervalMs);
  }, [enabled, immediate, intervalMs, running, tick]);

  useEffect(() => {
    if (enabled) {
      start();
    }
    return () => {
      stop();
    };
  }, [enabled]);

  return { data, done, error, pollCount, start, stop };
}
