import { useEffect, useState } from 'preact/hooks';

export type PreferredTheme = 'light' | 'dark' | 'no-preference';

/**
 * A Preact hook that returns the user's preferred color scheme based on the
 * `prefers-color-scheme` media query. Updates reactively when the user changes
 * their system or browser theme preference.
 *
 * @returns The preferred theme: 'light', 'dark', or 'no-preference'
 *
 * @example
 * ```tsx
 * function ThemeAwareComponent() {
 *   const theme = usePreferredTheme();
 *   return (
 *     <div data-theme={theme}>
 *       Current preference: {theme}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePreferredTheme(): PreferredTheme {
  const [theme, setTheme] = useState<PreferredTheme>(() => {
    if (typeof window === 'undefined') return 'no-preference';

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

    if (darkQuery.matches) return 'dark';
    if (lightQuery.matches) return 'light';
    return 'no-preference';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    // Re-check in case of no-preference (some browsers don't support light query)
    const updateTheme = () => {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

      if (darkQuery.matches) setTheme('dark');
      else if (lightQuery.matches) setTheme('light');
      else setTheme('no-preference');
    };

    mediaQuery.addEventListener('change', handleChange);

    // Fallback: some environments may not fire change, so we also listen for light
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
    lightQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      lightQuery.removeEventListener('change', updateTheme);
    };
  }, []);

  return theme;
}
