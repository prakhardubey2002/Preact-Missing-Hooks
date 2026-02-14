import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

export interface RageClickPayload {
  /** Number of clicks that triggered the rage click */
  count: number;
  /** Last click event (e.g. for Sentry context) */
  event: MouseEvent;
}

export interface UseRageClickOptions {
  /** Called when a rage click is detected. Use this to report to Sentry or your error tracker. */
  onRageClick: (payload: RageClickPayload) => void;
  /** Minimum number of clicks in the time window to count as rage click. Default: 5 (Sentry-style). */
  threshold?: number;
  /** Time window in ms. Default: 1000. */
  timeWindow?: number;
  /** Max distance in px between clicks to count as same spot. Default: 30. Set to Infinity to ignore distance. */
  distanceThreshold?: number;
}

interface ClickRecord {
  time: number;
  x: number;
  y: number;
}

function distance(a: ClickRecord, b: ClickRecord): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Detects "rage clicks" (repeated rapid clicks in the same area), e.g. when the UI
 * is unresponsive. Use the callback to report to Sentry or similar tools to surface
 * rage click issues and lower rage-click-related support.
 *
 * @param targetRef - Ref of the element to monitor (e.g. a button or card).
 * @param options - onRageClick callback and optional threshold, timeWindow, distanceThreshold.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLButtonElement>(null)
 * useRageClick(ref, {
 *   onRageClick: ({ count, event }) => {
 *     Sentry.captureMessage('Rage click detected', { extra: { count, target: event.target } })
 *   },
 * })
 * return <button ref={ref}>Submit</button>
 * ```
 */
export function useRageClick(
  targetRef: RefObject<HTMLElement | null>,
  options: UseRageClickOptions
) {
  const {
    onRageClick,
    threshold = 5,
    timeWindow = 1000,
    distanceThreshold = 30,
  } = options;

  const onRageClickRef = useRef(onRageClick);
  onRageClickRef.current = onRageClick;

  const clicksRef = useRef<ClickRecord[]>([]);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const handleClick = (e: MouseEvent) => {
      const now = Date.now();
      const record: ClickRecord = { time: now, x: e.clientX, y: e.clientY };

      const clicks = clicksRef.current;
      const cutoff = now - timeWindow;
      const recent = clicks.filter((c) => c.time >= cutoff);
      recent.push(record);

      if (distanceThreshold !== Infinity) {
        const inRange = recent.filter(
          (c) => distance(c, record) <= distanceThreshold
        );
        if (inRange.length >= threshold) {
          onRageClickRef.current({ count: inRange.length, event: e });
          clicksRef.current = [];
          return;
        }
      } else {
        if (recent.length >= threshold) {
          onRageClickRef.current({ count: recent.length, event: e });
          clicksRef.current = [];
          return;
        }
      }

      clicksRef.current = recent;
    };

    node.addEventListener("click", handleClick);
    return () => node.removeEventListener("click", handleClick);
  }, [targetRef, threshold, timeWindow, distanceThreshold]);
}
