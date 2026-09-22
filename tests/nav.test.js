import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav } from '../src/lib/nav.ts';

test('nav omits writing when there are no posts', () => {
	const items = buildNav(false);
	assert.deepEqual(items, [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/about', label: 'about' },
	]);
});

test('nav includes writing when posts exist', () => {
	const items = buildNav(true);
	assert.deepEqual(items, [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/blog', label: 'writing' },
		{ href: '/about', label: 'about' },
	]);
});
