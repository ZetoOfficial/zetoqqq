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

test("the toggle's accessible name describes the action and updates on click", async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');

	// /theme/i must still resolve to exactly one control after the name
	// becomes state-dependent ("Switch to dark theme" / "Switch to light
	// theme") rather than the static "Toggle theme" -- confirmed, not
	// assumed, since the other specs rely on this same locator.
	const toggle = page.getByRole('button', { name: /theme/i });
	await expect(toggle).toHaveAccessibleName('Switch to dark theme');

	await toggle.click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(toggle).toHaveAccessibleName('Switch to light theme');

	await toggle.click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(toggle).toHaveAccessibleName('Switch to dark theme');
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

// The behavioural test above uses `expect(locator).toHaveAttribute(...)`,
// which auto-retries for several seconds -- so it cannot distinguish "ran
// before first paint" from "ran eventually, within the retry window." A
// deferred `type="module"` script still passes it. This structural test
// reads the served markup directly and pins the properties that actually
// prevent a flash: a genuinely inline, unbundled, unattributed <script>,
// positioned before any styling in <head>.
test('the theme script is a genuine inline script that runs before any styling', async ({ request }) => {
	const response = await request.get('/');
	const html = await response.text();

	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/);
	expect(headMatch, 'expected a <head> section in the served HTML').toBeTruthy();
	const head = headMatch![1];

	const scriptTagPattern = /<script([^>]*)>([\s\S]*?)<\/script>/g;
	let themeScript: { attrs: string; index: number } | null = null;
	let match: RegExpExecArray | null;
	// Matching the literal `localStorage.getItem('theme')` source is a
	// deliberate coupling to this implementation detail, not an oversight --
	// it's how this test finds the specific script it needs to inspect among
	// possibly several in <head>. If the no-flash head script is refactored
	// (renamed key, restructured read), update this pattern to match the new
	// source rather than loosening it to "any script" or dropping the check.
	while ((match = scriptTagPattern.exec(head))) {
		if (/localStorage\.getItem\((['"`])theme\1\)/.test(match[2])) {
			themeScript = { attrs: match[1], index: match.index };
			break;
		}
	}
	expect(
		themeScript,
		"expected a <script> in <head> reading localStorage.getItem('theme')",
	).toBeTruthy();

	// The load-bearing checks: Astro's `is:inline` emits a bare inline
	// <script> with no attributes. Removing `is:inline` makes Astro bundle
	// it as a deferred `<script type="module" src="...">` instead -- this
	// is exactly the mutation that the behavioural test above fails to
	// catch, and these assertions pin it.
	expect(themeScript!.attrs).not.toMatch(/\btype\s*=\s*["']module["']/);
	expect(themeScript!.attrs).not.toMatch(/\bsrc\s*=/);
	expect(themeScript!.attrs).not.toMatch(/\bdefer\b/);
	expect(themeScript!.attrs).not.toMatch(/\basync\b/);

	// It must also run before any styling is linked or declared -- a
	// structurally inline script placed too late could still paint the
	// wrong theme first.
	const firstStyleIndex = head.search(/<link[^>]*rel=["']stylesheet["']|<style[\s>]/);
	expect(firstStyleIndex, 'expected a stylesheet or <style> in <head>').toBeGreaterThan(-1);
	expect(themeScript!.index).toBeLessThan(firstStyleIndex);
});
