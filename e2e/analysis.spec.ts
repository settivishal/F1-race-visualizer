import { expect, test } from '@playwright/test';

/**
 * The Analysis tab, covered the same way the replay is: through what a visitor
 * can see, not through internal state.
 *
 * The failure this catches is the one the ingest change makes possible — a race
 * whose stints or lap times did not import, which renders as a page with
 * headings and no chart rather than as an error.
 */
const RACE = '2025-melbourne';

test('the analysis tab charts lap times and tyre strategy', async ({ page }) => {
  await page.goto(`/races/${RACE}`);

  await page.getByRole('link', { name: 'Analysis' }).click();
  await expect(page).toHaveURL(/view=analysis/);

  // The chart names the drivers it is drawing, so an empty one fails here.
  const chart = page.getByRole('img', { name: /^lap times for .+/i });
  await expect(chart).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole('heading', { name: 'Tyres' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Race pace' })).toBeVisible();

  // The pace table has a row per driver who set a lap.
  const paceRows = page.locator('table').last().locator('tbody tr');
  await expect.poll(async () => paceRows.count(), { timeout: 15_000 }).toBeGreaterThan(10);
});

test('the selected view survives a reload, because it lives in the URL', async ({ page }) => {
  await page.goto(`/races/${RACE}?view=analysis`);

  const analysisTab = page.getByRole('link', { name: 'Analysis' });
  await expect(analysisTab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Lap times' })).toBeVisible({ timeout: 30_000 });
});

test('a driver can be added to and removed from the lap-time chart', async ({ page }) => {
  await page.goto(`/races/${RACE}?view=analysis`);

  const chart = page.getByRole('img', { name: /^lap times for .+/i });
  await expect(chart).toBeVisible({ timeout: 30_000 });

  // The chart opens with the five quickest by median pace, and Hamilton is not
  // one of them here — which makes him the driver whose toggle proves the
  // control does something. The assertion below states that precondition rather
  // than assuming it.
  const hamilton = page.getByRole('button', { name: 'HAM', exact: true });
  await expect(hamilton).toHaveAttribute('aria-pressed', 'false');

  await hamilton.click();
  await expect(hamilton).toHaveAttribute('aria-pressed', 'true');
  // The label lists the drivers being drawn, so it names him once he is on.
  await expect(chart).toHaveAttribute('aria-label', /hamilton/i);

  await hamilton.click();
  await expect(chart).not.toHaveAttribute('aria-label', /hamilton/i);
});
