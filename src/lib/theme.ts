export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

/**
 * Which theme is on screen, read the way `globals.css` decides it: an explicit
 * `.dark`/`.light` on the root wins, and with neither the media query does.
 * Dark is the default, so anything short of an actual light preference is dark
 * — the same `not (prefers-color-scheme: light)` test the `dark` variant uses.
 * Written as a function over plain values so it can be tested without a DOM.
 */
export function activeTheme(rootClasses: Iterable<string>, prefersLight: boolean): Theme {
  const classes = [...rootClasses];
  if (classes.includes('dark')) return 'dark';
  if (classes.includes('light')) return 'light';
  return prefersLight ? 'light' : 'dark';
}

/**
 * Applies the stored choice before the first paint, or the page renders in the
 * system theme and then swaps — the flash every toggle has to answer for. It
 * runs from `<head>` as a blocking inline script, so it is a string rather than
 * a module: nothing that has to be fetched can be ahead of the paint.
 * `try` because Safari's private mode throws on `localStorage` rather than
 * returning null, and a theme is not worth a blank page.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="light")document.documentElement.classList.add(t)}catch(e){}`;
