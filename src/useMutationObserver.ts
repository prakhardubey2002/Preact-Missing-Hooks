import { useEffect, useRef } from 'preact/hooks';

export type UseMutationObserverOptions = MutationObserverInit;

/**
 * A Preact hook to observe DOM mutations using MutationObserver.
 * @param target - The element to observe.
 * @param callback - Function to call on mutation.
 * @param options - MutationObserver options.
 */
export function useMutationObserver(
  target: HTMLElement | null,
  callback: MutationCallback,
  options: UseMutationObserverOptions
): void {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!target) return;

    const observer = new MutationObserver(callback);
    observer.observe(target, options);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [target, callback, options]);
}
