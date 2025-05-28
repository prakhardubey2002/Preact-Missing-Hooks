import { RefObject } from 'preact'
import { useEffect } from 'preact/hooks'

export type UseMutationObserverOptions = MutationObserverInit

/**
 * A Preact hook to observe DOM mutations using MutationObserver.
 * @param target - The element to observe.
 * @param callback - Function to call on mutation.
 * @param options - MutationObserver options.
 */
export function useMutationObserver(
  targetRef: RefObject<HTMLElement | null>,
  callback: MutationCallback,
  options: MutationObserverInit
) {
  useEffect(() => {
    const node = targetRef.current
    if (!node) return

    const observer = new MutationObserver(callback)
    observer.observe(node, options)

    return () => observer.disconnect()
  }, [targetRef, callback, options])
}
