import { expect, test } from '@playwright/test';

const PAGES = ['/', '/about', '/projects', '/blog'];

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

test('body text meets WCAG AA contrast in both themes', async ({ page }) => {
	const luminance = (rgb: number[]) => {
		const [r, g, b] = rgb.map((v) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const parse = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number);

	for (const scheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto('/about');
		const { fg, bg } = await page.evaluate(() => {
			const p = document.querySelector('main p')!;
			return {
				fg: getComputedStyle(p).color,
				bg: getComputedStyle(document.body).backgroundColor,
			};
		});
		const l1 = luminance(parse(fg));
		const l2 = luminance(parse(bg));
		const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		expect(ratio, `${scheme} body contrast`).toBeGreaterThanOrEqual(4.5);
	}
});
