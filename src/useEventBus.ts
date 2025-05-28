import { useCallback, useEffect } from 'preact/hooks';

type EventMap = Record<string, (...args: any[]) => void>;

const listeners = new Map<string, Set<(...args: any[]) => void>>();

/**
 * A Preact hook to publish and subscribe to custom events across components.
 * @returns An object with `emit` and `on` methods.
 */
export function useEventBus<T extends EventMap>() {
  const emit = useCallback(<K extends keyof T>(event: K, ...args: Parameters<T[K]>) => {
    const handlers = listeners.get(event as string);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }, []);

  const on = useCallback(<K extends keyof T>(event: K, handler: T[K]) => {
    let handlers = listeners.get(event as string);
    if (!handlers) {
      handlers = new Set();
      listeners.set(event as string, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers!.delete(handler);
      if (handlers!.size === 0) {
        listeners.delete(event as string);
      }
    };
  }, []);

  return { emit, on };
}
