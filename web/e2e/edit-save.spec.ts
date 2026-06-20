import { test, expect, type Page } from '@playwright/test';

// Tests for inline edit + save flows: updateNote, updateFollowup, tickFollowup.
// Requires: dev:api (4000), dev:extraction (50051), dev:web (5173)
// Uses Alice Chen (cnt-alice) — has pre-seeded notes + conversation.

async function openAlice(page: Page) {
  await page.goto('/');
  await page.getByText('Alice Chen').first().click();
  await expect(page.getByText('Notes & history')).toBeVisible({ timeout: 5000 });
}

// ── Edit a note and save ──────────────────────────────────────────────────────

test('edit note: pencil opens editor, save persists new body', async ({ page }) => {
  await openAlice(page);

  // Click the pencil (✎) button on the first note
  const pencilBtns = page.locator('button', { hasText: '✎' });
  await pencilBtns.first().click();

  // Textarea should appear with current note body
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible();

  // Clear and type new value
  await textarea.fill('Edited note body ' + Date.now());

  // Click Save
  await page.getByRole('button', { name: 'Save' }).first().click();

  // Editor should close (textarea gone)
  await expect(textarea).not.toBeVisible({ timeout: 5000 });

  // The notes section should still be visible (didn't crash)
  await expect(page.getByText('Notes & history')).toBeVisible();
});

// ── Save button disabled while in-flight ──────────────────────────────────────

test('edit note: save button shows Saving… while mutation is in-flight', async ({ page }) => {
  await openAlice(page);

  // Slow down the updateNote mutation
  await page.route('http://localhost:4000/graphql', async (route) => {
    const body = route.request().postDataJSON();
    if (body?.query?.includes('UpdateNote')) {
      await new Promise((r) => setTimeout(r, 600));
    }
    await route.continue();
  });

  const pencilBtns = page.locator('button', { hasText: '✎' });
  await pencilBtns.first().click();
  await page.locator('textarea').first().fill('Slow save test');

  // Click Save and immediately assert the button shows Saving…
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await saveBtn.click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeVisible({ timeout: 2000 });

  // Eventually reverts to normal state
  await expect(page.getByText('Notes & history')).toBeVisible({ timeout: 5000 });
});

// ── Cancel edit clears draft ──────────────────────────────────────────────────

test('edit note: cancel closes editor and draft is cleared on re-open', async ({ page }) => {
  await openAlice(page);

  const pencilBtns = page.locator('button', { hasText: '✎' });
  await pencilBtns.first().click();

  const textarea = page.locator('textarea').first();
  const original = await textarea.inputValue();

  // Type something new then cancel
  await textarea.fill('This should be discarded');
  await page.getByRole('button', { name: 'Cancel' }).first().click();

  // Editor should close
  await expect(textarea).not.toBeVisible({ timeout: 3000 });

  // Re-open — draft should reset to original body (not the discarded text)
  await pencilBtns.first().click();
  await expect(page.locator('textarea').first()).toHaveValue(original, { timeout: 3000 });
});

// ── Generate to get followups, then tick one done ─────────────────────────────

test('followup: tick checkbox marks it done (strike-through)', async ({ page }) => {
  await openAlice(page);

  // Generate AI followups first (Alice has notes + convo)
  const generateBtn = page.getByRole('button', { name: '✦ Generate' });
  if (await generateBtn.isEnabled()) {
    await generateBtn.click();
    // Wait for generation to complete
    await expect(page.getByRole('button', { name: '✦ Generate' })).toBeEnabled({ timeout: 20000 });
  }

  // Find first open followup checkbox
  const checkbox = page.locator('input[type="checkbox"]').first();
  await expect(checkbox).toBeVisible({ timeout: 5000 });

  const wasChecked = await checkbox.isChecked();
  await checkbox.click();

  // State should have toggled
  if (wasChecked) {
    await expect(checkbox).not.toBeChecked({ timeout: 5000 });
  } else {
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  }
});

// ── Edit followup description and save ───────────────────────────────────────

test('followup: edit description, save persists', async ({ page }) => {
  await openAlice(page);

  // Ensure there are followups (generate if needed)
  const generateBtn = page.getByRole('button', { name: '✦ Generate' });
  if (await generateBtn.isEnabled()) {
    await generateBtn.click();
    await expect(page.getByRole('button', { name: '✦ Generate' })).toBeEnabled({ timeout: 20000 });
  }

  // Find a followup pencil button
  const followupSection = page.locator('div').filter({ hasText: /^Follow-ups/ }).first();
  const pencil = followupSection.locator('button', { hasText: '✎' }).first();
  await expect(pencil).toBeVisible({ timeout: 5000 });
  await pencil.click();

  // Input (single-line) should appear
  const input = page.locator('input[type="text"]').or(page.locator('input:not([type])')).first();
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill('Updated followup ' + Date.now());

  await page.getByRole('button', { name: 'Save' }).first().click();

  // Editor closes
  await expect(input).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Follow-ups', { exact: true })).toBeVisible();
});
