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

test('focusing a driver names them on the chart, and pressing again clears it', async ({
  page,
}) => {
  await page.goto(`/races/${RACE}`);

  const chart = page.getByRole('img', { name: /race position chart/i });
  await expect(chart).toBeVisible({ timeout: 30_000 });

  const code = (await page.getByTestId('tower-driver').first().innerText()).trim();
  const named = new RegExp(`\\b${code}\\b`);
  // The two controls the plan gave this feature, asserted as one piece of
  // state: the tower row is pressed from the tower, and the chip above the
  // chart must agree without being touched.
  const row = page.locator('#replay-timing-tower').getByRole('button', { name: named }).first();
  const chip = page.getByTestId('driver-chips').getByRole('button', { name: named }).first();

  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await expect(chart).toHaveAttribute('aria-label', /focused on /i);

  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'false');
  await expect(chart).not.toHaveAttribute('aria-label', /focused on /i);

  // And the same state reached from the other control.
  await chip.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
});

test('hovering a driver previews the emphasis without committing to it', async ({ page }) => {
  await page.goto(`/races/${RACE}`);
  await expect(page.getByRole('img', { name: /race position chart/i })).toBeVisible({
    timeout: 30_000,
  });

  // The cars are `<g opacity>` groups: exactly one at full strength is what
  // "one driver stands out" means, and it is the assertion the pixels cannot
  // give us.
  const fullStrengthCars = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('svg g > g[opacity]')].filter(
          (group) => group.getAttribute('opacity') === '1',
        ).length,
    );

  const row = page.locator('#replay-timing-tower').getByRole('button').first();

  await row.hover();
  await expect.poll(fullStrengthCars).toBe(1);
  // A hover is a preview, not a choice.
  await expect(row).toHaveAttribute('aria-pressed', 'false');

  // And leaving puts the whole field back at full strength, rather than
  // leaving the last hovered driver lit.
  await page.mouse.move(0, 0);
  await expect.poll(fullStrengthCars).toBeGreaterThan(1);
});
