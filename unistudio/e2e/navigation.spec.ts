// =============================================================================
// E2E — Navigation & Basic Page Loads
// Tests that key pages render correctly and main UI elements are visible.
// Run: npm run test:e2e
// =============================================================================

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

test.describe('Homepage', () => {
  test('loads and shows UniStudio branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/UniStudio/i);
    // Main heading should be visible
    await expect(page.getByRole('heading', { name: /UniStudio/i }).first()).toBeVisible();
  });

  test('shows module cards — Quitar Fondo and Mejorar Calidad', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quitar Fondo').first()).toBeVisible();
    await expect(page.getByText('Mejorar Calidad').first()).toBeVisible();
  });

  test('has a working link to the editor', async ({ page }) => {
    await page.goto('/');
    // Find any link that points to /editor
    const editorLink = page.locator('a[href*="/editor"]').first();
    await expect(editorLink).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Editor page
// ---------------------------------------------------------------------------

test.describe('Editor page', () => {
  test('loads at /editor', async ({ page }) => {
    await page.goto('/editor');
    // Page should not show an error boundary — look for editor-specific content
    await expect(page.locator('text=UniStudio').first()).toBeVisible();
  });

  test('shows the module sidebar on desktop', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/editor');
    // ModuleSidebar renders with "hidden md:flex" — visible at ≥768 px
    await expect(page.getByText('E-COMMERCE').first()).toBeVisible();
    await expect(page.getByText('Quitar Fondo').first()).toBeVisible();
    await expect(page.getByText('Mejorar Calidad').first()).toBeVisible();
  });

  test('hides sidebar on mobile viewport', async ({ page }) => {
    // Mobile viewport — sidebar uses Tailwind "hidden md:flex"
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/editor');
    // The sidebar container has class "hidden md:flex"; on 375px it should not be visible
    const sidebar = page.locator('nav.flex-1.overflow-y-auto');
    await expect(sidebar).not.toBeVisible();
  });

  test('shows dropzone or empty state before image is uploaded', async ({ page }) => {
    await page.goto('/editor');
    // EmptyState or Dropzone should be visible before any image
    // Look for the upload prompt text or the dropzone component
    const hasDropzone = await page.locator('[class*="dropzone"], [data-testid="dropzone"]').count();
    const hasEmptyState = await page.locator('text=Sube una imagen').count();
    const hasUploadText = await page.locator('text=/subir|imagen|upload/i').count();
    expect(hasDropzone + hasEmptyState + hasUploadText).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Other pages
// ---------------------------------------------------------------------------

test.describe('Other pages', () => {
  test('gallery page loads at /gallery', async ({ page }) => {
    await page.goto('/gallery');
    await expect(page).not.toHaveURL(/error/i);
    // Should show some kind of heading or content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('batch page loads at /batch', async ({ page }) => {
    await page.goto('/batch');
    await expect(page).not.toHaveURL(/error/i);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('brand-kit page loads at /brand-kit', async ({ page }) => {
    await page.goto('/brand-kit');
    await expect(page).not.toHaveURL(/error/i);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('health endpoint returns healthy or degraded JSON', async ({ page }) => {
    const res = await page.request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toMatch(/healthy|degraded/);
  });
});
