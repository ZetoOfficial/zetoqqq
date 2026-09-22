import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav } from '../src/lib/nav.ts';

// The blog item is always present. Before anything is published it is a
// pending item — rendered as text with a "soon..." hint rather than a link —
// and the first post turns it into a real destination. An item that appears
// out of nowhere reads as a site that changed; one that lights up reads as a
// site that was waiting.

test('blog is present but pending when nothing is published', () => {
	assert.deepEqual(buildNav(false), [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/blog', label: 'blog', pending: true },
	]);
});

test('blog becomes a real destination once posts exist', () => {
	assert.deepEqual(buildNav(true), [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/blog', label: 'blog', pending: false },
	]);
});

test('about is not part of the navigation in either state', () => {
	for (const hasPosts of [false, true]) {
		const hrefs = buildNav(hasPosts).map((item) => item.href);
		assert.ok(
			!hrefs.includes('/about'),
			`buildNav(${hasPosts}) should not offer /about`,
		);
	}
});
