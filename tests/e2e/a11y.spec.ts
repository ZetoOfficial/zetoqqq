import { type Page, expect, test } from '@playwright/test';

const PAGES = [
	'/',
	'/about',
	'/projects',
	// The one route with an <hr>, external links and rendered Markdown — the
	// most likely to overflow at 375px, so it gets swept with the rest.
	'/projects/ai-interviewer',
	'/blog',
];

for (const path of PAGES) {
	test(`${path} has one h1, a main landmark and a skip link`, async ({ page }) => {
		await page.goto(path);
		await expect(page.locator('main#main')).toHaveCount(1);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('a.skip-link')).toHaveCount(1);
	});

	test(`${path} renders with no horizontal overflow at 375px`, async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		await page.goto(path);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(overflow).toBe(false);
	});
}

const luminance = (rgb: number[]) => {
	const [r, g, b] = rgb.map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const parse = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number);
const contrastRatio = (fg: string, bg: string) => {
	const l1 = luminance(parse(fg));
	const l2 = luminance(parse(bg));
	return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** Foreground of the first element matching `selector`, against the body background. */
async function inkAgainstBackground(page: Page, selector: string) {
	return page.evaluate((sel) => {
		const el = document.querySelector(sel)!;
		return {
			fg: getComputedStyle(el).color,
			bg: getComputedStyle(document.body).backgroundColor,
		};
	}, selector);
}

// Primary ink: an ordinary paragraph on /about. Dimmed ink (--ink-dim): the
// `.dim` class is what post dates, Entry's meta/tags lines and the /blog
// empty state render in, and it sits far closer to the AA floor than primary
// ink does.
//
// `main p.dim` on /blog is the empty state's `<p class="dim">Nothing
// published yet.</p>` only while the collection is empty. Once posts exist
// that paragraph is gone, but each Entry's meta line is `<p class="dim
// meta">`, so the selector keeps resolving to a `--ink-dim` paragraph and
// keeps measuring the same token — which is why this needs no branch on
// published-post state.
async function assertAaContrast(page: Page, label: string) {
	await page.goto('/about');
	const primary = await inkAgainstBackground(page, 'main p');
	expect(
		contrastRatio(primary.fg, primary.bg),
		`${label} primary-ink body contrast (main p, /about)`,
	).toBeGreaterThanOrEqual(4.5);

	await page.goto('/blog');
	const dimmed = await inkAgainstBackground(page, 'main p.dim');
	expect(
		contrastRatio(dimmed.fg, dimmed.bg),
		`${label} dimmed-ink (--ink-dim) contrast (main p.dim, /blog)`,
	).toBeGreaterThanOrEqual(4.5);
}

test('body text meets WCAG AA contrast in both OS colour schemes', async ({ page }) => {
	for (const scheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: scheme });
		await assertAaContrast(page, `OS ${scheme}`);
	}
});

test('body text meets WCAG AA contrast under an explicit [data-theme="dark"]', async ({ page }) => {
	// The dark palette is declared twice: once under
	// `@media (prefers-color-scheme: dark)` and once under
	// `:root[data-theme='dark']` for the toggle. `emulateMedia` only ever
	// exercises the first, so the toggle's palette would have no contrast
	// coverage at all without this. The OS preference is pinned to light
	// here so the media block cannot be what makes the assertion pass.
	await page.emulateMedia({ colorScheme: 'light' });
	await page.addInitScript(() => localStorage.setItem('theme', 'dark'));

	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await assertAaContrast(page, 'toggle [data-theme="dark"]');
});
