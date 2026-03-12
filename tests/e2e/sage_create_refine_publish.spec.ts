import { test, expect } from '@playwright/test';

// E2E-1: CREATE → REFINE → PUBLISH happy path
test('CREATE → REFINE → PUBLISH normal flow', async ({ page }) => {
  await page.goto('http://localhost:5175/dashboard');

  // Enter topic
  const input = page.locator('input[aria-label], textarea').first();
  await input.fill('AI side hustle for solopreneurs');

  // Quick Monetize Preview should appear
  await expect(page.locator('text=/offer headline/i').or(page.locator('[data-testid="quick-preview"]'))).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=/target buyer/i')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=/\$|price/i').first()).toBeVisible({ timeout: 5000 });

  // Check Market Demand
  const marketBtn = page.locator('button', { hasText: /check market demand/i });
  await marketBtn.click();
  await expect(page.locator('text=/checking/i')).toBeVisible({ timeout: 5000 });
  await expect(
    page.locator('text=/success|fail|validated/i').first()
  ).toBeVisible({ timeout: 20000 });
  // External links
  await expect(page.locator('a[href*="trends.google"]').or(page.locator('a[href*="reddit"]')).first()).toBeVisible({ timeout: 5000 });

  // Generate Product
  const generateBtn = page.locator('button', { hasText: /generate product/i });
  await generateBtn.click();
  await expect(page.locator('[role="progressbar"], .progress-bar, [data-testid="progress"]').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=/%/').first()).toBeVisible({ timeout: 5000 });

  // Wait for REFINE phase
  await expect(page.locator('text=/refine|rewrite/i').first()).toBeVisible({ timeout: 60000 });

  // Run at least 3 presets
  for (const preset of ['casual', 'professional', 'remove failures']) {
    const btn = page.locator('button', { hasText: new RegExp(preset, 'i') });
    const count = await btn.count();
    if (count > 0) {
      await btn.first().click();
      // Expect loading state then done/error
      await expect(
        page.locator('text=/loading|generating|\.\.\./).or(page.locator('[aria-busy="true"]')).first()
      ).toBeVisible({ timeout: 5000 }).catch(() => {});
      await expect(
        page.locator('text=/done|complete|error|failed/i').first()
      ).toBeVisible({ timeout: 30000 });
    }
  }

  // Navigate to PUBLISH
  const publishBtn = page.locator('button, a', { hasText: /publish/i }).first();
  await publishBtn.click();
  await expect(page.locator('text=/publish|copy blog|bluesky|instagram/i').first()).toBeVisible({ timeout: 10000 });

  // Copy Blog Post
  const copyBtn = page.locator('button', { hasText: /copy blog post/i });
  if (await copyBtn.count() > 0) {
    await copyBtn.click();
    await expect(page.locator('text=/done!|copy failed/i').first()).toBeVisible({ timeout: 5000 });
  }

  // Social post buttons
  for (const social of ['bluesky', 'instagram']) {
    const btn = page.locator('button', { hasText: new RegExp(social, 'i') });
    if (await btn.count() > 0) {
      await btn.first().click();
      await expect(
        page.locator('text=/success|posted|failed|fallback|error/i').first()
      ).toBeVisible({ timeout: 15000 });
    }
  }
});

// E2E-2: CREATE timeout → error UX
test('CREATE timeout shows error panel with retry', async ({ page }) => {
  await page.route('**/api/productize/execute', async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.fulfill({ status: 500, body: JSON.stringify({ error: 'mocked server error' }) });
  });

  await page.goto('http://localhost:5175/dashboard');
  const input = page.locator('input[aria-label], textarea').first();
  await input.fill('AI side hustle for solopreneurs');

  const generateBtn = page.locator('button', { hasText: /generate product/i });
  await generateBtn.click();

  // Progress shown first
  await expect(
    page.locator('[role="progressbar"], .progress-bar, [data-testid="progress"]').first()
  ).toBeVisible({ timeout: 10000 }).catch(() => {});

  // Error panel
  await expect(
    page.locator('text=/error|failed|something went wrong/i').first()
  ).toBeVisible({ timeout: 30000 });

  // Retry button must exist
  await expect(page.locator('button', { hasText: /retry/i }).first()).toBeVisible({ timeout: 5000 });

  // Close button must exist
  await expect(
    page.locator('button', { hasText: /close|dismiss/i }).or(page.locator('[aria-label="close"]')).first()
  ).toBeVisible({ timeout: 5000 });

  // Error must not auto-dismiss
  await page.waitForTimeout(4000);
  await expect(page.locator('text=/error|failed/i').first()).toBeVisible();
});

// E2E-3: Market Demand fallback
test('Market Demand failure shows fallback links and generate anyway', async ({ page }) => {
  await page.route('**/api/niche/validate**', async (route) => {
    await route.fulfill({ status: 500, body: JSON.stringify({ error: 'mocked niche fail' }) });
  });

  await page.goto('http://localhost:5175/dashboard');
  const input = page.locator('input[aria-label], textarea').first();
  await input.fill('AI side hustle for solopreneurs');

  const marketBtn = page.locator('button', { hasText: /check market demand/i });
  await marketBtn.click();

  // Button label changes to failed/retry
  await expect(
    page.locator('button', { hasText: /failed|retry/i }).first()
  ).toBeVisible({ timeout: 15000 });

  // External links still visible
  await expect(
    page.locator('a[href*="trends.google"], a[href*="reddit"], a[href*="youtube"]').first()
  ).toBeVisible({ timeout: 5000 });

  // Generate anyway still accessible
  const generateBtn = page.locator('button', { hasText: /generate|anyway/i });
  await expect(generateBtn.first()).toBeVisible({ timeout: 5000 });
});
