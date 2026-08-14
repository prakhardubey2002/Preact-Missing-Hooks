import { useCallback, useEffect, useRef, useState } from "preact/hooks";

const DEFAULT_TIMEOUT = 60_000;

const DEFAULT_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "resize",
  "keydown",
  "touchstart",
  "wheel",
];

export interface UseIdleOptions {
  /** Events that count as user activity. Default: mousemove, mousedown, resize, keydown, touchstart, wheel */
  events?: ReadonlyArray<keyof WindowEventMap>;
  /** Idle state before any activity is observed. Default: false */
  initialState?: boolean;
}

export interface UseIdleReturn {
  /** Whether the user has been inactive for the specified timeout */
  idle: boolean;
  /** Timestamp (ms) of the last recorded activity */
  lastActive: number;
  /** Treat the current moment as activity and restart the idle timer */
  reset: () => void;
}

function now(): number {
  return Date.now();
}

/**
 * A Preact hook that detects when the user has been inactive for `timeout`
 * milliseconds. Activity is inferred from window events (mouse, keyboard, touch, etc.).
 *
 * @param timeout - Idle duration in ms. Default: 60000
 * @param options - Optional events list and initial idle state
 * @returns `{ idle, lastActive, reset }`
 *
 * @example
 * ```tsx
 * function IdleBanner() {
 *   const { idle, lastActive, reset } = useIdle(5000);
 *   return (
 *     <div>
 *       {idle ? "Away" : "Active"} · last active {new Date(lastActive).toLocaleTimeString()}
 *       <button onClick={reset}>I'm here</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useIdle(
  timeout: number = DEFAULT_TIMEOUT,
  options: UseIdleOptions = {}
): UseIdleReturn {
  const { events = DEFAULT_EVENTS, initialState = false } = options;

  const [idle, setIdle] = useState(initialState);
  const [lastActive, setLastActive] = useState(now);
  const idleRef = useRef(initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef(timeout);
  const eventsRef = useRef(events);

  timeoutRef.current = timeout;
  eventsRef.current = events;
  idleRef.current = idle;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      idleRef.current = true;
      setIdle(true);
    }, timeoutRef.current);
  }, [clearTimer]);

  const markActive = useCallback(
    (updateTimestamp: boolean) => {
      if (idleRef.current) {
        idleRef.current = false;
        setIdle(false);
        setLastActive(now());
      } else if (updateTimestamp) {
        setLastActive(now());
      }
      startTimer();
    },
    [startTimer]
  );

  const reset = useCallback(() => {
    markActive(true);
  }, [markActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    startTimer();

    const onActivity = () => {
      markActive(false);
    };

    const eventList = eventsRef.current;
    for (const event of eventList) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        markActive(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      for (const event of eventList) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [markActive, startTimer, clearTimer]);

  return { idle, lastActive, reset };
}
