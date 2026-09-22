import { type Page, expect, test } from '@playwright/test';

/**
 * Whether the blog collection has anything published, observed from the
 * running site rather than assumed.
 *
 * `/blog` renders one `Entry` (an `<article>`) per post, and a single
 * `Nothing published yet.` paragraph when there are none — so the article
 * count answers the question without reading the filesystem or hardcoding
 * today's emptiness. The homepage's `Writing` section and the nav's
 * `writing` item are driven by the same collection, and the spec promises
 * that committing the first post makes both appear "with no further
 * change" — which has to include no change to these tests.
 */
async function blogHasPosts(page: Page): Promise<boolean> {
	await page.goto('/blog');
	return (await page.locator('main article').count()) > 0;
}

test('renders the dense index sections in order', async ({ page }) => {
	const hasPosts = await blogHasPosts(page);

	await page.goto('/');
	const labels = (await page.locator('main h2').allTextContents()).map((l) =>
		l.trim().toLowerCase(),
	);

	// now → projects → elsewhere always, with `writing` between projects and
	// elsewhere exactly when the collection is non-empty.
	const expected = hasPosts
		? ['now', 'projects', 'writing', 'elsewhere']
		: ['now', 'projects', 'elsewhere'];
	expect(labels).toEqual(expected);
});

test('the writing section and nav item track whether the blog has posts', async ({ page }) => {
	const hasPosts = await blogHasPosts(page);
	const expectedCount = hasPosts ? 1 : 0;

	await page.goto('/');
	await expect(page.locator('main h2', { hasText: /^writing$/i })).toHaveCount(expectedCount);
	await expect(
		page.getByRole('navigation').getByRole('link', { name: 'writing' }),
	).toHaveCount(expectedCount);
});

test('is not a portfolio landing page', async ({ page }) => {
	await page.goto('/');
	// One column, no hero: the first heading is the name in the header,
	// and main starts with prose rather than a call to action.
	await expect(page.locator('main')).toBeVisible();
	await expect(page.locator('main button')).toHaveCount(0);
});

test('links to both project detail pages', async ({ page }) => {
	// Scope to the Projects section itself rather than searching the whole
	// page: the intro prose also mentions "AI Interviewer" by name (and
	// links to it), so an unscoped locator is ambiguous about which link it
	// clicks. The Projects section is the thing under test here.
	const projectsSection = (p: Page) =>
		p
			.locator('main section')
			.filter({ has: p.getByRole('heading', { level: 2, name: /projects/i }) });

	await page.goto('/');
	await projectsSection(page).getByRole('link', { name: 'AI Interviewer' }).click();
	await expect(page).toHaveURL(/\/projects\/ai-interviewer\/?$/);
	await expect(page.locator('h1')).toHaveText('AI Interviewer');

	await page.goto('/');
	await projectsSection(page).getByRole('link', { name: 'PartnerSC backend' }).click();
	await expect(page).toHaveURL(/\/projects\/partnersc-backend\/?$/);
	await expect(page.locator('h1')).toHaveText('PartnerSC backend');
});
