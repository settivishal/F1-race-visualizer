import { expect, test } from '@playwright/test';

/**
 * The archive pages, and the one thing that separates an archive race from a
 * modern one: it must say what its era did not publish rather than showing
 * empty columns.
 */
test('a driver page shows a record built from the seasons imported', async ({ page }) => {
  await page.goto('/drivers/ham');

  await expect(page.getByRole('heading', { name: 'Lewis Hamilton' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: 'By season' })).toBeVisible();

  // The record table has a row per season the database holds for him.
  const rows = page.locator('table tbody tr');
  await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(0);
});

test('the archive index pages list what has been imported', async ({ page }) => {
  await page.goto('/teams');
  await expect(page.getByRole('link', { name: /ferrari/i }).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.goto('/circuits');
  await expect(page.getByRole('link', { name: /albert park/i }).first()).toBeVisible();
});

test('a circuit page shows only the facts it has', async ({ page }) => {
  await page.goto('/circuits/albert_park');

  await expect(page.getByRole('heading', { name: /albert park/i })).toBeVisible({
    timeout: 30_000,
  });
  // Seeded facts, not the invented "15 turns, 5.0 km" the old lookup returned
  // for anything it did not recognise.
  await expect(page.getByText('5.278 km')).toBeVisible();
});

test('an archive race says what its era did not publish', async ({ page }) => {
  await page.goto('/races/2019-melbourne');

  await expect(page.getByRole('img', { name: /race position chart/i })).toBeVisible({
    timeout: 30_000,
  });
  // The absence is stated, and the columns that would have held dashes are gone.
  // Gaps are no longer mentioned: `gap` is null on every row of every race, so
  // the column went and the notice stopped claiming it was an era thing.
  await expect(page.getByText(/sector times were not published/i)).toBeVisible();
  await expect(page.getByText('S1', { exact: true })).toHaveCount(0);
});
