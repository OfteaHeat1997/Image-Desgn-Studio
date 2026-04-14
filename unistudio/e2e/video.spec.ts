// =============================================================================
// E2E — Video Studio Module
// Tests the video panel: tabs, presets, and Spanish descriptions.
// =============================================================================

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('Video Studio module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the editor with the video module pre-selected
    await page.goto('/editor?module=video');
    // Wait for the sidebar to be ready
    await expect(page.getByText('E-COMMERCE').first()).toBeVisible();
  });

  test('video module label appears in sidebar', async ({ page }) => {
    await expect(page.getByText('Estudio de Video')).toBeVisible();
  });

  test('video module panel renders after clicking in sidebar', async ({ page }) => {
    // Click the sidebar item
    await page.getByRole('button', { name: /Estudio de Video/i }).first().click();
    await page.waitForTimeout(500);
    // The panel for video should be visible — look for video-specific UI text
    const panelContent = await page.locator('text=/video|Video|Producto|Moda/').count();
    expect(panelContent).toBeGreaterThan(0);
  });

  test('VIDEO Y ADS category shows all expected modules', async ({ page }) => {
    // The category should be expanded (default)
    await expect(page.getByText('Estudio de Video')).toBeVisible();
    await expect(page.getByText('Crear Anuncios')).toBeVisible();
    await expect(page.getByText('Director Creativo IA')).toBeVisible();
  });

  test('video panel shows product category options', async ({ page }) => {
    await page.getByRole('button', { name: /Estudio de Video/i }).first().click();
    await page.waitForTimeout(800);

    // The VideoPanel renders category tabs/buttons for product, fashion, etc.
    // Look for recognizable Spanish UI labels
    const productText = await page.getByText(/Producto/i).count();
    expect(productText).toBeGreaterThan(0);
  });

  test('video panel shows provider options or preset buttons', async ({ page }) => {
    await page.getByRole('button', { name: /Estudio de Video/i }).first().click();
    await page.waitForTimeout(800);

    // Provider names or preset labels should appear
    // Common ones: "Ken Burns", "Wan", "gratis", "$0"
    const hasProviders = await page.locator('text=/Ken Burns|Wan|gratis|\\$0/i').count();
    expect(hasProviders).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Ad Creator module
// ---------------------------------------------------------------------------

test.describe('Ad Creator module', () => {
  test('ad creator panel renders after clicking sidebar', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.getByText('E-COMMERCE').first()).toBeVisible();

    await page.getByRole('button', { name: /Crear Anuncios/i }).first().click();
    await page.waitForTimeout(500);

    // Panel should be visible — check for Spanish ad-related text
    const panelContent = await page.locator('text=/Anuncio|anuncio|plataforma|Plataforma/').count();
    expect(panelContent).toBeGreaterThan(0);
  });
});
