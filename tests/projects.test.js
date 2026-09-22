import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, sortProjects } from '../src/lib/projects.ts';

const entry = (id, date, draft) => ({ id, data: { date: new Date(date), draft } });

test('sorts newest first', () => {
	const sorted = sortProjects([
		entry('old', '2024-01-01'),
		entry('new', '2026-01-01'),
		entry('mid', '2025-01-01'),
	]);
	assert.deepEqual(
		sorted.map((e) => e.id),
		['new', 'mid', 'old'],
	);
});

test('drops drafts', () => {
	const sorted = sortProjects([
		entry('published', '2026-01-01'),
		entry('hidden', '2026-06-01', true),
	]);
	assert.deepEqual(
		sorted.map((e) => e.id),
		['published'],
	);
});

test('does not mutate its input', () => {
	const input = [entry('a', '2024-01-01'), entry('b', '2026-01-01')];
	sortProjects(input);
	assert.deepEqual(
		input.map((e) => e.id),
		['a', 'b'],
	);
});

test('isPublished pins draft/non-draft/absent-draft as false/true/true', () => {
	assert.equal(isPublished({ data: { draft: true } }), false);
	assert.equal(isPublished({ data: { draft: false } }), true);
	// A hand-built fixture with no `draft` key at all, unlike a real entry
	// where the Zod schema defaults it to `false`.
	assert.equal(isPublished({ data: {} }), true);
});
