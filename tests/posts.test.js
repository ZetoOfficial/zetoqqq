import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortPosts } from '../src/lib/posts.ts';

const post = (id, pubDate) => ({ id, data: { pubDate: new Date(pubDate) } });

test('sorts newest first', () => {
	const sorted = sortPosts([
		post('old', '2024-01-01'),
		post('new', '2026-01-01'),
		post('mid', '2025-01-01'),
	]);
	assert.deepEqual(
		sorted.map((e) => e.id),
		['new', 'mid', 'old'],
	);
});

test('does not mutate its input', () => {
	const input = [post('a', '2024-01-01'), post('b', '2026-01-01')];
	sortPosts(input);
	assert.deepEqual(
		input.map((e) => e.id),
		['a', 'b'],
	);
});

test('handles the empty collection', () => {
	assert.deepEqual(sortPosts([]), []);
});
