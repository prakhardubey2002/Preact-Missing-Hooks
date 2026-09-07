import { useCallback, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";

export type HoneypotAction = "block" | "silent" | "allow";

export type HoneypotTriggerReason = "filled" | "too-fast";

export interface HoneypotTriggerInfo {
  /** Why the honeypot tripped */
  reason: HoneypotTriggerReason;
  /** Value found in the decoy field (empty when reason is too-fast) */
  value: string;
  /** Milliseconds since the hook mounted */
  elapsedMs: number;
}

export interface UseHoneypotOptions {
  /**
   * Name of the decoy field. Bots often fill fields named like "website" / "url".
   * Default: `"website"`
   */
  name?: string;
  /**
   * Reject submissions faster than this many ms after mount.
   * Set `0` to disable timing checks. Default: `800`
   */
  minTimeMs?: number;
  /**
   * What to do when a bot is detected during `protect()`:
   * - `"block"` — preventDefault (if available) and skip your handler (default)
   * - `"silent"` — skip your handler without signaling failure (bait bots)
   * - `"allow"` — still run your handler (useful with `onTrigger` only)
   */
  action?: HoneypotAction;
  /** Called whenever the honeypot trips (filled field or too-fast submit) */
  onTrigger?: (info: HoneypotTriggerInfo) => void;
}

export interface HoneypotFieldProps {
  name: string;
  type: "text";
  value: string;
  tabIndex: number;
  autoComplete: string;
  "aria-hidden": "true";
  style: JSX.CSSProperties;
  onInput: JSX.GenericEventHandler<HTMLInputElement>;
}

export interface UseHoneypotReturn {
  /** Spread onto a decoy `<input>` inside the form (visually hidden) */
  honeypotProps: HoneypotFieldProps;
  /**
   * Wrap your submit / click handler. Returns a protected handler that
   * runs checks first, then applies `action`.
   */
  protect: <E>(handler: (event: E) => void) => (event: E) => void;
  /** True after a bot was detected at least once */
  triggered: boolean;
  /** Last trigger info, or null */
  lastTrigger: HoneypotTriggerInfo | null;
  /** Imperatively check if the current state looks like a bot */
  check: () => HoneypotTriggerInfo | null;
  /** Clear decoy value and triggered state (keeps mount timer) */
  reset: () => void;
}

const HIDDEN_STYLE: JSX.CSSProperties = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

function now(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

/**
 * Minimal honeypot protection for forms. Renders a hidden decoy field humans
 * ignore; bots often fill it. Optionally rejects submissions that happen too
 * fast after mount.
 *
 * @example
 * ```tsx
 * function ContactForm() {
 *   const { honeypotProps, protect, triggered } = useHoneypot({
 *     action: 'block',
 *     onTrigger: ({ reason }) => console.warn('bot:', reason),
 *   });
 *
 *   const onSubmit = protect((e) => {
 *     e.preventDefault();
 *     sendForm();
 *   });
 *
 *   return (
 *     <form onSubmit={onSubmit}>
 *       <input {...honeypotProps} />
 *       <input name="email" required />
 *       <button type="submit">Send</button>
 *       {triggered && <p>Blocked</p>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useHoneypot(
  options: UseHoneypotOptions = {}
): UseHoneypotReturn {
  const {
    name = "website",
    minTimeMs = 800,
    action = "block",
    onTrigger,
  } = options;

  const [value, setValue] = useState("");
  const [triggered, setTriggered] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<HoneypotTriggerInfo | null>(
    null
  );

  const mountedAtRef = useRef(now());
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;
  const actionRef = useRef(action);
  actionRef.current = action;
  const minTimeRef = useRef(minTimeMs);
  minTimeRef.current = minTimeMs;
  const valueRef = useRef(value);
  valueRef.current = value;

  const check = useCallback((): HoneypotTriggerInfo | null => {
    const elapsedMs = now() - mountedAtRef.current;
    const current = valueRef.current.trim();

    if (current.length > 0) {
      return { reason: "filled", value: current, elapsedMs };
    }

    if (minTimeRef.current > 0 && elapsedMs < minTimeRef.current) {
      return { reason: "too-fast", value: "", elapsedMs };
    }

    return null;
  }, []);

  const trip = useCallback((info: HoneypotTriggerInfo) => {
    setTriggered(true);
    setLastTrigger(info);
    onTriggerRef.current?.(info);
  }, []);

  const protect = useCallback(
    <E>(handler: (event: E) => void) => {
      return (event: E) => {
        const info = check();
        if (!info) {
          handler(event);
          return;
        }

        trip(info);

        const mode = actionRef.current;
        if (mode === "allow") {
          handler(event);
          return;
        }

        // block + silent: do not run the real handler
        const maybeEvent = event as { preventDefault?: () => void };
        if (
          mode === "block" &&
          typeof maybeEvent?.preventDefault === "function"
        ) {
          maybeEvent.preventDefault();
        }
      };
    },
    [check, trip]
  );

  const reset = useCallback(() => {
    setValue("");
    valueRef.current = "";
    setTriggered(false);
    setLastTrigger(null);
  }, []);

  const honeypotProps = useMemo(
    (): HoneypotFieldProps => ({
      name,
      type: "text",
      value,
      tabIndex: -1,
      autoComplete: "off",
      "aria-hidden": "true",
      // Bots often look for "required" / visible labels; keep this inert.
      style: HIDDEN_STYLE,
      onInput: (e) => {
        const next = (e.currentTarget as HTMLInputElement).value;
        valueRef.current = next;
        setValue(next);
      },
    }),
    [name, value]
  );

  return {
    honeypotProps,
    protect,
    triggered,
    lastTrigger,
    check,
    reset,
  };
}
