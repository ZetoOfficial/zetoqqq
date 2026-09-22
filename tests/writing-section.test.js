import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The homepage's `Writing` section renders, and the nav's `blog` item stops
// being pending, only when the blog collection is non-empty. `tests/nav.test.js` covers
// `buildNav(true)`, but that is a pure function over a boolean — the branch
// that matters is `recentPosts.length > 0 &&` in src/pages/index.astro, and
// a unit test can never execute it. With an empty collection the happy path
// is unreachable from the running site, so the only way to run it is to put
// a post on disk and build.
//
// The same build is also the only place the emitted feed's item order can be
// observed, so the two fixtures below are deliberately dated out of order
// relative to their filenames: the glob loader yields them oldest-first,
// and only `sortPosts` puts them right. That check rides along on this
// build rather than paying for a second one.
//
// This writes the fixtures, builds into a throwaway --outDir (never `dist/`,
// which the Playwright webServer owns), asserts on the emitted files, and
// removes everything in a `finally`. If it ever fails it must leave the
// working tree exactly as it found it — a stray .md in src/content/blog
// would flip the site's whole conditional for every later test run.

const ROOT = new URL('../', import.meta.url).pathname;
const ASTRO = join(ROOT, 'node_modules/.bin/astro');
const BLOG = join(ROOT, 'src/content/blog');

// Filename order is the reverse of date order on purpose: the glob loader
// walks these alphabetically, so an unsorted consumer emits `Older build
// fixture` first and gives itself away.
const FIXTURES = [
	{
		path: join(BLOG, 'writing-section-build-fixture-a-older.md'),
		title: 'Older build fixture',
		pubDate: '2025-01-02',
	},
	{
		path: join(BLOG, 'writing-section-build-fixture-b-newer.md'),
		title: 'Newer build fixture',
		pubDate: '2026-01-02',
	},
];

const body = ({ title, pubDate }) => `---
title: '${title}'
description: 'Temporary post written by tests/writing-section.test.js.'
pubDate: ${pubDate}
---

This post exists only for the duration of one test run.
`;

function cleanUp(outDir) {
	for (const fixture of FIXTURES) rmSync(fixture.path, { force: true });
	if (outDir) rmSync(outDir, { recursive: true, force: true });
}

test(
	'a post in the blog collection makes the Writing section render and the nav item active',
	// A full `astro build` is slow, and slower still on a cold content-layer
	// cache; node:test's 30s default would flake long before the build is
	// genuinely stuck.
	{ timeout: 300_000 },
	() => {
		for (const fixture of FIXTURES) {
			assert.ok(
				!existsSync(fixture.path),
				`${fixture.path} already exists — refusing to overwrite it. A previous run may have been killed; delete it and re-run.`,
			);
		}

		let outDir = null;
		// `finally` covers a thrown assertion, but not a SIGINT/SIGTERM that
		// kills the process mid-build. This makes even that case clean up.
		const onExit = () => cleanUp(outDir);
		process.once('exit', onExit);

		try {
			outDir = mkdtempSync(join(tmpdir(), 'astro-writing-section-'));
			for (const fixture of FIXTURES) writeFileSync(fixture.path, body(fixture));

			// `--force` clears the content layer cache so the fixtures are seen on
			// a warm cache, and leaves no cached trace of them for later builds.
			execFileSync(ASTRO, ['build', '--force', '--outDir', outDir], {
				cwd: ROOT,
				stdio: 'pipe',
				encoding: 'utf8',
			});

			const html = readFileSync(join(outDir, 'index.html'), 'utf8');

			assert.match(
				html,
				/<h2[^>]*>\s*Writing\s*<\/h2>/,
				'expected a Writing <h2> on the homepage once a post exists',
			);
			assert.match(
				html,
				/<a[^>]*href="\/blog"[^>]*>\s*blog\s*<\/a>/,
				'expected the nav blog item to become a real link once a post exists',
			);
			for (const fixture of FIXTURES) {
				assert.ok(
					html.includes(fixture.title),
					`expected "${fixture.title}" to be listed in the homepage Writing section`,
				);
			}
			assert.ok(
				html.indexOf('Newer build fixture') < html.indexOf('Older build fixture'),
				'expected the homepage Writing section to list posts newest first',
			);

			// The feed is a third consumer of the same collection, and the only
			// one whose ordering is invisible from the rendered site.
			const feed = readFileSync(join(outDir, 'rss.xml'), 'utf8');
			for (const fixture of FIXTURES) {
				assert.ok(
					feed.includes(fixture.title),
					`expected "${fixture.title}" in rss.xml`,
				);
			}
			assert.ok(
				feed.indexOf('Newer build fixture') < feed.indexOf('Older build fixture'),
				'expected rss.xml to emit items newest first — the feed must sort the collection, not take the glob loader\'s order',
			);
		} finally {
			process.removeListener('exit', onExit);
			cleanUp(outDir);
		}
	},
);
