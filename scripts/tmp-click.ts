import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 1. Click the sprint row.
await page.goto('http://localhost:3000/races?q=sprint', { waitUntil: 'networkidle' });
const card = page.locator('li:has(h2)').first();
await card.getByRole('link', { name: /Sprint/i }).click();
await page.waitForLoadState('networkidle');
console.log('sprint row  ->', new URL(page.url()).pathname);
console.log('  badge:', (await page.locator('h1').first().innerText()).replace(/\n/g, ' | '));
console.log('  tabs:', await page.getByRole('tab').or(page.getByRole('link', { name: /Replay|Analysis/ })).allInnerTexts());

// 2. Click the card body (the stretched title link).
await page.goBack();
await page.waitForLoadState('networkidle');
await card.locator('h2').click();
await page.waitForLoadState('networkidle');
console.log('card title  ->', new URL(page.url()).pathname);

// 3. Click empty space in the card — should also reach the grand prix.
await page.goBack();
await page.waitForLoadState('networkidle');
const box = (await card.boundingBox())!;
await page.mouse.click(box.x + box.width - 30, box.y + 20);
await page.waitForLoadState('networkidle');
console.log('card corner ->', new URL(page.url()).pathname);
await browser.close();
