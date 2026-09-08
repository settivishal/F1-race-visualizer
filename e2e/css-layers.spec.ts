import { expect, test } from '@playwright/test';

/**
 * A utility must beat a component class.
 *
 * This has gone wrong twice. `button { color: inherit }` and `a { color:
 * inherit }` were written as plain CSS after `@import "tailwindcss"`, and
 * unlayered CSS outranks every layered rule whatever its specificity — so both
 * silently overrode `text-on-accent` on every button and link on the site. The
 * primary button rendered the page foreground on red for months and looked
 * deliberate.
 *
 * The design-system classes had the same shape: `.type-page-title` sets a font
 * size and weight, so unlayered it would have beaten `text-sm` on the same
 * element. Nothing had tried yet.
 *
 * The failure is invisible — no error, no warning, just a class that does
 * nothing — which is exactly why it is worth a test rather than a convention.
 */
test('a Tailwind utility overrides a component class', async ({ page }) => {
  await page.goto('/');

  const computed = await page.evaluate(() => {
    const probe = document.createElement('h1');
    // The class sets 1.875rem/700; the utilities ask for 0.875rem/400.
    probe.className = 'type-page-title text-sm font-normal';
    probe.textContent = 'probe';
    document.body.appendChild(probe);

    const style = getComputedStyle(probe);
    const result = { fontSize: style.fontSize, fontWeight: style.fontWeight };
    probe.remove();
    return result;
  });

  expect(computed).toEqual({ fontSize: '14px', fontWeight: '400' });
});

test('a colour utility overrides the form-control reset', async ({ page }) => {
  await page.goto('/');

  const colour = await page.evaluate(() => {
    const probe = document.createElement('button');
    probe.className = 'text-on-accent';
    probe.textContent = 'probe';
    document.body.appendChild(probe);

    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });

  // --on-accent is white in both themes. Before the fix this was the page
  // foreground, because `button { color: inherit }` sat outside every layer.
  expect(colour).toBe('rgb(255, 255, 255)');
});
