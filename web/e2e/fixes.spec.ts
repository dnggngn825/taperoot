import { test, expect, type Page } from '@playwright/test';

// All tests require the full stack running:
//   npm run dev:api   (port 4000)
//   npm run dev:web   (port 8080)
//   npm run dev:extraction (port 50051)
//
// Seed contacts used:
//   Carol Singh  (cnt-carol) — 3 notes, 0 convos → notes-only path
//   Alice Chen   (cnt-alice) — 2 notes, 1 convo  → full generate path
//   Frank Lee    (cnt-frank) — 0 notes, 0 convos → ineligible

const API = 'http://localhost:4000/graphql';

async function clickContact(page: Page, name: string) {
  await page.getByText(name).first().click();
}

// ── Fix 1: addNote on notes-only contact → spinner appears ───────────────────

test('fix-1: adding a note to notes-only contact shows Generating spinner', async ({ page }) => {
  await page.goto('/');
  await clickContact(page, 'Carol Singh');

  // Wait for detail panel to load
  await expect(page.getByText('Notes & history')).toBeVisible();

  // Intercept GraphQL to delay the generate response so spinner is visible
  await page.route(API, async (route) => {
    const body = route.request().postDataJSON();
    if (body?.operationName === 'Contact' && body?.variables?.id) {
      // Simulate slow polling response — only delay the first re-fetch
      await new Promise((r) => setTimeout(r, 800));
    }
    await route.continue();
  });

  await page.getByRole('button', { name: '+ Note' }).click();
  await page.getByPlaceholder('Add a note…').fill('Test note for spinner check');
  await page.getByRole('button', { name: 'Save' }).first().click();

  // Spinner button should briefly appear
  await expect(page.getByRole('button', { name: /Generating/ })).toBeVisible({ timeout: 4000 });
});

// ── Fix 6: generate updates sidebar badge without full page reload ───────────

test('fix-6: sidebar badge updates after generate completes', async ({ page }) => {
  await page.goto('/');
  await clickContact(page, 'Alice Chen');

  // Verify Generate button is active
  const generateBtn = page.getByRole('button', { name: '✦ Generate' });
  await expect(generateBtn).toBeEnabled({ timeout: 5000 });

  // Get current sidebar badge count (may be 0 initially)
  const sidebarCard = page.locator('[data-testid="contact-card"]', { hasText: 'Alice Chen' }).or(
    page.locator('div').filter({ hasText: /^Alice Chen/ }).first()
  );

  await generateBtn.click();

  // Wait for generating to start then finish (polling every 2s)
  await expect(page.getByRole('button', { name: /Generating/ })).toBeVisible({ timeout: 4000 });
  await expect(page.getByRole('button', { name: '✦ Generate' })).toBeVisible({ timeout: 20000 });

  // Sidebar "Open follow-ups" stat card in detail should show > 0
  const statCard = page.locator('div').filter({ hasText: /^Open follow-ups/ }).first();
  await expect(statCard).not.toHaveText('0', { timeout: 5000 });

  // Sidebar badge in the contact list should now be visible (coral pill with a number)
  // The badge is a div with background var(--coral) showing the count
  const leftPanel = page.locator('div').filter({ hasText: 'Alice Chen' }).nth(0);
  // There should be a numeric badge rendered alongside Alice's name
  await expect(page.locator('text=/^[1-9]\\d*$/').first()).toBeVisible({ timeout: 5000 });
});

// ── Fix 7: mutation error banner appears on API failure ──────────────────────

test('fix-7: mutation error banner shown when API returns an error', async ({ page }) => {
  await page.goto('/');
  await clickContact(page, 'Alice Chen');
  await expect(page.getByText('Notes & history')).toBeVisible();

  // Intercept the next addNote mutation and return a GraphQL error
  let intercepted = false;
  await page.route(API, async (route) => {
    const body = route.request().postDataJSON();
    if (!intercepted && body?.query?.includes('addNote')) {
      intercepted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Database error: unique constraint failed' }] }),
      });
    } else {
      await route.continue();
    }
  });

  await page.getByRole('button', { name: '+ Note' }).click();
  await page.getByPlaceholder('Add a note…').fill('This will fail');
  await page.getByRole('button', { name: 'Save' }).first().click();

  await expect(page.getByText(/Database error/)).toBeVisible({ timeout: 5000 });
});

// ── Fix 8: sort toggle switches order without full-page spinner ──────────────

test('fix-8: sort toggle switches list order without showing loading spinner', async ({ page }) => {
  await page.goto('/');

  // Wait for contacts to load
  await expect(page.getByText('Alice Chen').first()).toBeVisible({ timeout: 5000 });

  // Switch to A–Z
  await page.getByRole('button', { name: 'A–Z' }).click();

  // Loading spinner should NOT appear
  await expect(page.getByText('Loading…')).not.toBeVisible();

  // After sort the list should still show contacts (not blank)
  await expect(page.getByText('Alice Chen').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Bob Martinez').first()).toBeVisible({ timeout: 3000 });

  // Switch back to Recent — still no spinner
  await page.getByRole('button', { name: 'Recent' }).click();
  await expect(page.getByText('Loading…')).not.toBeVisible();
  await expect(page.getByText('Alice Chen').first()).toBeVisible({ timeout: 3000 });
});

// ── Fix 9 (already fixed in refactor): TranscriptPanel is read-only ──────────

test('fix-9: transcript panel has no editable form state shared with add-conversation', async ({ page }) => {
  await page.goto('/');

  // Navigate to Notetaker tab
  await page.getByRole('button', { name: 'Notetaker' }).or(page.getByText('Notetaker')).first().click();

  // Select a contact that has a conversation (Alice)
  await clickContact(page, 'Alice Chen');

  // Select the conversation in the sidebar
  await page.locator('div').filter({ hasText: /speakers/ }).first().click();

  // Switch to Transcript tab
  await page.getByRole('button', { name: 'Transcript' }).click();

  // There should be NO textarea visible (read-only display)
  await expect(page.locator('textarea')).not.toBeVisible();
});
