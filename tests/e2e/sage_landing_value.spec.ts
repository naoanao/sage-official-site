import { test, expect } from '@playwright/test';

test('Landing page does not show inflated 0+ stats', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // "0+ Posts shipped" should NOT appear
  const zeroStats = page.locator('text=/0\+\s*(posts|shipped|users)/i');
  await expect(zeroStats).toHaveCount(0);

  // BETA LAUNCH or honest copy should be present
  const betaCopy = page.locator('text=/beta|early access|launch/i').first();
  await expect(betaCopy).toBeVisible();
});

test('Landing FAQ instagram copy matches implementation', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  const faqSection = page.locator('text=/faq|frequently asked/i').first();
  const hasFaq = await faqSection.count();
  if (hasFaq > 0) {
    // Instagram mention in FAQ should not promise fully automated posting without caveats
    const igText = await page.locator('text=/instagram/i').first().textContent().catch(() => '');
    expect(igText).not.toMatch(/automatically posts to instagram without/i);
  }
});

test('CTA navigates to sales or correct purchase route', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  const ctaBtn = page.locator('a, button', { hasText: /get started|buy now|start free|purchase|join/i }).first();
  await expect(ctaBtn).toBeVisible();

  const href = await ctaBtn.getAttribute('href');
  if (href) {
    expect(href).toMatch(/\/sales|whop\.com|gumroad\.com|\/dashboard/i);
  }
});

test('Product card shows price and value description', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // Price must be visible
  await expect(page.locator('text=/\$[0-9]|¥[0-9]|[0-9]+\s*USD/').first()).toBeVisible();

  // Value proposition text (non-empty)
  const valueText = await page.locator('main, section').first().textContent();
  expect(valueText?.length ?? 0).toBeGreaterThan(100);
});

test('Trust bar does not highlight zero real-world results', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // Common patterns that imply fake social proof
  const fakeSocialProof = page.locator('text=/0 customers|0 reviews|0 sales/i');
  await expect(fakeSocialProof).toHaveCount(0);
});
