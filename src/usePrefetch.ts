import { useCallback, useRef, useState } from "preact/hooks";

export interface UsePrefetchOptions {
  /**
   * Resource type for prefetch.
   * - "document": uses <link rel="prefetch"> (default, for next navigation)
   * - "fetch": uses fetch() to warm the HTTP cache (e.g. for API or same-origin data)
   */
  as?: "document" | "fetch";
}

export interface UsePrefetchReturn {
  /** Prefetch a URL so it is cached for later use. No-op if URL was already prefetched or empty. */
  prefetch: (url: string, options?: UsePrefetchOptions) => void;
  /** Check whether a URL has already been prefetched in this hook instance. */
  isPrefetched: (url: string) => boolean;
}

function prefetchDocument(url: string): void {
  if (typeof document === "undefined") return;
  const links = document.querySelectorAll('link[rel="prefetch"]');
  for (let i = 0; i < links.length; i++) {
    if ((links[i] as HTMLLinkElement).href === url) return;
  }

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
}

function prefetchFetch(url: string): void {
  if (typeof fetch === "undefined") return;
  fetch(url, { method: "GET", mode: "cors" }).catch(() => {
    /* ignore; prefetch is best-effort */
  });
}

/**
 * A Preact hook that returns a stable prefetch function to preload URLs (documents or data)
 * so they are cached before the user navigates or needs them. Useful for link hover or
 * route preloading.
 *
 * @returns Object with prefetch(url, options?) and isPrefetched(url)
 *
 * @example
 * ```tsx
 * function NavLink({ href, children }) {
 *   const { prefetch } = usePrefetch();
 *   return (
 *     <a
 *       href={href}
 *       onMouseEnter={() => prefetch(href)}
 *     >
 *       {children}
 *     </a>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Prefetch API data
 * const { prefetch } = usePrefetch();
 * prefetch('/api/user', { as: 'fetch' });
 * ```
 */
export function usePrefetch(): UsePrefetchReturn {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const prefetch = useCallback((url: string, options?: UsePrefetchOptions) => {
    const trimmed = url?.trim();
    if (!trimmed) return;
    if (prefetchedRef.current.has(trimmed)) return;

    const as = options?.as ?? "document";
    if (as === "document") {
      prefetchDocument(trimmed);
    } else {
      prefetchFetch(trimmed);
    }
    prefetchedRef.current.add(trimmed);
    setTick((n) => n + 1);
  }, []);

  const isPrefetched = useCallback((url: string) => {
    return prefetchedRef.current.has(url?.trim() ?? "");
  }, []);

  return { prefetch, isPrefetched };
}
