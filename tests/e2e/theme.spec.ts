import { expect, test } from '@playwright/test';

test('defaults to light when the OS prefers light', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	const bg = await page.evaluate(() =>
		getComputedStyle(document.body).backgroundColor,
	);
	expect(bg).toBe('rgb(251, 251, 249)');
});

test('follows the OS when it prefers dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	const bg = await page.evaluate(() =>
		getComputedStyle(document.body).backgroundColor,
	);
	expect(bg).toBe('rgb(17, 17, 19)');
});

test('the toggle flips the theme and persists it across a reload', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');

	await page.getByRole('button', { name: /theme/i }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the stored theme is applied before first paint', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	await page.evaluate(() => localStorage.setItem('theme', 'dark'));

	// If the inline head script is missing or deferred, the document paints
	// light first and this attribute is absent on the very first DOM snapshot.
	await page.goto('/', { waitUntil: 'commit' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
