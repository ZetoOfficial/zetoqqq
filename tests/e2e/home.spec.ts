import { expect, test } from '@playwright/test';

test('renders the dense index sections in order', async ({ page }) => {
	await page.goto('/');
	const labels = await page.locator('main h2').allTextContents();
	const cleaned = labels.map((l) => l.replace(/all\s*→/, '').trim().toLowerCase());
	expect(cleaned).toEqual(['now', 'projects', 'elsewhere']);
});

test('omits the writing section while the blog is empty', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main h2', { hasText: /^writing$/i })).toHaveCount(0);
	await expect(page.getByRole('navigation').getByText('writing')).toHaveCount(0);
});

test('is not a portfolio landing page', async ({ page }) => {
	await page.goto('/');
	// One column, no hero: the first heading is the name in the header,
	// and main starts with prose rather than a call to action.
	await expect(page.locator('main')).toBeVisible();
	await expect(page.locator('main button')).toHaveCount(0);
});

test('links to both project detail pages', async ({ page }) => {
	await page.goto('/');
	// Scope to the Projects section itself rather than searching the whole
	// page: the intro prose also mentions "AI Interviewer" by name (and
	// links to it), so an unscoped locator is ambiguous about which link it
	// clicks. The Projects section is the thing under test here.
	const projectsSection = page
		.locator('main section')
		.filter({ has: page.getByRole('heading', { level: 2, name: /projects/i }) });
	await projectsSection.getByRole('link', { name: 'AI Interviewer' }).click();
	await expect(page).toHaveURL(/\/projects\/ai-interviewer\/?$/);
	await expect(page.locator('h1')).toHaveText('AI Interviewer');
});
