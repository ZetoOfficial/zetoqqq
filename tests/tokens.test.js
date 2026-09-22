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
		else if (/\.(astro|css)$/.test(name)) out.push(full);
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
