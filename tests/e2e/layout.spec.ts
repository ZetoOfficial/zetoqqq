import { expect, test } from '@playwright/test';

/**
 * The header is rendered by one component on every page, but `Header.astro`
 * switches the name between <h1> (on /) and <p> (everywhere else) so that each
 * page has exactly one <h1>. That switch must be invisible: the two elements
 * inherit different line-heights from global.css, so without an explicit
 * line-height on `.name` the whole header shifts between pages.
 *
 * Likewise `main`'s first child differs by page — a <p> on the homepage, an
 * <h1> on /about and /projects — and those carry different top margins, so the
 * distance from the nav rule to the first line of content has to be owned by
 * the layout rather than left to whichever element happens to come first.
 */

const PAGES = ['/', '/about', '/projects', '/projects/ai-interviewer', '/blog'];

type Geometry = {
	nameHeight: number;
	navTop: number;
	gapBelowNav: number;
};

async function geometry(page: import('@playwright/test').Page): Promise<Geometry> {
	return page.evaluate(() => {
		const name = document.querySelector('.name')!;
		const nav = document.querySelector('header nav')!;
		const first = document.querySelector('main')!.firstElementChild!;
		return {
			nameHeight: name.getBoundingClientRect().height,
			navTop: nav.getBoundingClientRect().top,
			gapBelowNav: first.getBoundingClientRect().top - nav.getBoundingClientRect().bottom,
		};
	});
}

test('the header occupies identical space on every page', async ({ page }) => {
	const seen: Record<string, Geometry> = {};
	for (const path of PAGES) {
		await page.goto(path);
		seen[path] = await geometry(page);
	}

	const reference = seen['/'];
	for (const path of PAGES) {
		expect(seen[path].nameHeight, `${path}: name box height`).toBeCloseTo(
			reference.nameHeight,
			1,
		);
		expect(seen[path].navTop, `${path}: nav vertical position`).toBeCloseTo(
			reference.navTop,
			1,
		);
	}
});

test('content starts the same distance below the nav on every page', async ({ page }) => {
	const seen: Record<string, number> = {};
	for (const path of PAGES) {
		await page.goto(path);
		seen[path] = (await geometry(page)).gapBelowNav;
	}

	const reference = seen['/'];
	for (const path of PAGES) {
		expect(seen[path], `${path}: gap between nav rule and first content`).toBeCloseTo(
			reference,
			1,
		);
	}
});

test('the name renders as h1 only on the homepage, without changing its metrics', async ({
	page,
}) => {
	await page.goto('/');
	await expect(page.locator('h1.name')).toHaveCount(1);

	await page.goto('/projects');
	await expect(page.locator('h1.name')).toHaveCount(0);
	await expect(page.locator('p.name')).toHaveCount(1);

	// The single <h1> on a non-home page belongs to the page, not the header.
	await expect(page.locator('h1')).toHaveCount(1);
	await expect(page.locator('main h1')).toHaveCount(1);
});
