import { expect, test } from '@playwright/test';

/**
 * The smoke test the design doc asks for: load a race, press play, assert the
 * positions changed.
 *
 * "Changed" is the tower's order, not a pixel or an internal state value. The
 * tower is the canvas's text alternative, so asserting on it covers the chart
 * as well — both render from the same lap — and it fails for the failures that
 * matter: no data, a player that renders but never advances, a lap loop that
 * advances the counter while every driver stays put.
 */
const RACE = '2025-melbourne';

/** `... race position chart, lap 12 of 57` — the label the chart already has. */
function lapFrom(label: string | null): number {
  return Number(/lap (\d+) of/i.exec(label ?? '')?.[1] ?? NaN);
}

test('a race replays: the lap advances and the order changes', async ({ page }) => {
  await page.goto(`/races/${RACE}`);

  const chart = page.getByRole('img', { name: /race position chart/i });
  await expect(chart).toBeVisible({ timeout: 30_000 });

  const startingLap = lapFrom(await chart.getAttribute('aria-label'));
  expect(startingLap).toBeGreaterThan(0);

  const order = () => page.getByTestId('tower-driver').allInnerTexts();
  const startingOrder = await order();
  // A tower with one row would make the order assertion below vacuous.
  expect(startingOrder.length).toBeGreaterThan(10);

  await page.getByRole('button', { name: 'Play replay' }).click();
  await expect(page.getByRole('button', { name: 'Pause replay' })).toBeVisible();

  await expect
    .poll(async () => lapFrom(await chart.getAttribute('aria-label')), { timeout: 45_000 })
    .toBeGreaterThan(startingLap);

  await expect.poll(order, { timeout: 45_000 }).not.toEqual(startingOrder);
});
