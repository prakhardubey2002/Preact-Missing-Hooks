import { useEffect, useState } from "preact/hooks";

function getMatches(query: string, fallback: boolean): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return fallback;
  }
  return window.matchMedia(query).matches;
}

function subscribe(
  mql: MediaQueryList,
  onChange: (event: MediaQueryListEvent) => void
): () => void {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }

  // Legacy Safari
  const legacy = mql as MediaQueryList & {
    addListener: (listener: (event: MediaQueryListEvent) => void) => void;
    removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
  };
  legacy.addListener(onChange);
  return () => legacy.removeListener(onChange);
}

/**
 * A Preact hook that tracks whether a CSS media query currently matches.
 * Updates reactively when the viewport or user preferences change.
 *
 * @param query - A valid CSS media query string, e.g. `"(max-width: 768px)"`
 * @param defaultMatches - Value used during SSR or when `matchMedia` is unavailable. Default: false
 * @returns Whether the query currently matches
 *
 * @example
 * ```tsx
 * function ResponsiveNav() {
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 *   return isMobile ? <MobileNav /> : <DesktopNav />;
 * }
 * ```
 */
export function useMediaQuery(query: string, defaultMatches = false): boolean {
  const [matches, setMatches] = useState(() =>
    getMatches(query, defaultMatches)
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    return subscribe(mql, (event) => {
      setMatches(event.matches);
    });
  }, [query]);

  return matches;
}
