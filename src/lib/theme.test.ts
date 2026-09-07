import { describe, expect, it } from 'vitest';
import { THEME_SCRIPT, activeTheme } from './theme';

describe('activeTheme', () => {
  it('lets an explicit class beat the system preference in both directions', () => {
    expect(activeTheme(['dark'], true)).toBe('dark');
    expect(activeTheme(['light'], false)).toBe('light');
  });

  it('follows the media query when no class is set', () => {
    expect(activeTheme([], true)).toBe('light');
    expect(activeTheme([], false)).toBe('dark');
  });

  it('treats no-preference as dark, the way the css does', () => {
    // `prefersLight` is the result of `(prefers-color-scheme: light)`, so a
    // browser reporting no-preference arrives here as false — and must not
    // come back light, or the tokens and the `dark:` utilities disagree.
    expect(activeTheme(['h-full', 'antialiased'], false)).toBe('dark');
  });
});

describe('THEME_SCRIPT', () => {
  it('applies only a stored theme, and only a known one', () => {
    const root = { classList: { added: [] as string[], add(c: string) { this.added.push(c); } } };
    const run = (stored: string | null) => {
      root.classList.added = [];
      new Function('localStorage', 'document', THEME_SCRIPT)(
        { getItem: () => stored },
        { documentElement: root },
      );
      return root.classList.added;
    };

    expect(run('light')).toEqual(['light']);
    expect(run('dark')).toEqual(['dark']);
    expect(run(null)).toEqual([]);
    expect(run('__proto__')).toEqual([]);
  });
});
