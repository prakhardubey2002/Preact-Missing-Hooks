import { useCallback, useState } from 'preact/hooks';

export interface UseClipboardOptions {
  /** Duration in ms to keep `copied` true before resetting. Default: 2000 */
  resetDelay?: number;
}

export interface UseClipboardReturn {
  /** Copy text to the clipboard. Returns true on success. */
  copy: (text: string) => Promise<boolean>;
  /** Read text from the clipboard. Returns empty string if denied or unavailable. */
  paste: () => Promise<string>;
  /** Whether the last copy operation succeeded (resets after resetDelay) */
  copied: boolean;
  /** Error from the last failed operation, or null */
  error: Error | null;
  /** Manually reset copied and error state */
  reset: () => void;
}

/**
 * A Preact hook for reading and writing the clipboard. Uses the async
 * Clipboard API when available (requires secure context and user gesture).
 *
 * @param options - Optional configuration (e.g., resetDelay for copied state)
 * @returns Object with copy, paste, copied, error, and reset
 *
 * @example
 * ```tsx
 * function CopyButton() {
 *   const { copy, copied, error } = useClipboard();
 *   return (
 *     <button onClick={() => copy('Hello!')}>
 *       {copied ? 'Copied!' : 'Copy'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { resetDelay = 2000 } = options;

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      setError(null);

      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        const err = new Error('Clipboard API is not available');
        setError(err);
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (resetDelay > 0) {
          setTimeout(() => setCopied(false), resetDelay);
        }
        return true;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return false;
      }
    },
    [resetDelay]
  );

  const paste = useCallback(async (): Promise<string> => {
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      const err = new Error('Clipboard API is not available');
      setError(err);
      return '';
    }

    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return '';
    }
  }, []);

  return { copy, paste, copied, error, reset };
}
