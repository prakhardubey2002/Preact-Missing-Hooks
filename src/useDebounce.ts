import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export type DebouncedFunction<T extends (...args: never[]) => unknown> = ((
  ...args: Parameters<T>
) => void) & {
  /** Cancel a pending invocation */
  cancel: () => void;
  /** Immediately invoke with the last arguments (or update the value now) */
  flush: () => void;
};

const DEFAULT_DELAY = 300;

function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer != null) {
    clearTimeout(timer);
  }
}

/**
 * A Preact hook that delays updating a value, or executing a function, until
 * `delay` milliseconds have passed without further changes/calls.
 *
 * @example Debounce a value
 * ```tsx
 * const debouncedQuery = useDebounce(query, 300);
 * useEffect(() => { search(debouncedQuery); }, [debouncedQuery]);
 * ```
 *
 * @example Debounce a function
 * ```tsx
 * const save = useDebounce((text: string) => api.save(text), 400);
 * <input onInput={(e) => save(e.currentTarget.value)} />
 * ```
 */
export function useDebounce<T extends (...args: never[]) => unknown>(
  fn: T,
  delay?: number
): DebouncedFunction<T>;
export function useDebounce<T>(value: T, delay?: number): T;
export function useDebounce<T>(
  valueOrFn: T,
  delay: number = DEFAULT_DELAY
): T | DebouncedFunction<(...args: never[]) => unknown> {
  const [debouncedValue, setDebouncedValue] = useState(() => valueOrFn);
  const valueRef = useRef(valueOrFn);
  const delayRef = useRef(delay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<unknown[]>([]);

  valueRef.current = valueOrFn;
  delayRef.current = delay;

  const cancel = useCallback(() => {
    clearTimer(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback(() => {
    const pending = timerRef.current != null;
    cancel();
    if (!pending) return;

    const current = valueRef.current;
    if (typeof current === "function") {
      (current as (...args: unknown[]) => unknown)(...lastArgsRef.current);
    } else {
      setDebouncedValue(() => current);
    }
  }, [cancel]);

  const debouncedFn = useCallback(
    (...args: unknown[]) => {
      lastArgsRef.current = args;
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const current = valueRef.current;
        if (typeof current === "function") {
          (current as (...args: unknown[]) => unknown)(...args);
        }
      }, delayRef.current);
    },
    [cancel]
  ) as unknown as DebouncedFunction<(...args: never[]) => unknown>;

  debouncedFn.cancel = cancel;
  debouncedFn.flush = flush;

  useEffect(() => {
    if (typeof valueOrFn === "function") {
      return;
    }

    cancel();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setDebouncedValue(() => valueOrFn);
    }, delay);

    return cancel;
  }, [valueOrFn, delay, cancel]);

  useEffect(() => cancel, [cancel]);

  if (typeof valueOrFn === "function") {
    return debouncedFn;
  }

  return debouncedValue;
}
