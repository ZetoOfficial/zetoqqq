import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The homepage's `Writing` section and the nav's `writing` item render only
// when the blog collection is non-empty. `tests/nav.test.js` covers
// `buildNav(true)`, but that is a pure function over a boolean — the branch
// that matters is `recentPosts.length > 0 &&` in src/pages/index.astro, and
// a unit test can never execute it. With an empty collection the happy path
// is unreachable from the running site, so the only way to run it is to put
// a post on disk and build.
//
// This writes a fixture post, builds into a throwaway --outDir (never
// `dist/`, which the Playwright webServer owns), asserts on the emitted
// index.html, and removes both in a `finally`. If it ever fails it must
// leave the working tree exactly as it found it — a stray .md in
// src/content/blog would flip the site's whole conditional for every later
// test run.

const ROOT = new URL('../', import.meta.url).pathname;
const ASTRO = join(ROOT, 'node_modules/.bin/astro');
const FIXTURE = join(ROOT, 'src/content/blog/writing-section-build-fixture.md');

const FIXTURE_BODY = `---
title: 'Writing section build fixture'
description: 'Temporary post written by tests/writing-section.test.js.'
pubDate: 2026-01-02
---

This post exists only for the duration of one test run.
`;

function cleanUp(outDir) {
	rmSync(FIXTURE, { force: true });
	if (outDir) rmSync(outDir, { recursive: true, force: true });
}

test(
	'a post in the blog collection makes the Writing section and nav item render',
	// A full `astro build` is slow, and slower still on a cold content-layer
	// cache; node:test's 30s default would flake long before the build is
	// genuinely stuck.
	{ timeout: 300_000 },
	() => {
		assert.ok(
			!existsSync(FIXTURE),
			`${FIXTURE} already exists — refusing to overwrite it. A previous run may have been killed; delete it and re-run.`,
		);

		let outDir = null;
		// `finally` covers a thrown assertion, but not a SIGINT/SIGTERM that
		// kills the process mid-build. This makes even that case clean up.
		const onExit = () => cleanUp(outDir);
		process.once('exit', onExit);

		try {
			outDir = mkdtempSync(join(tmpdir(), 'astro-writing-section-'));
			writeFileSync(FIXTURE, FIXTURE_BODY);

			// `--force` clears the content layer cache so the fixture is seen on
			// a warm cache, and leaves no cached trace of it for later builds.
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
				/<a[^>]*href="\/blog"[^>]*>\s*writing\s*<\/a>/,
				'expected a nav link to /blog labelled "writing" once a post exists',
			);
			assert.match(
				html,
				/Writing section build fixture/,
				'expected the fixture post itself to be listed in the Writing section',
			);
		} finally {
			process.removeListener('exit', onExit);
			cleanUp(outDir);
		}
	},
);
