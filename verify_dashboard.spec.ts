import { test, expect } from '@playwright/test';

test('verify merchant dashboard security and snippet', async ({ page }) => {
  await page.goto('http://localhost:3000/#dashboard');

  // Enter public key
  const keyInput = page.locator('input[placeholder="Enter API Key"]');
  await keyInput.fill('public-preview-2025');

  // Click sync
  await page.click('button:has-text("Sync")');

  // Verify stats appear (at least the headers)
  await expect(page.locator('text=Total Sessions')).toBeVisible();

  // Verify snippet appears
  await expect(page.locator('text=Quick Integration Snippet')).toBeVisible();

  // Verify the snippet contains the key
  const snippet = page.locator('pre');
  await expect(snippet).toContainText('public-preview-2025');

  // Verify it contains the version
  await expect(snippet).toContainText('1.1.2');

  await page.screenshot({ path: 'merchant_dashboard_verified.png', fullPage: true });
});
