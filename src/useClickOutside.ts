import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

export type ClickOutsideEvent = MouseEvent | TouchEvent | PointerEvent;

export type ClickOutsideTarget =
  | RefObject<HTMLElement | null>
  | ReadonlyArray<RefObject<HTMLElement | null>>;

export interface UseClickOutsideOptions {
  /** Pointer events that count as an outside click. Default: mousedown, touchstart */
  events?: ReadonlyArray<
    | "mousedown"
    | "mouseup"
    | "touchstart"
    | "touchend"
    | "click"
    | "pointerdown"
  >;
  /** When false, listeners are not attached. Default: true */
  enabled?: boolean;
}

const DEFAULT_EVENTS: NonNullable<UseClickOutsideOptions["events"]> = [
  "mousedown",
  "touchstart",
];

function isNode(target: EventTarget | null): target is Node {
  return target instanceof Node;
}

function isInside(
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  target: Node
): boolean {
  return refs.some((ref) => {
    const node = ref.current;
    return node != null && node.contains(target);
  });
}

function isRefList(
  target: ClickOutsideTarget
): target is ReadonlyArray<RefObject<HTMLElement | null>> {
  return Array.isArray(target);
}

function toRefList(
  target: ClickOutsideTarget
): RefObject<HTMLElement | null>[] {
  if (isRefList(target)) {
    return [...target];
  }
  return [target];
}

/**
 * A Preact hook that calls `handler` when a pointer event happens outside the
 * given element (or elements). Useful for closing dropdowns, modals, and popovers.
 *
 * @param target - Ref (or array of refs) of the element(s) that are "inside"
 * @param handler - Called with the event when a click occurs outside
 * @param options - Optional events list and enabled flag
 *
 * @example
 * ```tsx
 * function Dropdown() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const [open, setOpen] = useState(true);
 *   useClickOutside(ref, () => setOpen(false));
 *   if (!open) return null;
 *   return <div ref={ref}>Menu</div>;
 * }
 * ```
 */
export function useClickOutside(
  target: ClickOutsideTarget,
  handler: (event: ClickOutsideEvent) => void,
  options: UseClickOutsideOptions = {}
): void {
  const { events = DEFAULT_EVENTS, enabled = true } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const onPointer = (event: Event) => {
      const eventTarget = event.target;
      if (!isNode(eventTarget)) return;

      const refs = toRefList(targetRef.current);
      if (isInside(refs, eventTarget)) return;

      handlerRef.current(event as ClickOutsideEvent);
    };

    for (const eventName of events) {
      document.addEventListener(eventName, onPointer);
    }

    return () => {
      for (const eventName of events) {
        document.removeEventListener(eventName, onPointer);
      }
    };
  }, [enabled, events]);
}
