import { useState, useCallback } from "preact/hooks";

/**
 * Mimics React's useTransition hook in Preact.
 * @returns [startTransition, isPending]
 */
export function useTransition(): [
  startTransition: (callback: () => void) => void,
  isPending: boolean,
] {
  const [isPending, setIsPending] = useState(false);

  const startTransition = useCallback((callback: () => void) => {
    setIsPending(true);
    Promise.resolve().then(() => {
      callback();
      setIsPending(false);
    });
  }, []);

  return [startTransition, isPending];
}
