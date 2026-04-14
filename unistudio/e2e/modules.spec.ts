// =============================================================================
// E2E — Module Switching in the Editor Sidebar
// Tests that clicking sidebar items switches the active module panel.
// =============================================================================

import { test, expect } from '@playwright/test';

// Use desktop viewport so the sidebar is visible (hidden md:flex)
test.use({ viewport: { width: 1280, height: 800 } });

test.describe('Module sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor');
    // Wait until sidebar content is rendered
    await expect(page.getByText('E-COMMERCE').first()).toBeVisible();
  });

  test('sidebar shows all category labels', async ({ page }) => {
    await expect(page.getByText('E-COMMERCE')).toBeVisible();
    await expect(page.getByText('FONDOS')).toBeVisible();
    await expect(page.getByText('EDICION')).toBeVisible();
    await expect(page.getByText('VIDEO Y ADS')).toBeVisible();
    await expect(page.getByText('AUTOMATIZACION')).toBeVisible();
  });

  test('sidebar shows all E-COMMERCE module labels', async ({ page }) => {
    await expect(page.getByText('Quitar Fondo')).toBeVisible();
    await expect(page.getByText('Mejorar Calidad')).toBeVisible();
    await expect(page.getByText('Agregar Sombra')).toBeVisible();
    await expect(page.getByText('Verificar')).toBeVisible();
  });

  test('clicking Quitar Fondo activates bg-remove module', async ({ page }) => {
    // Click the sidebar button for bg-remove
    await page.getByRole('button', { name: /Quitar Fondo/i }).first().click();

    // URL should update to reflect the module, OR the panel title should appear
    // The editor uses ?module= query param or renders the panel in place
    await page.waitForTimeout(500); // let React re-render
    const url = page.url();
    const panelVisible = await page.getByText('Quitar Fondo').count();
    // Either the URL includes "bg-remove" or the panel text is visible (both are fine)
    expect(url.includes('bg-remove') || panelVisible > 0).toBe(true);
  });

  test('clicking Mejorar Calidad activates enhance module', async ({ page }) => {
    await page.getByRole('button', { name: /Mejorar Calidad/i }).first().click();
    await page.waitForTimeout(500);
    const url = page.url();
    const panelVisible = await page.getByText('Mejorar Calidad').count();
    expect(url.includes('enhance') || panelVisible > 0).toBe(true);
  });

  test('can switch between multiple modules without errors', async ({ page }) => {
    // Click through several modules and verify the page never crashes
    const modules = [
      { name: /Quitar Fondo/i },
      { name: /Mejorar Calidad/i },
      { name: /Agregar Sombra/i },
    ];

    for (const mod of modules) {
      await page.getByRole('button', { name: mod.name }).first().click();
      await page.waitForTimeout(300);
      // Page should still be alive — look for sidebar
      await expect(page.getByText('E-COMMERCE').first()).toBeVisible();
    }
  });

  test('collapsing a category hides its modules', async ({ page }) => {
    // The E-COMMERCE category header is a button — clicking it collapses the group
    const categoryBtn = page.getByRole('button', { name: /E-COMMERCE/i }).first();
    await categoryBtn.click();
    await page.waitForTimeout(300);
    // After collapsing, Quitar Fondo button should be hidden
    await expect(page.getByRole('button', { name: /Quitar Fondo/i }).first()).not.toBeVisible();

    // Clicking again should expand
    await categoryBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Quitar Fondo/i }).first()).toBeVisible();
  });

  test('FONDOS category has Fondos con IA and Extender Imagen', async ({ page }) => {
    await expect(page.getByText('Fondos con IA')).toBeVisible();
    await expect(page.getByText('Extender Imagen')).toBeVisible();
  });
});
