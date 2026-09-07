'use client';

import { Button } from '@/components/ui/button';
import { THEME_STORAGE_KEY, activeTheme } from '@/lib/theme';

/**
 * Two states, light and dark. Once clicked the choice is the choice — there is
 * no third "follow the system" state to return to, which is the trade a
 * two-state toggle makes and the reason the stored value is only ever written,
 * never cleared.
 *
 * No `useState`. The button renders both icons and lets the `dark` variant hide
 * one, so the server and the first client render agree on the markup and there
 * is nothing to hydrate — the theme lives in the DOM, and the DOM is read at
 * click time rather than mirrored into React.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = activeTheme(
      root.classList,
      window.matchMedia('(prefers-color-scheme: light)').matches,
    );
    const next = current === 'dark' ? 'light' : 'dark';

    root.classList.toggle('dark', next === 'dark');
    root.classList.toggle('light', next === 'light');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // A theme that cannot be remembered still applies for this page.
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="h-9 w-9 px-0"
      aria-label="Switch between light and dark theme"
    >
      {/* Each icon shows the theme it switches to, so the moon is the one on
          screen in light mode. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5 dark:hidden"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="hidden h-5 w-5 dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </Button>
  );
}
