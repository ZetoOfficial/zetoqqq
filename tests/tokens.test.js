import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findColourLiterals } from './lib/colour-scan.js';

const SRC = new URL('../src/', import.meta.url).pathname;
const TOKENS = join(SRC, 'styles/tokens.css');

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		// Deliberately wider than `.astro|.css`: a colour can be hardcoded in
		// a `.ts` data file, a `.js` endpoint, or — the case the invariant
		// exists for — a future blog post's inline `style="color:#fff"`. The
		// detector only reads CSS declaration values and inline `style`
		// attributes, so widening the walk costs no false positives.
		else if (/\.(astro|css|ts|js|mjs|md|mdx)$/.test(name)) out.push(full);
	}
	return out;
}

// Extracts the body of the first block whose selector matches `selector`,
// using brace-depth matching rather than a single-line regex — so it
// copes with the block being nested inside an @media wrapper. Returns
// null if the selector isn't found at all.
function extractBlock(css, selector) {
	const match = selector.exec(css);
	if (!match) return null;
	const open = css.indexOf('{', match.index);
	if (open === -1) return null;
	let depth = 1;
	let i = open + 1;
	while (i < css.length && depth > 0) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}') depth--;
		i++;
	}
	return css.slice(open + 1, i - 1);
}

// Parses a declaration list into a name -> value map, keeping only custom
// properties. Whitespace around either side is normalised so formatting
// differences between two blocks never register as a value difference.
function customProperties(body) {
	const map = {};
	for (const decl of body.split(';')) {
		const colon = decl.indexOf(':');
		if (colon === -1) continue;
		const name = decl.slice(0, colon).trim();
		if (!name.startsWith('--')) continue;
		map[name] = decl.slice(colon + 1).trim();
	}
	return map;
}

test('tokens.css defines every colour token in all three theme blocks', () => {
	const css = readFileSync(TOKENS, 'utf8');
	const names = [
		'--bg', '--bg-subtle', '--ink', '--ink-dim',
		'--rule', '--accent', '--accent-hover', '--selection',
	];

	// A flat `count >= 3` occurrence count would pass even if a token were
	// declared three times in the same block and never in the other two —
	// theming nothing while still satisfying the count. Instead, find each
	// of the three theme blocks explicitly and require every token inside
	// each one.
	const light = extractBlock(css, /:root\s*\{/);
	const prefersDark = extractBlock(css, /:root:not\(\[data-theme=['"]light['"]\]\)\s*\{/);
	const explicitDark = extractBlock(css, /:root\[data-theme=['"]dark['"]\]\s*\{/);

	assert.ok(light, 'could not find the light :root { } block');
	assert.ok(prefersDark, "could not find the :root:not([data-theme='light']) block");
	assert.ok(explicitDark, "could not find the :root[data-theme='dark'] block");

	for (const name of names) {
		assert.ok(light.includes(`${name}:`), `${name} missing from the light block`);
		assert.ok(
			prefersDark.includes(`${name}:`),
			`${name} missing from the prefers-color-scheme dark block`,
		);
		assert.ok(
			explicitDark.includes(`${name}:`),
			`${name} missing from the [data-theme="dark"] block`,
		);
	}
});

test('the two dark blocks declare identical values, not merely the same names', () => {
	// The test above only checks that each token *name* appears in each
	// block. The dark palette is written out twice — once for
	// prefers-color-scheme, once for the toggle's [data-theme="dark"] — and
	// nothing else in the suite compares the values. Tuning one and not the
	// other would make OS-dark and toggle-dark diverge silently.
	const css = readFileSync(TOKENS, 'utf8');
	const prefersDark = extractBlock(css, /:root:not\(\[data-theme=['"]light['"]\]\)\s*\{/);
	const explicitDark = extractBlock(css, /:root\[data-theme=['"]dark['"]\]\s*\{/);

	assert.ok(prefersDark, "could not find the :root:not([data-theme='light']) block");
	assert.ok(explicitDark, "could not find the :root[data-theme='dark'] block");

	assert.deepEqual(
		customProperties(explicitDark),
		customProperties(prefersDark),
		'the [data-theme="dark"] palette must match the prefers-color-scheme: dark palette exactly',
	);
});

test('no file outside tokens.css hardcodes a colour', () => {
	const offenders = [];
	for (const file of walk(SRC)) {
		if (file === TOKENS) continue;
		const text = readFileSync(file, 'utf8');
		for (const match of findColourLiterals(text)) {
			offenders.push(`${relative(SRC, file)}: ${match}`);
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`Colours must come from tokens.css:\n${offenders.join('\n')}`,
	);
});
